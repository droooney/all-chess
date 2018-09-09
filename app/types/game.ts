/// <reference path="../typings/socket.io.d.ts" />

import { User } from './user';

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

export interface StartingPiece {
  id: number;
  type: PieceEnum;
  color: ColorEnum;
}

export interface Piece {
  id: number;
  type: PieceEnum;
  color: ColorEnum;
  square: Square;
  moved: boolean;
}

export type GamePieces = {
  [color in ColorEnum]: Piece[];
};

export type GameKings = {
  [color in ColorEnum]: Piece;
};

export type Board = (Piece | null)[][];

export type StartingBoard = (StartingPiece | null)[][];

export interface Game {
  startingBoard: StartingBoard;
  status: GameStatusEnum;
  players: GamePlayers;
  result: GameResult | null;
  timeControl: TimeControlEnum;
  moves: ExtendedMove[];
  chat: ChatMessage[];
}

export interface Room {
  id: string;
  players: Player[];
}

export interface Move {
  from: Square;
  to: Square;
  timestamp: number;
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

export enum ResultReasonEnum {
  CHECKMATE = 'CHECKMATE',
  STALEMATE = 'STALEMATE',
  TIME_RAN_OUT = 'TIME_RAN_OUT',
  RESIGN = 'RESIGN',
  INSUFFICIENT_MATERIAL = 'INSUFFICIENT_MATERIAL',
  THREEFOLD_REPETITION = 'THREEFOLD_REPETITION',
  FIVEFOLD_REPETITION = 'FIVEFOLD_REPETITION',
  FIFTY_MOVE_RULE = 'FIFTY_MOVE_RULE',
  SEVENTY_FIVE_MOVE_RULE = 'SEVENTY_FIVE_MOVE_RULE'
}

export interface GameResult {
  winner: ColorEnum | null;
  reason: ResultReasonEnum;
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
