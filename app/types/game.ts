/// <reference path="../typings/socket.io.d.ts" />

import { User } from './user';

declare module 'socket.io' {
  interface Socket {
    pingResponded: Set<number>;
    player: Player | null;
  }
}

export interface Square {
  readonly board: number;
  readonly x: number;
  readonly y: number;
}

export interface Arrow {
  type: 'arrow';
  id: number;
  from: Square;
  to: Square;
}

export interface Circle {
  type: 'circle';
  id: number;
  square: Square;
}

export type DrawnSymbol = Arrow | Circle;

export interface Player extends User {
  color: ColorEnum;
  time: number | null;
}

export type GamePlayers = Record<ColorEnum, Player>;

export enum PieceTypeEnum {
  KING = 'KING',
  AMAZON = 'AMAZON',
  EMPRESS = 'EMPRESS',
  CARDINAL = 'CARDINAL',
  QUEEN = 'QUEEN',
  ROOK = 'ROOK',
  BISHOP = 'BISHOP',
  KNIGHT = 'KNIGHT',
  PAWN = 'PAWN'
}

export type StandardPiece = (
  PieceTypeEnum.KING
  | PieceTypeEnum.QUEEN
  | PieceTypeEnum.ROOK
  | PieceTypeEnum.BISHOP
  | PieceTypeEnum.KNIGHT
  | PieceTypeEnum.PAWN
);

export type MovementType = PieceTypeEnum.KNIGHT | PieceTypeEnum.BISHOP | PieceTypeEnum.ROOK;

export enum ColorEnum {
  WHITE = 'WHITE',
  BLACK = 'BLACK'
}

export enum CastlingTypeEnum {
  KING_SIDE = 'KING_SIDE',
  QUEEN_SIDE = 'QUEEN_SIDE'
}

export type PossibleCastling = Record<ColorEnum, Record<CastlingTypeEnum, boolean>>;

export type ChecksCount = Record<ColorEnum, number>;

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
  pieces: readonly RealPiece[];
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

export interface NonExistentPiece extends Piece {
  location: null;
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
  color: ColorEnum;
}

export type RealPieceLocation = PieceBoardLocation | PiecePocketLocation;

export type PieceLocation = null | RealPieceLocation;

export type Boards = (BoardPiece | null)[][][];

export type GameKings = Record<ColorEnum, Piece[]>;

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
  variants: readonly GameVariantEnum[];
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

export type PGNTags = Record<string, string>;

export interface GameCreateSettings {
  timeControl: TimeControl;
  variants: readonly GameVariantEnum[];
}

export interface GameCreateOptions extends GameCreateSettings {
  id: string;
  pgnTags?: PGNTags;
  startingData?: StartingData;
  startingFen?: string;
}

export enum GameVariantEnum {
  CHESS_960 = 'CHESS_960',
  CRAZYHOUSE = 'CRAZYHOUSE',
  ATOMIC = 'ATOMIC',
  KING_OF_THE_HILL = 'KING_OF_THE_HILL',
  CIRCE = 'CIRCE',
  PATROL = 'PATROL',
  MADRASI = 'MADRASI',
  ALICE_CHESS = 'ALICE_CHESS',
  TWO_FAMILIES = 'TWO_FAMILIES',
  HORDE = 'HORDE',
  DARK_CHESS = 'DARK_CHESS',
  ANTICHESS = 'ANTICHESS',
  ABSORPTION = 'ABSORPTION',
  FRANKFURT = 'FRANKFURT',
  CAPABLANCA = 'CAPABLANCA',
  THREE_CHECK = 'THREE_CHECK',
  CYLINDER_CHESS = 'CYLINDER_CHESS',
  CIRCULAR_CHESS = 'CIRCULAR_CHESS',
  HEXAGONAL_CHESS = 'HEXAGONAL_CHESS'
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

export interface LocalMove extends RevertableMove {

}

export interface Premove extends BaseMove {

}

export interface DarkChessMove {
  from: PieceLocation;
  to: Square | null;
  promotion?: PieceTypeEnum;
  duration: number;
  algebraic: string;
  figurine: string;
  pieces: readonly Piece[];
}

export interface DarkChessRevertableMove extends DarkChessMove {
  revertMove(): void;
}

export interface DarkChessLocalMove extends DarkChessRevertableMove {
  prevVisibleSquares?: Square[];
}

export type AnyMove = LocalMove | DarkChessLocalMove;

export interface BoardPossibleMove {
  square: Square;
  realSquare: Square;
}

export enum GetPossibleMovesMode {
  FOR_MOVE = 'FOR_MOVE',
  ATTACKED = 'ATTACKED',
  CONTROLLED = 'CONTROLLED',
  VISIBLE = 'VISIBLE',
  POSSIBLE = 'POSSIBLE',
  PREMOVES = 'PREMOVES'
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

export interface CenterSquareParams {
  top?: true;
  left?: true;
  bottom?: true;
  right?: true;
}
