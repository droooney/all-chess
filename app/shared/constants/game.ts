import {
  ColorEnum,
  GameStatusEnum,
  GameVariantEnum,
  PieceTypeEnum,
  ResultReasonEnum,
  StandardPiece
} from '../../types';

export const SHORT_PIECE_NAMES: { [piece in PieceTypeEnum]: string } = {
  [PieceTypeEnum.KING]: 'K',
  [PieceTypeEnum.AMAZON]: 'A',
  [PieceTypeEnum.QUEEN]: 'Q',
  [PieceTypeEnum.EMPRESS]: 'E',
  [PieceTypeEnum.CARDINAL]: 'C',
  [PieceTypeEnum.ROOK]: 'R',
  [PieceTypeEnum.BISHOP]: 'B',
  [PieceTypeEnum.KNIGHT]: 'N',
  [PieceTypeEnum.PAWN]: 'P'
};

export const PIECE_LITERALS: { [color in ColorEnum]: { [piece in StandardPiece]: string; }; } = {
  [ColorEnum.WHITE]: {
    [PieceTypeEnum.KING]: '♔',
    [PieceTypeEnum.QUEEN]: '♕',
    [PieceTypeEnum.ROOK]: '♖',
    [PieceTypeEnum.BISHOP]: '♗',
    [PieceTypeEnum.KNIGHT]: '♘',
    [PieceTypeEnum.PAWN]: '♙'
  },
  [ColorEnum.BLACK]: {
    [PieceTypeEnum.KING]: '♚',
    [PieceTypeEnum.QUEEN]: '♛',
    [PieceTypeEnum.ROOK]: '♜',
    [PieceTypeEnum.BISHOP]: '♝',
    [PieceTypeEnum.KNIGHT]: '♞',
    [PieceTypeEnum.PAWN]: '♟'
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
  [GameVariantEnum.ATOMIC]: 'Atomic chess',
  [GameVariantEnum.KING_OF_THE_HILL]: 'King of the hill',
  [GameVariantEnum.CIRCE]: 'Circe',
  [GameVariantEnum.PATROL]: 'Patrol chess',
  [GameVariantEnum.MADRASI]: 'Madrasi',
  [GameVariantEnum.MONSTER_CHESS]: 'Monster chess',
  [GameVariantEnum.ALICE_CHESS]: 'Alice chess',
  [GameVariantEnum.TWO_FAMILIES]: 'Two families',
  [GameVariantEnum.HORDE]: 'Horde',
  [GameVariantEnum.DARK_CHESS]: 'Dark chess',
  [GameVariantEnum.ANTICHESS]: 'Antichess',
  [GameVariantEnum.ABSORPTION]: 'Absorption chess',
  [GameVariantEnum.FRANKFURT]: 'Frankfurt chess',
  [GameVariantEnum.CAPABLANCA]: 'Capablanca chess',
  [GameVariantEnum.AMAZONS]: 'Amazons',
  [GameVariantEnum.THREE_CHECK]: 'Three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'Cylinder chess',
  [GameVariantEnum.CIRCULAR_CHESS]: 'Circular chess',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'Hexagonal chess'
};

export const GAME_VARIANT_PGN_NAMES: { [variation in GameVariantEnum]: string; } = {
  [GameVariantEnum.CHESS_960]: 'Chess960',
  [GameVariantEnum.CRAZYHOUSE]: 'Crazyhouse',
  [GameVariantEnum.ATOMIC]: 'Atomic',
  [GameVariantEnum.KING_OF_THE_HILL]: 'King of the Hill',
  [GameVariantEnum.CIRCE]: 'Circe',
  [GameVariantEnum.PATROL]: 'Patrol',
  [GameVariantEnum.MADRASI]: 'Madrasi',
  [GameVariantEnum.MONSTER_CHESS]: 'Monster',
  [GameVariantEnum.ALICE_CHESS]: 'Alice',
  [GameVariantEnum.TWO_FAMILIES]: 'Two Families',
  [GameVariantEnum.HORDE]: 'Horde',
  [GameVariantEnum.DARK_CHESS]: 'Dark',
  [GameVariantEnum.ANTICHESS]: 'Antichess',
  [GameVariantEnum.ABSORPTION]: 'Absorption',
  [GameVariantEnum.FRANKFURT]: 'Frankfurt',
  [GameVariantEnum.CAPABLANCA]: 'Capablanca',
  [GameVariantEnum.AMAZONS]: 'Amazons',
  [GameVariantEnum.THREE_CHECK]: 'Three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'Cylinder',
  [GameVariantEnum.CIRCULAR_CHESS]: 'Circular',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'Hexagonal'
};

export const GAME_VARIANT_LINKS: { [variation in GameVariantEnum]: string; } = {
  [GameVariantEnum.CHESS_960]: 'chess-960',
  [GameVariantEnum.CRAZYHOUSE]: 'crazyhouse',
  [GameVariantEnum.ATOMIC]: 'atomic-chess',
  [GameVariantEnum.KING_OF_THE_HILL]: 'king-of-the-hill',
  [GameVariantEnum.CIRCE]: 'circe',
  [GameVariantEnum.PATROL]: 'patrol',
  [GameVariantEnum.MADRASI]: 'madrasi',
  [GameVariantEnum.MONSTER_CHESS]: 'monster-chess',
  [GameVariantEnum.ALICE_CHESS]: 'alice-chess',
  [GameVariantEnum.TWO_FAMILIES]: 'two-families',
  [GameVariantEnum.HORDE]: 'horde',
  [GameVariantEnum.DARK_CHESS]: 'dark-chess',
  [GameVariantEnum.ANTICHESS]: 'antichess',
  [GameVariantEnum.ABSORPTION]: 'absorption',
  [GameVariantEnum.FRANKFURT]: 'frankfurt',
  [GameVariantEnum.CAPABLANCA]: 'capablanca',
  [GameVariantEnum.AMAZONS]: 'amazons',
  [GameVariantEnum.THREE_CHECK]: 'three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'cylinder-chess',
  [GameVariantEnum.CIRCULAR_CHESS]: 'circular-chess',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'hexagonal-chess'
};

export const RESULT_REASON_NAMES: { [reason in ResultReasonEnum]: string } = {
  [ResultReasonEnum.CHECKMATE]: 'checkmate',
  [ResultReasonEnum.KING_IN_THE_CENTER]: 'king in the center',
  [ResultReasonEnum.KING_EXPLODED]: 'king exploded',
  [ResultReasonEnum.KING_CAPTURED]: 'king captured',
  [ResultReasonEnum.HORDE_DESTROYED]: 'horde destroyed',
  [ResultReasonEnum.AMAZONS_DESTROYED]: 'amazons destroyed',
  [ResultReasonEnum.NO_MORE_PIECES]: 'no more pieces',
  [ResultReasonEnum.THREE_CHECKS]: 'three checks',
  [ResultReasonEnum.STALEMATE]: 'stalemate',
  [ResultReasonEnum.TIME_RAN_OUT]: 'opponent\'s time ran out',
  [ResultReasonEnum.RESIGN]: 'opponent resigned',
  [ResultReasonEnum.AGREED_TO_DRAW]: 'players agreed to a draw',
  [ResultReasonEnum.INSUFFICIENT_MATERIAL]: 'insufficient material',
  [ResultReasonEnum.THREEFOLD_REPETITION]: 'threefold repetition',
  [ResultReasonEnum.FIFTY_MOVE_RULE]: '50 moves without pawn moves or captures'
};

export const COLOR_NAMES: { [color in ColorEnum]: string } = {
  [ColorEnum.WHITE]: 'White',
  [ColorEnum.BLACK]: 'Black'
};

export const GAME_STATUS_NAMES: { [status in GameStatusEnum]: string; } = {
  [GameStatusEnum.BEFORE_START]: 'Waiting for the opponent',
  [GameStatusEnum.ONGOING]: 'In progress',
  [GameStatusEnum.FINISHED]: 'Finished'
};

export const PIECES_WORTH: { [type in 'orthodox' | 'circular' | 'hexagonal']: { [piece in PieceTypeEnum]: number; }; } = {
  orthodox: {
    [PieceTypeEnum.KING]: 3,
    [PieceTypeEnum.AMAZON]: 12,
    [PieceTypeEnum.QUEEN]: 9,
    [PieceTypeEnum.EMPRESS]: 8,
    [PieceTypeEnum.CARDINAL]: 7,
    [PieceTypeEnum.ROOK]: 5,
    [PieceTypeEnum.BISHOP]: 3,
    [PieceTypeEnum.KNIGHT]: 3,
    [PieceTypeEnum.PAWN]: 1
  },
  circular: {
    [PieceTypeEnum.KING]: 2,
    [PieceTypeEnum.AMAZON]: 10,
    [PieceTypeEnum.QUEEN]: 8,
    [PieceTypeEnum.EMPRESS]: 8,
    [PieceTypeEnum.CARDINAL]: 4,
    [PieceTypeEnum.ROOK]: 6,
    [PieceTypeEnum.BISHOP]: 2,
    [PieceTypeEnum.KNIGHT]: 2,
    [PieceTypeEnum.PAWN]: 1
  },
  hexagonal: {
    [PieceTypeEnum.KING]: 3,
    [PieceTypeEnum.AMAZON]: 13,
    [PieceTypeEnum.QUEEN]: 10,
    [PieceTypeEnum.EMPRESS]: 10,
    [PieceTypeEnum.CARDINAL]: 6,
    [PieceTypeEnum.ROOK]: 7,
    [PieceTypeEnum.BISHOP]: 2,
    [PieceTypeEnum.KNIGHT]: 3,
    [PieceTypeEnum.PAWN]: 1
  }
};
