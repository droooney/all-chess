/// <reference path="../typings/socket.io.d.ts" />

import { User } from './user';

declare module 'socket.io' {
  interface Socket {
    player: Player | null;
  }
}

export interface Square {
  board: number;
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

export enum PieceTypeEnum {
  KING = 'KING',
  AMAZON = 'AMAZON',
  EMPRESS = 'EMPRESS',
  CARDINAL = 'CARDINAL',
  QUEEN = 'QUEEN',
  ROOK = 'ROOK',
  BISHOP = 'BISHOP',
  KNIGHT = 'KNIGHT',
  PAWN = 'PAWN',
  MAN = 'MAN'
}

export type StandardPiece = (
  PieceTypeEnum.KING
  | PieceTypeEnum.QUEEN
  | PieceTypeEnum.ROOK
  | PieceTypeEnum.BISHOP
  | PieceTypeEnum.KNIGHT
  | PieceTypeEnum.PAWN
);

export enum ColorEnum {
  WHITE = 'WHITE',
  BLACK = 'BLACK'
}

export enum CastlingTypeEnum {
  KING_SIDE = 'KING_SIDE',
  QUEEN_SIDE = 'QUEEN_SIDE'
}

export type PossibleCastling = {
  [color in ColorEnum]: {
    [castling in CastlingTypeEnum]: boolean;
  };
};

export type ChecksCount = {
  [color in ColorEnum]: number;
};

export interface BoardDimensions {
  boardCount: number;
  boardWidth: number;
  boardHeight: number;
}

export interface PossibleEnPassant {
  enPassantSquare: Square;
  pieceLocation: Square;
}

export interface StartingData {
  result: GameResult | null;
  turn: ColorEnum;
  startingMoveIndex: number;
  pliesWithoutCaptureOrPawnMove: number;
  possibleCastling: PossibleCastling;
  possibleEnPassant: PossibleEnPassant | null;
  checksCount: ChecksCount;
  pieces: ReadonlyArray<RealPiece>;
  voidSquares: ReadonlyArray<Square>;
  emptySquares: ReadonlyArray<Square>;
  visiblePieces?: {
    [color in ColorEnum]: Piece[];
  };
}

export interface Piece {
  id: string;
  type: PieceTypeEnum;
  color: ColorEnum;
  location: PieceLocation;
  moved: boolean;
  originalType: PieceTypeEnum;
  abilities: PieceTypeEnum | null;
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
  pieceType: PieceTypeEnum;
}

export type RealPieceLocation = PieceBoardLocation | PiecePocketLocation;

export type PieceLocation = null | RealPieceLocation;

export type GameKings = {
  [color in ColorEnum]: Piece[];
};

export interface TakebackRequest {
  player: ColorEnum;
  moveIndex: number;
}

export interface GameMinimalData {
  id: string;
  status: GameStatusEnum;
  players: GamePlayers;
  result: GameResult | null;
  timeControl: TimeControl;
  variants: ReadonlyArray<GameVariantEnum>;
}

export interface CommonGameData extends GameMinimalData {
  startingData: StartingData;
  result: GameResult | null;
  chat: ChatMessage[];
  takebackRequest: TakebackRequest | null;
  drawOffer: ColorEnum | null;
  pgnTags: PGNTags;
  lastMoveTimestamp: number;
}

export interface Game extends CommonGameData {
  moves: Move[];
}

export interface DarkChessGame extends CommonGameData {
  moves: DarkChessMove[];
}

export interface GameInitialData {
  timestamp: number;
  player: Player | null;
  game: Game;
}

export interface DarkChessGameInitialData {
  timestamp: number;
  player: Player | null;
  game: DarkChessGame;
}

export type PGNTags = {
  [tag: string]: string;
};

export interface GameCreateSettings {
  timeControl: TimeControl;
  variants: ReadonlyArray<GameVariantEnum>;
}

export enum GameVariantEnum {
  CHESS_960 = 'CHESS_960',
  CRAZYHOUSE = 'CRAZYHOUSE',
  ATOMIC = 'ATOMIC',
  KING_OF_THE_HILL = 'KING_OF_THE_HILL',
  CIRCE = 'CIRCE',
  PATROL = 'PATROL',
  MADRASI = 'MADRASI',
  MONSTER_CHESS = 'MONSTER_CHESS',
  ALICE_CHESS = 'ALICE_CHESS',
  TWO_FAMILIES = 'TWO_FAMILIES',
  CHESSENCE = 'CHESSENCE',
  HORDE = 'HORDE',
  DARK_CHESS = 'DARK_CHESS',
  ANTICHESS = 'ANTICHESS',
  ABSORPTION = 'ABSORPTION',
  FRANKFURT = 'FRANKFURT',
  CAPABLANCA = 'CAPABLANCA',
  AMAZONS = 'AMAZONS',
  THREE_CHECK = 'THREE_CHECK'
}

export interface BaseMove {
  from: RealPieceLocation;
  to: Square;
  promotion?: PieceTypeEnum;
}

export interface Move extends BaseMove {
  duration: number;
}

export interface ExtendedMove extends Move {
  algebraic: string;
  figurine: string;
}

export interface RevertableMove extends ExtendedMove {
  revertMove(): void;
}

export interface DarkChessMove {
  from: PieceLocation;
  to: Square | null;
  promotion?: PieceTypeEnum;
  duration: number;
  algebraic: string;
  figurine: string;
  pieces: Piece[];
}

export interface DarkChessRevertableMove extends DarkChessMove {
  revertMove(): void;
}

export type AnyMove = ExtendedMove | DarkChessMove;

export interface PossibleMove {
  square: Square;
  capture: null | {
    piece: BoardPiece;
    enPassant: boolean;
  };
  castling: null | {
    rook: BoardPiece;
  };
  isPawnPromotion: boolean;
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
  HORDE_DESTROYED = 'HORDE_DESTROYED',
  AMAZONS_DESTROYED = 'AMAZONS_DESTROYED',
  NO_MORE_PIECES = 'NO_MORE_PIECES',
  THREE_CHECKS = 'THREE_CHECKS',
  STALEMATE = 'STALEMATE',
  TIME_RAN_OUT = 'TIME_RAN_OUT',
  RESIGN = 'RESIGN',
  AGREED_TO_DRAW = 'AGREED_TO_DRAW',
  INSUFFICIENT_MATERIAL = 'INSUFFICIENT_MATERIAL',
  THREEFOLD_REPETITION = 'THREEFOLD_REPETITION',
  FIFTY_MOVE_RULE = 'FIFTY_MOVE_RULE'
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
  login: string | null;
  message: string;
}

export type CenterSquareParams = { top?: true; left?: true; bottom?: true; right?: true } | null;
