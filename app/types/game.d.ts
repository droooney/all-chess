import { User } from './User';

declare module 'socket.io' {
  interface Socket {
    player?: Player;
    user: User | null;
  }
}

export interface Square {
  x: number;
  y: number;
}

export interface Player extends User {
  color: ColorEnum;
}

export enum PieceEnum {
  KING = 'KING',
  QUEEN = 'QUEEN',
  ROOK = 'ROOK',
  BISHOP = 'BISHOP',
  KNIGHT = 'KNIGHT',
  PAWN = 'PAWN'
}

export enum ColorEnum {
  WHITE = 'WHITE',
  BLACK = 'BLACK'
}

export interface Piece {
  type: PieceEnum;
  color: ColorEnum;
  square: Square;
  moved: boolean;
  allowedMoves: Square[];
}

export type Board = (Piece | null)[][];

export interface Game {
  board: Board;
  turn: ColorEnum;
  status: GameStatusEnum;
  players: Player[];
}

export interface Room {
  id: string;
  players: Player[];
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceEnum;
}

export enum GameStatusEnum {
  BEFORE_START = 'BEFORE_START',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED'
}
