/// <reference path="../shared/typings/glicko2.d.ts"/>

import { Namespace } from 'socket.io';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import keys from 'lodash/keys';
import last from 'lodash/last';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import values from 'lodash/values';
import { Glicko2, Player as GlickoPlayer } from 'glicko2';

import {
  COLOR_NAMES,
  DEFAULT_RATING,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
} from 'shared/constants';

import {
  BaseMove,
  Challenge,
  ChatMessage,
  ColorEnum,
  Dictionary,
  EachColor,
  Game as IGame,
  GameCreateOptions,
  GameStatusEnum,
  GameVariantEnum,
  GlickoRating,
  Move,
  PieceLocationEnum,
  Player,
  ResultReasonEnum,
  TimeControlEnum,
  User,
} from 'shared/types';

import { Game as GameHelper } from 'shared/helpers';
import { deleteNamespace } from 'server/helpers';

import { sessionMiddleware } from 'server/controllers/session';

import { Game as DBGame, User as DBUser } from 'server/db/models';

import ioServer from 'server/io';

const VARIANTS = values(GameVariantEnum);

export default class Game extends GameHelper {
  static games: Partial<Dictionary<Game>> = {};

  static async createGameFromChallenge(challenge: Challenge, toUserId: number): Promise<Game | undefined> {
    const [challenger, accepting] = await Promise.all([
      DBUser.findByPk(challenge.challenger.id),
      DBUser.findByPk(toUserId),
    ]);

    if (!challenger || !accepting) {
      return;
    }

    const variantType = Game.getVariantType(challenge.variants);
    const speedType = Game.getSpeedType(challenge.timeControl);
    const challengerColor: ColorEnum.WHITE | ColorEnum.BLACK = challenge.challenger.color || (
      Math.random() > 0.5
        ? ColorEnum.WHITE
        : ColorEnum.BLACK
    );
    const acceptingColor = Game.getOppositeColor(challengerColor);
    const challengingPlayer: Player = {
      id: challenger.id,
      name: challenger.login,
      color: challengerColor,
      rating: (challenger.ratings[variantType]?.[speedType] || DEFAULT_RATING).r,
      newRating: null,
      time: challenge.timeControl && challenge.timeControl.base,
    };
    const acceptingPlayer: Player = {
      id: accepting.id,
      name: accepting.login,
      color: acceptingColor,
      rating: (accepting.ratings[variantType]?.[speedType] || DEFAULT_RATING).r,
      newRating: null,
      time: challenge.timeControl && challenge.timeControl.base,
    };
    let game: Game;

    while (true) {
      try {
        game = new Game({
          ...pick(challenge, ['startingFen', 'rated', 'timeControl']),
          variants: [...challenge.variants].sort(),
          id: Game.generateUid({}),
          status: GameStatusEnum.ONGOING,
          pgnTags: {},
          startingData: null,
          isLive: true,
        });

        game.players[challengerColor] = challengingPlayer;
        game.players[acceptingColor] = acceptingPlayer;

        if (game.is960 && !game.startingFen) {
          game.startingFen = game.getFen();
        }

        await game.toDBInstance().save();

        break;
      } catch {}
    }

    Game.games[game.id] = game;

    return game;
  }

  static fromDBInstance(dbInstance: DBGame, isLive: boolean): Game {
    const game = new Game({
      ...pick(dbInstance, ['id', 'variants', 'rated', 'timeControl', 'status', 'pgnTags']),
      startingData: dbInstance.fen ? Game.getStartingDataFromFen(dbInstance.fen, dbInstance.variants) : null,
      startingFen: dbInstance.fen,
      isLive,
    });

    if (!dbInstance.playerNames) {
      throw new Error('Player names not fetched');
    }

    game.result = dbInstance.result;
    game.chat = dbInstance.chat;
    game.takebackRequest = dbInstance.takebackRequest;
    game.drawOffer = dbInstance.drawOffer;
    game.lastMoveTimestamp = +dbInstance.lastMoveTimestamp;
    game.players = {
      [ColorEnum.WHITE]: {
        ...pick(dbInstance.whitePlayer, ['id', 'color', 'rating', 'newRating', 'time']),
        name: dbInstance.playerNames[ColorEnum.WHITE],
      },
      [ColorEnum.BLACK]: {
        ...pick(dbInstance.blackPlayer, ['id', 'color', 'rating', 'newRating', 'time']),
        name: dbInstance.playerNames[ColorEnum.BLACK],
      },
    };

    for (const { uci, t } of dbInstance.moves) {
      game.registerAnyMove({
        ...Game.uciToMove(uci),
        duration: t,
      }, false);
    }

    return game;
  }

  static getNewGlickoRating(player: GlickoPlayer): GlickoRating {
    return {
      r: +player.getRating().toFixed(2),
      rd: Math.min(350, Math.max(60, +player.getRd().toFixed(2))),
      vol: Math.min(0.1, +player.getVol().toFixed(9)),
    };
  }

  static validateSettings(settings: any): boolean {
    if (!settings) {
      return false;
    }

    return (
      typeof settings.rated === 'boolean'
      && (
        settings.color === ColorEnum.WHITE
        || settings.color === ColorEnum.BLACK
        || settings.color == null
      )
      && this.validateTimeControl(settings.timeControl)
      && this.validateVariants(settings.variants)
      && this.validateStartingFen(settings.startingFen, settings.variants)
      && (
        settings.timeControl?.type === TimeControlEnum.TIMER
        || !settings.variants.includes(GameVariantEnum.COMPENSATION_CHESS)
      )
      && (settings.timeControl !== null || !settings.rated)
    );
  }

  static validateStartingFen(fen: any, variants: GameVariantEnum[]): boolean {
    if (typeof fen !== 'string') {
      return fen === null;
    }

    try {
      this.validateStartingData(this.getStartingDataFromFen(fen, variants), variants);

      return true;
    } catch (err) {
      return false;
    }
  }

  static validateTimeControl(timeControl: any): boolean {
    if (!timeControl) {
      return timeControl === null;
    }

    if (timeControl.type === TimeControlEnum.TIMER) {
      return (
        POSSIBLE_TIMER_BASES_IN_MILLISECONDS.includes(timeControl.base)
        && POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS.includes(timeControl.increment)
        && isEqual(keys(timeControl).sort(), ['base', 'increment', 'type'])
      );
    }

    if (timeControl.type === TimeControlEnum.CORRESPONDENCE) {
      return (
        POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS.includes(timeControl.base)
        && isEqual(keys(timeControl).sort(), ['base', 'type'])
      );
    }

    return false;
  }

  static validateVariants(variants: any): boolean {
    if (!Array.isArray(variants)) {
      return false;
    }

    if (
      variants.some((variant) => (
        !VARIANTS.includes(variant)
        || variants.indexOf(variant) !== variants.lastIndexOf(variant)
      ))
    ) {
      return false;
    }

    return super.validateVariants(variants);
  }

  isTimer: boolean;
  timerTimeout?: number;
  pingTimeout?: number;
  io: Namespace | null;
  lastMoveTimestamp: number = Date.now();
  pingTimestamps = new Set<number>();
  playerPingTimes: EachColor<number[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: [],
  };

  constructor(options: GameCreateOptions) {
    super(options);

    const io = this.io = options.isLive ? ioServer.of(`/game/${options.id}`) : null;

    this.isTimer = !!this.timeControl && this.timeControl.type === TimeControlEnum.TIMER;

    if (this.isTimer) {
      this.pingTimeout = setInterval(this.pingPlayers, 1000) as any;
    }

    io?.use(async (socket, next) => {
      try {
        await sessionMiddleware(socket.request, socket.request.res);

        const user: User | null = socket.request.session
          ? socket.request.session.user || null
          : null;

        const isOngoingDarkChessGame = this.isDarkChess && this.isOngoing();
        const player = (user && find(this.players, { id: user.id })) || null;

        if (player) {
          const {
            color: playerColor,
          } = player;

          socket.on('disconnect', () => {
            if (this.isFinished() && this.io) {
              if (this.rematchAllowed) {
                let whitePresent = false;
                let blackPresent = false;

                forEach(this.io.sockets, (socket) => {
                  const socketPlayer = socket.player;

                  if (socketPlayer?.id === this.players[ColorEnum.WHITE].id) {
                    whitePresent = true;
                  } else if (socketPlayer?.id === this.players[ColorEnum.BLACK].id) {
                    blackPresent = true;
                  }
                });

                if (!whitePresent || !blackPresent) {
                  this.rematchAllowed = false;
                  this.rematchOffer = null;

                  this.io.emit('rematchNotAllowed');
                }
              }

              if (isEmpty(this.io.sockets)) {
                this.remove();
                this.saveToDB();
              }
            }
          });

          socket.on('gamePong', (timestamp) => {
            if (
              !this.isTimer
              || typeof timestamp !== 'number'
              || socket.pingResponded.has(timestamp)
            ) {
              return;
            }

            const now = Date.now();

            if (now - timestamp >= 15 * 1000) {
              return;
            }

            for (const timestamp of socket.pingResponded) {
              if (now - timestamp >= 15 * 1000) {
                socket.pingResponded.delete(timestamp);
              }
            }

            socket.pingResponded.add(timestamp);

            const pingTimes = this.playerPingTimes[playerColor];

            pingTimes.push(now - timestamp);

            if (pingTimes.length > 10) {
              pingTimes.shift();
            }
          });

          socket.on('resign', () => {
            if (this.isOngoing()) {
              this.end(Game.getOppositeColor(playerColor), ResultReasonEnum.RESIGN);
            }
          });

          socket.on('offerDraw', () => {
            if (!this.isOngoing()) {
              return;
            }

            if (this.drawOffer) {
              if (this.drawOffer !== playerColor) {
                this.drawOffer = null;

                this.end(null, ResultReasonEnum.AGREED_TO_DRAW);
              }
            } else {
              this.drawOffer = playerColor;

              this.addChatMessage({
                login: null,
                message: `${COLOR_NAMES[playerColor]} offered a draw`,
              });
              io.emit('drawOffered', this.drawOffer);
            }
          });

          socket.on('acceptDraw', () => {
            if (!this.isOngoing() || this.drawOffer !== Game.getOppositeColor(playerColor)) {
              return;
            }

            this.drawOffer = null;

            this.end(null, ResultReasonEnum.AGREED_TO_DRAW);
          });

          socket.on('declineDraw', () => {
            this.declineDraw(playerColor);
          });

          socket.on('cancelDraw', () => {
            this.cancelDraw(playerColor);
          });

          socket.on('requestTakeback', () => {
            if (!this.isOngoing() || this.takebackRequest) {
              return;
            }

            const moveIndex = this.getTakebackRequestMoveIndex(playerColor);

            if (moveIndex === null) {
              return;
            }

            this.takebackRequest = {
              player: playerColor,
              moveIndex,
            };

            this.addChatMessage({
              login: null,
              message: `${COLOR_NAMES[playerColor]} requested a takeback`,
            });
            io.emit('takebackRequested', this.takebackRequest);
          });

          socket.on('acceptTakeback', () => {
            if (!this.isOngoing() || this.takebackRequest?.player !== Game.getOppositeColor(playerColor)) {
              return;
            }

            this.clearTimerTimeout();

            while (this.takebackRequest.moveIndex < this.moves.length - 1) {
              this.unregisterLastMove();
            }

            this.takebackRequest = null;
            this.lastMoveTimestamp = Date.now();

            this.setTimerTimeout();

            this.addChatMessage({
              login: null,
              message: 'Takeback request accepted',
            });
            io.emit('takebackAccepted', this.lastMoveTimestamp);
          });

          socket.on('declineTakeback', () => {
            this.declineTakeback(playerColor);
          });

          socket.on('cancelTakeback', () => {
            this.cancelTakeback(playerColor);
          });

          socket.on('offerRematch', () => {
            if (!this.isFinished() || !this.rematchAllowed) {
              return;
            }

            if (this.rematchOffer) {
              if (this.rematchOffer !== playerColor) {
                this.rematchOffer = null;

                this.setupRematch();
              }
            } else {
              this.rematchOffer = playerColor;

              this.addChatMessage({
                login: null,
                message: `${COLOR_NAMES[playerColor]} offered a rematch`,
              });
              io.emit('rematchOffered', this.rematchOffer);
            }
          });

          socket.on('acceptRematch', () => {
            if (this.rematchOffer === Game.getOppositeColor(playerColor)) {
              this.setupRematch();
            }
          });

          socket.on('declineRematch', () => {
            if (this.rematchOffer !== Game.getOppositeColor(playerColor)) {
              return;
            }

            this.rematchOffer = null;

            this.addChatMessage({
              login: null,
              message: 'Rematch offer declined',
            });
            this.io?.emit('rematchDeclined');
          });

          socket.on('cancelRematch', () => {
            if (this.rematchOffer !== playerColor) {
              return;
            }

            this.rematchOffer = null;

            this.addChatMessage({
              login: null,
              message: 'Rematch offer canceled',
            });
            this.io?.emit('rematchCanceled');
          });

          socket.on('makeMove', (move) => {
            if (this.turn === playerColor && this.isOngoing()) {
              this.move(player, move);
            }
          });
        } else if (isOngoingDarkChessGame) {
          throw new Error('Dark chess game cannot be observed');
        }

        socket.player = player;
        socket.pingResponded = new Set();

        const timestamp = Date.now();

        if (isOngoingDarkChessGame) {
          socket.emit('initialDarkChessGameData', {
            timestamp,
            player,
            game: {
              ...this.toJSON(),
              moves: this.colorMoves[player!.color],
            },
          });
        } else {
          socket.emit('initialGameData', {
            timestamp,
            player,
            game: this,
          });
        }

        if (user) {
          socket.on('addChatMessage', (message) => {
            if (typeof message === 'string') {
              message = message.trim();

              if (message && message.length < 256) {
                this.addChatMessage({
                  login: user.login,
                  message,
                });
              }
            }
          });
        }
      } catch (err) {
        return next(err);
      }

      next();
    });
  }

  addChatMessage(chatMessage: ChatMessage) {
    this.chat.push(chatMessage);

    this.io?.emit('newChatMessage', chatMessage);
  }

  cancelDraw(byColor: ColorEnum) {
    if (!this.isOngoing() || this.drawOffer !== byColor) {
      return;
    }

    this.drawOffer = null;

    this.addChatMessage({
      login: null,
      message: 'Draw offer canceled',
    });
    this.io?.emit('drawCanceled');
  }

  cancelTakeback(byColor: ColorEnum) {
    if (!this.isOngoing() || this.takebackRequest?.player !== byColor) {
      return;
    }

    this.takebackRequest = null;

    this.addChatMessage({
      login: null,
      message: 'Takeback request canceled',
    });
    this.io?.emit('takebackCanceled');
  }

  clearPingTimeout() {
    clearTimeout(this.pingTimeout);
  }

  clearTimerTimeout() {
    clearTimeout(this.timerTimeout);
  }

  declineDraw(byColor: ColorEnum) {
    if (!this.isOngoing() || this.drawOffer !== Game.getOppositeColor(byColor)) {
      return;
    }

    this.drawOffer = null;

    this.addChatMessage({
      login: null,
      message: 'Draw offer declined',
    });
    this.io?.emit('drawDeclined');
  }

  declineTakeback(byColor: ColorEnum) {
    if (!this.isOngoing() || this.takebackRequest?.player !== Game.getOppositeColor(byColor)) {
      return;
    }

    this.takebackRequest = null;

    this.addChatMessage({
      login: null,
      message: 'Takeback request declined',
    });
    this.io?.emit('takebackDeclined');
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    super.end(winner, reason);

    const player = this.players[this.turn];

    if (reason !== ResultReasonEnum.SELF_TIMEOUT) {
      if (reason === ResultReasonEnum.TIMEOUT || reason === ResultReasonEnum.INSUFFICIENT_MATERIAL_AND_TIMEOUT) {
        player.time = 0;
      } else if (this.timeControl && this.timerTimeout) {
        player.time! -= Date.now() - this.lastMoveTimestamp;
      }
    }

    if (this.isLive) {
      (async () => {
        if (this.rated) {
          const variantType = this.getVariantType();
          const speedType = this.getSpeedType();
          const [whitePlayer, blackPlayer] = await Promise.all([
            DBUser.findByPk(this.players[ColorEnum.WHITE].id),
            DBUser.findByPk(this.players[ColorEnum.BLACK].id),
          ]);

          if (whitePlayer && blackPlayer && this.result) {
            const glicko = new Glicko2({ tau: 0.75 });
            const whiteRating = whitePlayer.ratings[variantType]?.[speedType] || DEFAULT_RATING;
            const blackRating = blackPlayer.ratings[variantType]?.[speedType] || DEFAULT_RATING;

            const whiteGlickoPlayer = glicko.makePlayer(
              whiteRating.r, whiteRating.rd, whiteRating.vol,
            );
            const blackGlickoPlayer = glicko.makePlayer(
              blackRating.r, blackRating.rd, blackRating.vol,
            );

            glicko.updateRatings([
              [
                whiteGlickoPlayer,
                blackGlickoPlayer,
                this.result.winner === ColorEnum.WHITE
                  ? 1
                  : this.result.winner === ColorEnum.BLACK
                    ? 0
                    : 0.5,
              ],
            ]);

            const whiteNewRating = Game.getNewGlickoRating(whiteGlickoPlayer);
            const blackNewRating = Game.getNewGlickoRating(blackGlickoPlayer);

            this.players[ColorEnum.WHITE].newRating = whiteNewRating.r;
            this.players[ColorEnum.BLACK].newRating = blackNewRating.r;

            whitePlayer.ratings = {
              ...whitePlayer.ratings,
              [variantType]: {
                ...whitePlayer.ratings[variantType],
                [speedType]: whiteNewRating,
              },
            };
            blackPlayer.ratings = {
              ...blackPlayer.ratings,
              [variantType]: {
                ...blackPlayer.ratings[variantType],
                [speedType]: blackNewRating,
              },
            };

            Promise.all([
              whitePlayer.save(),
              blackPlayer.save(),
            ]);
          }
        }

        this.io?.emit('gameOver', {
          result: this.result!,
          players: this.players,
        });

        if (this.isDarkChess) {
          this.io?.emit('darkChessMoves', this.moves);
        }

        await this.saveToDB();
      })();
    }

    this.clearPingTimeout();
    this.clearTimerTimeout();
  }

  move(player: Player, moveForServer: BaseMove) {
    if (!this.validateMove(moveForServer)) {
      return;
    }

    const {
      from: fromLocation,
      to: toLocation,
      promotion,
    } = moveForServer;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)!
      : this.getPocketPiece(fromLocation.pieceType, this.turn)!;

    // no piece or wrong color
    if (!piece || piece.color !== player.color) {
      return;
    }

    if (!this.isMoveAllowed(piece, toLocation, promotion)) {
      return;
    }

    const newTimestamp = Date.now();
    const serverMoveDuration = newTimestamp - this.lastMoveTimestamp;
    const pingTimes = this.playerPingTimes[player.color];
    const averagePing = Math.round(this.playerPingTimes[player.color].reduce(
      (sum, ping) => sum + ping,
      0,
    ) / pingTimes.length) || 0;
    const move: Move = {
      from: fromLocation,
      to: toLocation,
      duration: Math.max(serverMoveDuration / 2, serverMoveDuration - averagePing / 2),
    };

    if (promotion) {
      move.promotion = promotion;
    }

    this.registerAnyMove(move, false);
    this.changePlayerTime();

    this.lastMoveTimestamp = newTimestamp;

    if (this.isDarkChess) {
      forEach(this.io?.sockets || {}, (socket) => {
        const socketPlayer = socket.player;

        if (socketPlayer) {
          socket.emit('moveMade', {
            move: last(this.colorMoves[socketPlayer.color])!,
            moveIndex: this.moves.length - 1,
            lastMoveTimestamp: this.lastMoveTimestamp,
          });
        }
      });
    } else {
      this.io?.emit('moveMade', {
        move,
        moveIndex: this.moves.length - 1,
        lastMoveTimestamp: this.lastMoveTimestamp,
      });
    }

    if (player.time === 0) {
      this.end(this.turn, ResultReasonEnum.SELF_TIMEOUT);

      return;
    }

    if (this.isOngoing() && this.timeControl?.type === TimeControlEnum.CORRESPONDENCE) {
      this.saveToDB();
    }

    this.setTimerTimeout();

    if (this.isOngoing()) {
      this.cancelDraw(player.color);
      this.declineDraw(player.color);
      this.cancelTakeback(player.color);
      this.declineTakeback(player.color);
    }
  }

  pingPlayers = () => {
    const now = Date.now();

    for (const timestamp of this.pingTimestamps) {
      if (now - timestamp >= 15 * 1000) {
        this.pingTimestamps.delete(timestamp);
      }
    }

    this.pingTimestamps.add(now);

    this.io?.emit('gamePing', now);
  };

  remove() {
    delete Game.games[this.id];

    if (this.io) {
      deleteNamespace(this.io);
    }
  }

  async saveToDB() {
    const dbGame = this.toDBInstance();

    await DBGame.update(omit(dbGame.toJSON(), 'id'), {
      where: {
        id: dbGame.id,
      },
    });
  }

  setTimerTimeout() {
    if (
      this.isOngoing()
      && this.moves.length >= 2
      && this.timeControl
    ) {
      const player = this.players[this.turn];

      this.clearTimerTimeout();

      this.timerTimeout = setTimeout(() => {
        const opponentColor = this.getOpponentColor();
        const hasSufficientMaterial = this.hasSufficientMaterialForWin(opponentColor);

        this.end(
          hasSufficientMaterial
            ? opponentColor
            : null,
          hasSufficientMaterial
            ? ResultReasonEnum.TIMEOUT
            : ResultReasonEnum.INSUFFICIENT_MATERIAL_AND_TIMEOUT,
        );
      }, player.time!) as any;
    }
  }

  async setupRematch() {
    this.rematchOffer = null;
    this.rematchAllowed = false;

    const challenger = this.players[ColorEnum.WHITE];
    const game = await Game.createGameFromChallenge({
      // only id and color matter
      challenger: {
        id: +challenger.id || 0,
        login: challenger.name,
        rating: 0,
        color: ColorEnum.BLACK,
      },
      id: '',
      rated: this.rated,
      startingFen: this.startingFen,
      timeControl: this.timeControl,
      variants: this.variants,
    }, +this.players[ColorEnum.BLACK].id || 0);

    if (game) {
      this.io?.emit('rematchAccepted', game.id);
    }
  }

  toDBInstance(): DBGame {
    const whitePlayer = this.players[ColorEnum.WHITE];
    const blackPlayer = this.players[ColorEnum.BLACK];

    if (typeof whitePlayer.id === 'string' || typeof blackPlayer.id === 'string') {
      throw new Error('Wrong player id');
    }

    return new DBGame({
      ...pick(this, [
        'id', 'status', 'result', 'timeControl', 'rated',
        'chat', 'drawOffer', 'takebackRequest', 'pgnTags',
      ]),
      variants: [...this.variants],
      fen: this.startingFen,
      whitePlayer: {
        ...pick(whitePlayer, ['color', 'rating', 'newRating', 'time']),
        id: whitePlayer.id,
      },
      blackPlayer: {
        ...pick(blackPlayer, ['color', 'rating', 'newRating', 'time']),
        id: blackPlayer.id,
      },
      lastMoveTimestamp: new Date(this.lastMoveTimestamp),
      moves: this.moves.map((move) => ({
        uci: Game.moveToUci(move),
        t: move.duration,
      })),
    });
  }

  toJSON(): IGame {
    return {
      ...pick(this, [
        'id', 'startingFen', 'variants', 'status', 'players', 'result',
        'rated', 'timeControl', 'pgnTags', 'drawOffer', 'rematchOffer', 'rematchAllowed',
        'takebackRequest', 'lastMoveTimestamp', 'moves', 'chat', 'isLive',
      ]),
      startingData: null,
    };
  }

  unregisterLastMove() {
    const move = last(this.moves)!;
    const needToUpdateTime = this.needToChangeTime();

    move.revertMove();

    this.moves.pop();

    const player = this.players[this.turn];

    if (this.timeControl && needToUpdateTime) {
      player.time = move.timeBeforeMove[player.color];
    }

    if (this.isDarkChess) {
      forEach(ColorEnum, (color) => {
        const move = last(this.colorMoves[color]);

        if (move) {
          move.revertMove();

          this.colorMoves[color].pop();
        }
      });
    }
  }

  validateMove(move: any): boolean {
    return !!(
      move
      && move.from
      && move.to
      && typeof move.to.board === 'number'
      && typeof move.to.y === 'number'
      && typeof move.to.x === 'number'
      && ((
        move.from.type === PieceLocationEnum.POCKET
        && this.isPocketUsed
      ) || (
        move.from.type === PieceLocationEnum.BOARD
        && typeof move.from.board === 'number'
        && typeof move.from.y === 'number'
        && typeof move.from.x === 'number'
        && !this.isNullSquare(move.from)
      ))
    );
  }
}
