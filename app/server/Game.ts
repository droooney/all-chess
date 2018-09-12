import * as _ from 'lodash';
import { Namespace, Socket } from 'socket.io';
import {
  BaseMove,
  ColorEnum,
  Game as IGame,
  GameCreateSettings,
  GameStatusEnum,
  GameVariantEnum,
  Move,
  PieceEnum,
  PieceLocationEnum,
  Player,
  ResultReasonEnum,
  TimeControlEnum
} from '../types';
import { Game as GameHelper } from '../shared/helpers';
import {
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
        socket.player = player;

        socket.on('resign', () => {
          this.end(this.getOppositeColor(player!.color), ResultReasonEnum.RESIGN);
        });

        socket.on('makeMove', (move) => {
          this.move(socket, move);
        });
      }

      socket.emit('initialGameData', {
        timestamp: Date.now(),
        player,
        game: this
      });

      socket.on('addChatMessage', (message) => {
        if (message && typeof message === 'string' && message.length < 256) {
          const chatMessage = {
            login: user ? user.login : 'anonymous',
            isPlayer: !!player,
            message
          };

          this.chat.push(chatMessage);

          this.io.emit('newChatMessage', chatMessage);
        }
      });
    });
  }

  validateMove(move: any): boolean {
    return (
      move
      && move.from
      && move.to
      && ((
        move.from.type === PieceLocationEnum.POCKET
        && this.isPocketUsed
      ) || (
        move.from.type === PieceLocationEnum.BOARD
        && this.board[move.from.y]
        && typeof move.from.y === 'number'
        && typeof move.from.x === 'number'
        && typeof move.to.y === 'number'
        && typeof move.to.x === 'number'
      ))
    );
  }

  move(socket: Socket, moveForServer: BaseMove) {
    if (!this.validateMove(moveForServer)) {
      return;
    }

    const player = socket.player!;
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
      ? this.board[fromLocation.y][fromLocation.x]
      : this.pocket[player.color][fromLocation.pieceType][0];

    if (
      this.turn !== player.color
      || !piece
      || piece.color !== player.color
      || this.status !== GameStatusEnum.ONGOING
    ) {
      // no piece, wrong turn, color or status

      return;
    }

    const isSquareAllowed = this.getAllowedMoves(fromLocation).some(({ x, y }) => (
      toX === x && toY === y
    ));
    const isPawnPromotion = (
      fromLocation.type === PieceLocationEnum.BOARD
      && piece!.type === PieceEnum.PAWN
      && ((
        this.turn === ColorEnum.WHITE && toY === 7
      ) || (
        this.turn === ColorEnum.BLACK && toY === 0
      ))
    );
    const isValidPromotion =  (
      promotion === PieceEnum.QUEEN
      || promotion === PieceEnum.ROOK
      || promotion === PieceEnum.BISHOP
      || promotion === PieceEnum.KNIGHT
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

    this.registerMove(move);

    if (
      this.status === GameStatusEnum.ONGOING
      && this.moves.length > 2
      && this.timeControl
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
      && this.moves.length > 1
      && this.timeControl
    ) {
      this.setTimeout(player);
    }
  }

  setTimeout(forPlayer: Player) {
    clearTimeout(this.timerTimeout);

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
      'startingBoard',
      'variants',
      'status',
      'players',
      'result',
      'timeControl',
      'moves',
      'chat'
    ]);
  }
}
