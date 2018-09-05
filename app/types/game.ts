/// <reference path="../typings/socket.io.d.ts" />

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
  time: number | null;
}

export type GamePlayers = {
  [color in ColorEnum]: Player;
};

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
  id: number;
  type: PieceEnum;
  color: ColorEnum;
  square: Square;
  moved: boolean;
  allowedMoves: Square[];
}

export type Board = {
  [rank: number]: {
    [file: number]: Piece | null;
  };
};

export interface Game {
  board: Board;
  turn: ColorEnum;
  status: GameStatusEnum;
  players: GamePlayers;
  result: GameResult | null;
  isCheck: boolean;
  timeControl: TimeControlEnum;
  moves: ExtendedMove[];
  lastMoveTimestamp: number;
  chat: ChatMessage[];
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

export interface ExtendedMove extends Move {
  algebraic: string;
  figurine: string;
}

export interface RevertableMove extends ExtendedMove {
  revertMove(): void;
}

export enum GameStatusEnum {
  BEFORE_START = 'BEFORE_START',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED'
}

export interface GameResult {
  winner: ColorEnum | null;
}

export interface Timer {
  base: number;
  increment: number;
}

export enum TimeControlEnum {
  TIMER = 'TIMER',
  CORRESPONDENCE = 'CORRESPONDENCE',
  NONE = 'NONE'
}

export interface ChatMessage {
  login: string;
  isPlayer: boolean;
  message: string;
}
