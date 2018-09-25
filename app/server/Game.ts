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
  PieceTypeEnum,
  PieceLocationEnum,
  Player,
  ResultReasonEnum,
  TimeControlEnum
} from '../types';
import { Game as GameHelper } from '../shared/helpers';
import {
  COLOR_NAMES,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS
} from '../shared/constants';

const VARIATIONS = _.keys(GameVariantEnum);

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
    if (timeControl === null) {
      return true;
    }

    if (!timeControl) {
      return false;
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

    if (variants.some((variation) => !VARIATIONS.includes(variation))) {
      return false;
    }

    return super.validateVariants(variants);
  }

  timerTimeout?: number;
  io: Namespace;

  constructor(io: Namespace, settings: GameCreateSettings & { id: string; }) {
    super(settings);

    this.io = io;

    io.on('connection', (socket) => {
      const user = socket.user;
      const existingPlayer = (user && _.find(this.players, (player) => player && player.login === user.login)) || null;
      const isNewPlayer = (
        !existingPlayer
        && user
        && this.status === GameStatusEnum.BEFORE_START
        && _.some(this.players, (player) => !player)
      );
      let player: Player | null = null;

      if (isNewPlayer) {
        const otherPlayer = _.find(this.players, Boolean);
        const color = otherPlayer
          ? this.getOppositeColor(otherPlayer.color)
          : Math.random() > 0.5
            ? ColorEnum.WHITE
            : ColorEnum.BLACK;

        player = {
          ...socket.user!,
          color,
          time: this.timeControl && this.timeControl.base
        };

        this.players[player.color] = player!;

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
          if (this.status === GameStatusEnum.ONGOING) {
            this.end(this.getOppositeColor(playerColor), ResultReasonEnum.RESIGN);
          }
        });

        socket.on('offerDraw', () => {
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

        socket.on('drawAccepted', () => {
          if (this.drawOffer && this.drawOffer !== playerColor) {
            this.drawOffer = null;

            this.end(null, ResultReasonEnum.AGREED_TO_DRAW);
          }
        });

        socket.on('drawDeclined', () => {
          if (this.drawOffer && this.drawOffer !== playerColor) {
            this.drawOffer = null;

            this.addChatMessage({
              login: null,
              message: 'Draw offer declined'
            });
            this.io.emit('drawDeclined');
          }
        });

        socket.on('drawCanceled', () => {
          if (this.drawOffer === playerColor) {
            this.drawOffer = null;

            this.addChatMessage({
              login: null,
              message: 'Draw offer canceled'
            });
            this.io.emit('drawCanceled');
          }
        });

        socket.on('declareThreefoldRepetitionDraw', () => {
          if (this.isThreefoldRepetitionDrawPossible) {
            this.end(null, ResultReasonEnum.THREEFOLD_REPETITION);
          }
        });

        socket.on('declare50MoveDraw', () => {
          if (this.is50MoveDrawPossible) {
            this.end(null, ResultReasonEnum.FIFTY_MOVE_RULE);
          }
        });

        socket.on('makeMove', (move) => {
          if (this.turn === playerColor && this.status === GameStatusEnum.ONGOING) {
            this.move(player!, move);
          }
        });
      }

      socket.emit('initialGameData', {
        timestamp: Date.now(),
        player,
        game: this
      });

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
        && this.startingBoards[move.from.board]
        && this.startingBoards[move.from.board][move.from.y]
        && typeof move.from.board === 'number'
        && typeof move.from.y === 'number'
        && typeof move.from.x === 'number'
      ))
    );
  }

  move(player: Player, moveForServer: BaseMove) {
    if (!this.validateMove(moveForServer)) {
      return;
    }

    const {
      from: fromLocation,
      to: toLocation,
      to: {
        x: toX,
        y: toY
      },
      promotion
    } = moveForServer;
    const piece = fromLocation.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(fromLocation)!
      : this.getPocketPiece(fromLocation.pieceType, this.turn)!;

    if (!piece || piece.color !== player.color) {
      // no piece or wrong color

      return;
    }

    const isSquareAllowed = this.getAllowedMoves(fromLocation).some(({ x, y }) => (
      toX === x && toY === y
    ));
    const isPawnPromotion = this.isPawnPromotion(moveForServer);
    const isValidPromotion =  (
      promotion === PieceTypeEnum.QUEEN
      || promotion === PieceTypeEnum.ROOK
      || promotion === PieceTypeEnum.BISHOP
      || promotion === PieceTypeEnum.KNIGHT
    );
    const isMoveAllowed = isSquareAllowed && (!isPawnPromotion || isValidPromotion);

    if (!isMoveAllowed) {
      return;
    }

    const newTimestamp = Date.now();
    const move: Move = {
      from: fromLocation,
      to: toLocation,
      timestamp: newTimestamp
    };

    if (isPawnPromotion) {
      move.promotion = promotion;
    }

    const prevMove = _.last(this.moves);
    const prevTurn = this.turn;

    this.registerMove(move);

    if (
      this.status === GameStatusEnum.ONGOING
      && this.moves.length > this.numberOfMovesBeforeStart
      && this.timeControl
      && prevTurn !== this.turn
    ) {
      if (this.timeControl.type === TimeControlEnum.TIMER) {
        player.time! += prevMove!.timestamp - newTimestamp + this.timeControl.increment;
      } else {
        player.time = this.timeControl.base;
      }
    }

    this.io.emit('moveMade', move);
    this.io.emit('updatePlayers', this.players);

    if (
      this.status === GameStatusEnum.ONGOING
      && this.moves.length >= this.numberOfMovesBeforeStart
      && this.timeControl
      && prevTurn !== this.turn
    ) {
      this.setTimeout(this.players[this.turn]);
    } else if (
      this.status !== GameStatusEnum.ONGOING
      && this.timerTimeout
    ) {
      this.clearTimeout();
    }
  }

  clearTimeout() {
    clearTimeout(this.timerTimeout);
  }

  setTimeout(forPlayer: Player) {
    this.clearTimeout();

    this.timerTimeout = setTimeout(() => {
      forPlayer.time = 0;

      this.io.emit('updatePlayers', this.players);
      this.end(this.getOpponentColor(), ResultReasonEnum.TIME_RAN_OUT);
    }, forPlayer.time!) as any;
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    super.end(winner, reason);

    // anything that client can't recognize
    if (
      reason === ResultReasonEnum.RESIGN
      || reason === ResultReasonEnum.AGREED_TO_DRAW
      || reason === ResultReasonEnum.TIME_RAN_OUT
      || reason === ResultReasonEnum.THREEFOLD_REPETITION
      || reason === ResultReasonEnum.FIFTY_MOVE_RULE
    ) {
      this.io.emit('gameOver', this.result!);
    }
  }

  toJSON(): IGame {
    return _.pick(this, [
      'id',
      'startingBoards',
      'variants',
      'status',
      'players',
      'result',
      'timeControl',
      'drawOffer',
      'moves',
      'chat'
    ]);
  }
}
