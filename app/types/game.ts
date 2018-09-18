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
  location: PieceLocation;
  moved: boolean;
  originalType: PieceEnum;
}

export interface BoardPiece extends Piece {
  location: PieceBoardLocation;
}

export interface PocketPiece extends Piece {
  location: PiecePocketLocation;
}

export type RealPiece = (
  BoardPiece
  | PocketPiece
);

export enum PieceLocationEnum {
  BOARD = 'BOARD',
  POCKET = 'POCKET'
}

export interface PieceBoardLocation extends Square {
  type: PieceLocationEnum.BOARD;
}

export interface PiecePocketLocation {
  type: PieceLocationEnum.POCKET;
  pieceType: PieceEnum;
}

export type RealPieceLocation = PieceBoardLocation | PiecePocketLocation;

export type PieceLocation = null | RealPieceLocation;

export type GamePieces = {
  [color in ColorEnum]: Piece[];
};

export type GameKings = {
  [color in ColorEnum]: BoardPiece;
};

export type PocketPieces = {
  [piece in PieceEnum]: PocketPiece[];
};

export type Pocket = {
  [color in ColorEnum]: PocketPieces;
};

export type Board = (BoardPiece | null)[][];

export type StartingBoard = (StartingPiece | null)[][];

export interface Game {
  id: string;
  startingBoard: StartingBoard;
  status: GameStatusEnum;
  players: GamePlayers;
  result: GameResult | null;
  timeControl: TimeControl;
  moves: ExtendedMove[];
  chat: ChatMessage[];
  variants: GameVariantEnum[];
}

export interface GameCreateSettings {
  timeControl: TimeControl;
  variants: GameVariantEnum[];
}

export enum GameVariantEnum {
  CHESS_960 = 'CHESS_960',
  CRAZYHOUSE = 'CRAZYHOUSE',
  ATOMIC = 'ATOMIC',
  KING_OF_THE_HILL = 'KING_OF_THE_HILL',
  CIRCE = 'CIRCE',
  PATROL = 'PATROL',
  MADRASI = 'MADRASI',
  LAST_CHANCE = 'LAST_CHANCE',
  MONSTER_CHESS = 'MONSTER_CHESS'
}

export interface BaseMove {
  from: RealPieceLocation;
  to: Square;
  promotion?: PieceEnum;
}

export interface Move extends BaseMove {
  timestamp: number;
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
  KING_IN_THE_CENTER = 'KING_IN_THE_CENTER',
  KING_EXPLODED = 'KING_EXPLODED',
  KING_CAPTURED = 'KING_CAPTURED',
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

export enum TimeControlEnum {
  TIMER = 'TIMER',
  CORRESPONDENCE = 'CORRESPONDENCE',
  NONE = 'NONE'
}

export interface TimerTimeControl {
  type: TimeControlEnum.TIMER;
  base: number;
  increment: number;
}

export interface CorrespondenceTimeControl {
  type: TimeControlEnum.CORRESPONDENCE;
  base: number;
}

export type TimeControl = null | TimerTimeControl | CorrespondenceTimeControl;

export interface ChatMessage {
  login: string;
  isPlayer: boolean;
  message: string;
}

export type CenterSquareParams = { top?: true; left?: true; bottom?: true; right?: true } | null;
