import * as _ from 'lodash';
import { Namespace, Socket } from 'socket.io';
import {
  ColorEnum,
  Game as IGame,
  GameStatusEnum,
  Move,
  PieceEnum,
  Player,
  ResultReasonEnum,
  TimeControlEnum,
  Timer
} from '../types';
import { GameHelper } from '../shared/helpers';

export default class Game extends GameHelper {
  timer: Timer = {
    base: 10 * 60 * 1000,
    increment: 5 * 1000
  };
  timerTimeout?: number;
  io: Namespace;

  constructor(io: Namespace, players: Player[]) {
    super({
      timeControl: TimeControlEnum.TIMER
    });

    this.io = io;

    io.on('connection', (socket) => {
      const user = socket.user;
      const existingPlayer = (user && players.find(({ login }) => login === user.login)) || null;
      const isNewPlayer = !existingPlayer && user && players.length < 2;
      let player: Player | null = null;

      if (isNewPlayer) {
        const color = players.length === 0
          ? Math.random() > 0.5
            ? ColorEnum.WHITE
            : ColorEnum.BLACK
          : this.getOppositeColor(players[0].color);

        player = {
          ...socket.user!,
          color,
          time: this.timer.base
        };

        players.push(player!);
        this.players[player.color] = player!;

        if (players.length === 2) {
          this.status = GameStatusEnum.ONGOING;

          socket.broadcast.emit('startGame', this.players);
        }

        socket.on('move', (move) => {
          this.move(socket, move);
        });
      } else {
        player = existingPlayer;
      }

      if (player) {
        socket.player = player;

        socket.on('resign', () => {
          this.end(this.getOppositeColor(player!.color), ResultReasonEnum.RESIGN);
        });

        socket.on('move', (move) => {
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
      && this.board[move.from.y]
      && typeof move.from.y === 'number'
      && typeof move.from.x === 'number'
      && typeof move.to.y === 'number'
      && typeof move.to.x === 'number'
    );
  }

  move(socket: Socket, move: Move) {
    if (!this.validateMove(move)) {
      return;
    }

    const player = socket.player!;
    const {
      from: fromSquare,
      from: {
        x: fromX,
        y: fromY
      },
      to: {
        x: toX,
        y: toY
      },
      promotion
    } = move;
    const piece = this.board[fromY][fromX];

    if (
      this.turn !== player.color
      || !piece
      || piece.color !== player.color
      || this.status !== GameStatusEnum.ONGOING
    ) {
      // no piece, wrong turn, color or status

      return;
    }

    const isSquareAllowed = this.getAllowedMoves(fromSquare).some(({ x, y }) => (
      toX === x && toY === y
    ));
    const isPawnPromotion = piece.type === PieceEnum.PAWN && ((
      this.turn === ColorEnum.WHITE && toY === 7
    ) || (
      this.turn === ColorEnum.BLACK && toY === 0
    ));
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

    if (!isPawnPromotion) {
      delete move.promotion;
    }

    const prevMove = _.last(this.moves);
    const newTimestamp = move.timestamp = Date.now();

    this.registerMove(move);

    if (
      this.status === GameStatusEnum.ONGOING
      && this.moves.length > 2
      && this.timeControl !== TimeControlEnum.NONE
    ) {
      if (this.timeControl === TimeControlEnum.TIMER) {
        player.time! += prevMove!.timestamp - newTimestamp + this.timer.increment;
      } else {
        player.time = this.timer.base;
      }
    }

    this.io.emit('move', move);
    this.io.emit('updatePlayers', this.players);

    if (
      this.status === GameStatusEnum.ONGOING
      && this.moves.length > 1
      && this.timeControl !== TimeControlEnum.NONE
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
      'board',
      'turn',
      'status',
      'players',
      'result',
      'isCheck',
      'timeControl',
      'moves',
      'chat'
    ]);
  }
}
