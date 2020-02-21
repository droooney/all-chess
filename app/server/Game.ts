import * as _ from 'lodash';
import { Namespace } from 'socket.io';

import {
  BaseMove,
  ChatMessage,
  ColorEnum,
  Game as IGame,
  GameCreateOptions,
  GameStatusEnum,
  GameVariantEnum,
  Move,
  PieceLocationEnum,
  Player,
  ResultReasonEnum,
  TimeControlEnum
} from '../types';
import { sessionMiddleware } from './controllers/session';
import { Game as GameHelper } from '../shared/helpers';
import {
  COLOR_NAMES,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS
} from '../shared/constants';

const VARIANTS = _.values(GameVariantEnum);

export default class Game extends GameHelper {
  static validateSettings(settings: any): boolean {
    if (!settings) {
      return false;
    }

    return (
      this.validateTimeControl(settings.timeControl)
      && this.validateVariants(settings.variants)
    );
  }

  static validateTimeControl(timeControl: any): boolean {
    if (!timeControl) {
      return timeControl === null;
    }

    if (timeControl.type === TimeControlEnum.TIMER) {
      return (
        POSSIBLE_TIMER_BASES_IN_MILLISECONDS.includes(timeControl.base)
        && POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS.includes(timeControl.increment)
        && _.isEqual(_.keys(timeControl).sort(), ['base', 'increment', 'type'])
      );
    }

    if (timeControl.type === TimeControlEnum.CORRESPONDENCE) {
      return (
        POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS.includes(timeControl.base)
        && _.isEqual(_.keys(timeControl).sort(), ['base', 'type'])
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
  io: Namespace;
  lastMoveTimestamp: number = Date.now();
  pingTimestamps = new Set<number>();
  playerPingTimes: Record<ColorEnum, number[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: []
  };

  constructor(io: Namespace, options: GameCreateOptions) {
    super(options);

    this.io = io;
    this.isTimer = !!this.timeControl && this.timeControl.type === TimeControlEnum.TIMER;

    if (this.isTimer) {
      setInterval(this.pingPlayers, 1000);
    }

    io.use(async (socket, next) => {
      try {
        await sessionMiddleware(socket.request, socket.request.res);

        const user = socket.request.session
          ? socket.request.session.user || null
          : null;

        const existingPlayer = (user && _.find(this.players, (player) => player && player.login === user.login)) || null;
        const isNewPlayer = (
          !existingPlayer
          && user
          && this.status === GameStatusEnum.BEFORE_START
          && _.some(this.players, (player) => !player)
        );
        const isOngoingDarkChessGame = this.isDarkChess && this.status !== GameStatusEnum.FINISHED;
        let player: Player | null = null;

        if (isNewPlayer) {
          const otherPlayer = _.find(this.players, Boolean);
          const color = otherPlayer
            ? Game.getOppositeColor(otherPlayer.color)
            : Math.random() > 0.5
              ? ColorEnum.WHITE
              : ColorEnum.BLACK;

          player = {
            ...user,
            color,
            time: this.timeControl && this.timeControl.base
          };

          this.players[player!.color] = player!;

          if (otherPlayer) {
            this.status = GameStatusEnum.ONGOING;

            socket.broadcast.emit('startGame', this.players);
          }
        } else {
          player = existingPlayer;
        }

        if (player) {
          const {
            color: playerColor
          } = player!;

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
                message: `${COLOR_NAMES[playerColor]} offered a draw`
              });
              this.io.emit('drawOffered', this.drawOffer);
            }
          });

          socket.on('acceptDraw', () => {
            if (
              !this.isOngoing()
              || !this.drawOffer
              || this.drawOffer === playerColor
            ) {
              return;
            }

            this.drawOffer = null;

            this.end(null, ResultReasonEnum.AGREED_TO_DRAW);
          });

          socket.on('declineDraw', () => {
            if (
              !this.isOngoing()
              || !this.drawOffer
              || this.drawOffer === playerColor
            ) {
              return;
            }

            this.drawOffer = null;

            this.addChatMessage({
              login: null,
              message: 'Draw offer declined'
            });
            this.io.emit('drawDeclined');
          });

          socket.on('cancelDraw', () => {
            if (!this.isOngoing() || this.drawOffer !== playerColor) {
              return;
            }

            this.drawOffer = null;

            this.addChatMessage({
              login: null,
              message: 'Draw offer canceled'
            });
            this.io.emit('drawCanceled');
          });

          socket.on('requestTakeback', (moveIndex) => {
            if (
              !this.isOngoing()
              || this.takebackRequest
              || !this.validateTakebackRequest(moveIndex)
            ) {
              return;
            }

            this.takebackRequest = {
              player: playerColor,
              moveIndex
            };

            const move = this.moves[moveIndex];
            const moveString = moveIndex === this.moves.length - 2
              ? ''
              : this.isDarkChess
                ? ' up to ?'
                : move
                  ? ` up to move ${move.figurine}`
                  : ' up to the start of the game';

            this.addChatMessage({
              login: null,
              message: `${COLOR_NAMES[playerColor]} requested a takeback${moveString}`
            });
            this.io.emit('takebackRequested', this.takebackRequest);
          });

          socket.on('acceptTakeback', () => {
            if (
              !this.isOngoing()
              || !this.takebackRequest
              || this.takebackRequest.player === playerColor
            ) {
              return;
            }

            this.clearTimerTimeout();

            while (this.takebackRequest.moveIndex < this.moves.length - 1) {
              this.unregisterLastMove();
            }

            this.takebackRequest = null;
            this.lastMoveTimestamp = Date.now();

            this.setTimeout();

            this.addChatMessage({
              login: null,
              message: 'Takeback request accepted'
            });
            this.io.emit('takebackAccepted', this.lastMoveTimestamp);
            this.updatePlayers();
          });

          socket.on('declineTakeback', () => {
            if (
              !this.isOngoing()
              || !this.takebackRequest
              || this.takebackRequest.player === playerColor
            ) {
              return;
            }

            this.takebackRequest = null;

            this.addChatMessage({
              login: null,
              message: 'Takeback request declined'
            });
            this.io.emit('takebackDeclined');
          });

          socket.on('cancelTakeback', () => {
            if (
              !this.isOngoing()
              || !this.takebackRequest
              || this.takebackRequest.player !== playerColor
            ) {
              return;
            }

            this.takebackRequest = null;

            this.addChatMessage({
              login: null,
              message: 'Takeback request canceled'
            });
            this.io.emit('takebackCanceled');
          });

          socket.on('makeMove', (move) => {
            if (this.turn === playerColor && this.isOngoing()) {
              this.move(player!, move);
            }
          });
        } else if (isOngoingDarkChessGame) {
          return next(new Error('DARK_CHESS_CANNOT_BE_OBSERVED'));
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
              moves: this.colorMoves[player!.color]
            }
          });
        } else {
          socket.emit('initialGameData', {
            timestamp,
            player,
            game: this
          });
        }

        if (user) {
          socket.on('addChatMessage', (message) => {
            if (typeof message === 'string') {
              message = message.trim();

              if (message && message.length < 256) {
                this.addChatMessage({
                  login: user.login,
                  message
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

    this.io.emit('newChatMessage', chatMessage);
  }

  clearPingTimeout() {
    clearTimeout(this.pingTimeout);
  }

  clearTimerTimeout() {
    clearTimeout(this.timerTimeout);
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    super.end(winner, reason);

    // anything that client can't recognize
    if (
      reason === ResultReasonEnum.RESIGN
      || reason === ResultReasonEnum.AGREED_TO_DRAW
      || reason === ResultReasonEnum.TIME_RAN_OUT
    ) {
      const player = this.players[this.turn];

      if (reason === ResultReasonEnum.TIME_RAN_OUT) {
        player.time = 0;
      } else if (this.timeControl && this.timerTimeout) {
        player.time! -= Date.now() - this.lastMoveTimestamp;
      }

      this.io.emit('gameOver', {
        result: this.result!,
        players: this.players
      });
    }

    if (this.isDarkChess) {
      setTimeout(() => {
        this.io.emit('darkChessMoves', this.moves);
      }, 0);
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
      promotion
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
    const move: Move = {
      from: fromLocation,
      to: toLocation,
      duration: newTimestamp - this.lastMoveTimestamp
    };

    if (promotion) {
      move.promotion = promotion;
    }

    const pingTimes = this.playerPingTimes[player.color];
    const averagePing = pingTimes.length
      ? Math.round(this.playerPingTimes[player.color].reduce((sum, ping) => sum + ping, 0) / pingTimes.length)
      : 0;

    this.registerAnyMove(move);
    this.changePlayerTime(averagePing);

    this.lastMoveTimestamp = newTimestamp;

    if (this.isDarkChess) {
      _.forEach(this.io.sockets, (socket) => {
        const socketPlayer = socket.player;

        if (socketPlayer) {
          socket.emit('moveMade', {
            move: _.last(this.colorMoves[socketPlayer.color])!,
            moveIndex: this.moves.length - 1,
            lastMoveTimestamp: this.lastMoveTimestamp
          });
        }
      });
    } else {
      this.io.emit('moveMade', {
        move,
        moveIndex: this.moves.length - 1,
        lastMoveTimestamp: this.lastMoveTimestamp
      });
    }

    this.updatePlayers();
    this.setTimeout();
  }

  pingPlayers = () => {
    const now = Date.now();

    for (const timestamp of this.pingTimestamps) {
      if (now - timestamp >= 15 * 1000) {
        this.pingTimestamps.delete(timestamp);
      }
    }

    this.pingTimestamps.add(now);

    this.io.emit('gamePing', now);
  };

  setTimeout() {
    if (
      this.isOngoing()
      && this.moves.length >= 2
      && this.timeControl
    ) {
      const player = this.players[this.turn];

      this.clearTimerTimeout();

      this.timerTimeout = setTimeout(() => {
        this.end(this.getOpponentColor(), ResultReasonEnum.TIME_RAN_OUT);
      }, player.time!) as any;
    }
  }

  toJSON(): IGame {
    return _.pick(this, [
      'id',
      'startingData',
      'variants',
      'status',
      'players',
      'result',
      'timeControl',
      'pgnTags',
      'drawOffer',
      'takebackRequest',
      'lastMoveTimestamp',
      'moves',
      'chat'
    ]);
  }

  updatePlayers() {
    this.io.emit('updatePlayers', this.players);
  }

  unregisterLastMove() {
    const move = _.last(this.moves)!;
    const needToUpdateTime = this.moves.length > 2;

    move.revertMove();

    this.moves.pop();

    const player = this.players[this.turn];

    if (this.timeControl && needToUpdateTime) {
      if (this.timeControl.type === TimeControlEnum.TIMER) {
        player.time! += move.duration - this.timeControl.increment;
      } else {
        player.time = this.timeControl.base;
      }
    }

    if (this.isDarkChess) {
      _.forEach(ColorEnum, (color) => {
        const move = _.last(this.colorMoves[color]);

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

  validateTakebackRequest(moveIndex: any): boolean {
    return (
      typeof moveIndex === 'number'
      && moveIndex < this.moves.length - 1
      && (!!this.moves[moveIndex] || moveIndex === -1)
    );
  }
}
