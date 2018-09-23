import {
  ColorEnum,
  GameVariantEnum,
  PieceEnum,
  ResultReasonEnum
} from '../../types';

export const SHORT_PIECE_NAMES: { [piece in PieceEnum]: string } = {
  [PieceEnum.KING]: 'K',
  [PieceEnum.QUEEN]: 'Q',
  [PieceEnum.ROOK]: 'R',
  [PieceEnum.BISHOP]: 'B',
  [PieceEnum.KNIGHT]: 'N',
  [PieceEnum.PAWN]: 'P'
};

export const PIECE_LITERALS: { [color in ColorEnum]: { [piece in PieceEnum]: string; }; } = {
  [ColorEnum.WHITE]: {
    [PieceEnum.KING]: '♔',
    [PieceEnum.QUEEN]: '♕',
    [PieceEnum.ROOK]: '♖',
    [PieceEnum.BISHOP]: '♗',
    [PieceEnum.KNIGHT]: '♘',
    [PieceEnum.PAWN]: '♙'
  },
  [ColorEnum.BLACK]: {
    [PieceEnum.KING]: '♚',
    [PieceEnum.QUEEN]: '♛',
    [PieceEnum.ROOK]: '♜',
    [PieceEnum.BISHOP]: '♝',
    [PieceEnum.KNIGHT]: '♞',
    [PieceEnum.PAWN]: '♟'
  }
};

export const POSSIBLE_TIMER_BASES_IN_MINUTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 45, 60];
export const POSSIBLE_TIMER_INCREMENTS_IN_SECONDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 45, 60];
export const POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const POSSIBLE_TIMER_BASES_IN_MILLISECONDS = POSSIBLE_TIMER_BASES_IN_MINUTES.map((base) => base * 60 * 1000);
export const POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS = POSSIBLE_TIMER_INCREMENTS_IN_SECONDS.map((base) => base * 1000);
export const POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS = POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS.map((base) => base * 24 * 60 * 60 * 1000);

export const GAME_VARIANT_NAMES: { [variation in GameVariantEnum]: string; } = {
  [GameVariantEnum.CHESS_960]: 'Chess 960',
  [GameVariantEnum.CRAZYHOUSE]: 'Crazyhouse',
  [GameVariantEnum.ATOMIC]: 'Atomic',
  [GameVariantEnum.KING_OF_THE_HILL]: 'King of the hill',
  [GameVariantEnum.CIRCE]: 'Circe',
  [GameVariantEnum.PATROL]: 'Patrol',
  [GameVariantEnum.MADRASI]: 'Madrasi',
  [GameVariantEnum.LAST_CHANCE]: 'Last chance',
  [GameVariantEnum.MONSTER_CHESS]: 'Monster chess',
  [GameVariantEnum.ALICE_CHESS]: 'Alice chess'
};

export const RESULT_REASON_NAMES: { [reason in ResultReasonEnum]: string } = {
  [ResultReasonEnum.CHECKMATE]: 'checkmate',
  [ResultReasonEnum.KING_IN_THE_CENTER]: 'king in the center',
  [ResultReasonEnum.KING_EXPLODED]: 'king exploded',
  [ResultReasonEnum.KING_CAPTURED]: 'king captured',
  [ResultReasonEnum.STALEMATE]: 'stalemate',
  [ResultReasonEnum.TIME_RAN_OUT]: 'opponent\'s time ran out',
  [ResultReasonEnum.RESIGN]: 'opponent resigned',
  [ResultReasonEnum.AGREED_TO_DRAW]: 'players agreed to a draw',
  [ResultReasonEnum.INSUFFICIENT_MATERIAL]: 'insufficient material',
  [ResultReasonEnum.THREEFOLD_REPETITION]: 'threefold repetition',
  [ResultReasonEnum.FIVEFOLD_REPETITION]: 'fivefold repetition',
  [ResultReasonEnum.FIFTY_MOVE_RULE]: '50 moves without pawn moves or captures',
  [ResultReasonEnum.SEVENTY_FIVE_MOVE_RULE]: '75 moves without pawn moves or captures'
};

export const COLOR_NAMES: { [color in ColorEnum]: string } = {
  [ColorEnum.WHITE]: 'White',
  [ColorEnum.BLACK]: 'Black'
};
