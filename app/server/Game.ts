import * as _ from 'lodash';
import { Namespace } from 'socket.io';
import {
  BaseMove,
  ChatMessage,
  ColorEnum,
  Game as IGame,
  GameCreateSettings,
  GameStatusEnum,
  GameVariantEnum,
  Move,
  PGNTags,
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

const VARIANTS = _.keys(GameVariantEnum);

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

  timerTimeout?: number;
  io: Namespace;
  lastMoveTimestamp: number = Date.now();

  constructor(io: Namespace, settings: GameCreateSettings & { pgnTags?: PGNTags; id: string; }) {
    super(settings);

    this.io = io;

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

            this.clearTimeout();

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
            if (message && typeof message === 'string' && message.length < 256) {
              this.addChatMessage({
                login: user.login,
                message
              });
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

    const allowedMoves = this.getAllowedMoves(piece).filter(({ square }) => Game.areSquaresEqual(square, toLocation));

    if (!allowedMoves.length) {
      return;
    }

    const isPawnPromotion = allowedMoves.some(({ isPawnPromotion }) => isPawnPromotion);

    if (isPawnPromotion && !this.validPromotions.includes(promotion!)) {
      return;
    }

    const newTimestamp = Date.now();
    const move: Move = {
      from: fromLocation,
      to: toLocation,
      duration: newTimestamp - this.lastMoveTimestamp
    };

    if (isPawnPromotion) {
      move.promotion = promotion;
    }

    const prevTurn = this.turn;

    this.registerAnyMove(move);

    const isPlayerChanged = this.turn !== prevTurn;

    this.changePlayerTime();

    this.lastMoveTimestamp = newTimestamp;

    if (this.isDarkChess) {
      _.forEach(this.io.sockets, (socket) => {
        const socketPlayer = socket.player;

        if (socketPlayer) {
          socket.emit('darkChessMoveMade', {
            move: _.last(this.colorMoves[socketPlayer.color])!,
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

    if (!this.isOngoing()) {
      this.updatePlayers();
    }

    if (isPlayerChanged) {
      this.setTimeout();
    }
  }

  updatePlayers() {
    this.io.emit('updatePlayers', this.players);
  }

  unregisterLastMove() {
    const move = _.last(this.moves)!;
    const prevTurn = this.turn;
    const needToUpdateTime = this.moves.length > this.pliesPerMove;

    move.revertMove();

    this.moves.pop();

    const player = this.players[this.turn];
    const isPlayerChanged = this.turn !== prevTurn;

    if (this.timeControl && needToUpdateTime) {
      if (this.timeControl.type === TimeControlEnum.TIMER) {
        player.time! += move.duration - (isPlayerChanged ? this.timeControl.increment : 0);
      } else if (isPlayerChanged) {
        player.time = this.timeControl.base;
      } else {
        player.time! += move.duration;
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

  clearTimeout() {
    clearTimeout(this.timerTimeout);
  }

  setTimeout() {
    if (
      this.isOngoing()
      && this.moves.length >= this.pliesPerMove
      && this.timeControl
    ) {
      const player = this.players[this.turn];

      this.clearTimeout();

      this.timerTimeout = setTimeout(() => {
        this.end(this.getOpponentColor(), ResultReasonEnum.TIME_RAN_OUT);
      }, player.time!) as any;
    }
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

    this.clearTimeout();
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
}
