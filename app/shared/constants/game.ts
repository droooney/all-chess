import {
  ColorEnum,
  EachColor,
  EachPieceType,
  EachVariant,
  GameStatusEnum,
  GameVariantEnum,
  GlickoRating,
  PieceTypeEnum,
  ResultReasonEnum,
  SpeedType,
  TimeControlEnum,
} from 'shared/types';

export const ONE_DAY = 24 * 60 * 60 * 1000;

export const PIECE_NAMES: EachPieceType<string> = {
  [PieceTypeEnum.KING]: 'King',
  [PieceTypeEnum.AMAZON]: 'Amazon',
  [PieceTypeEnum.QUEEN]: 'Queen',
  [PieceTypeEnum.EMPRESS]: 'Empress',
  [PieceTypeEnum.CARDINAL]: 'Cardinal',
  [PieceTypeEnum.ROOK]: 'Rook',
  [PieceTypeEnum.BISHOP]: 'Bishop',
  [PieceTypeEnum.KNIGHT]: 'Knight',
  [PieceTypeEnum.PAWN]: 'Pawn',
};

export const SHORT_PIECE_NAMES: EachPieceType<string> = {
  [PieceTypeEnum.KING]: 'K',
  [PieceTypeEnum.AMAZON]: 'A',
  [PieceTypeEnum.QUEEN]: 'Q',
  [PieceTypeEnum.EMPRESS]: 'E',
  [PieceTypeEnum.CARDINAL]: 'C',
  [PieceTypeEnum.ROOK]: 'R',
  [PieceTypeEnum.BISHOP]: 'B',
  [PieceTypeEnum.KNIGHT]: 'N',
  [PieceTypeEnum.PAWN]: 'P',
};

export const POSSIBLE_TIMER_BASES_IN_MINUTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 45, 60];
export const POSSIBLE_TIMER_INCREMENTS_IN_SECONDS = [0, 1, 2, 3, 4, 5, 10, 15, 30];
export const POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const POSSIBLE_TIMER_BASES_IN_MILLISECONDS = POSSIBLE_TIMER_BASES_IN_MINUTES.map((base) => base * 60 * 1000);
export const POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS = POSSIBLE_TIMER_INCREMENTS_IN_SECONDS.map((base) => base * 1000);
export const POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS = POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS.map((base) => base * ONE_DAY);

export const GAME_VARIANT_NAMES: EachVariant<string> = {
  [GameVariantEnum.CHESS_960]: 'Chess 960',
  [GameVariantEnum.CRAZYHOUSE]: 'Crazyhouse',
  [GameVariantEnum.ATOMIC]: 'Atomic chess',
  [GameVariantEnum.KING_OF_THE_HILL]: 'King of the Hill',
  [GameVariantEnum.CIRCE]: 'Circe',
  [GameVariantEnum.PATROL]: 'Patrol chess',
  [GameVariantEnum.MADRASI]: 'Madrasi chess',
  [GameVariantEnum.ALICE_CHESS]: 'Alice chess',
  [GameVariantEnum.TWO_FAMILIES]: 'Two Families',
  [GameVariantEnum.DARK_CHESS]: 'Dark chess',
  [GameVariantEnum.ANTICHESS]: 'Antichess',
  [GameVariantEnum.ABSORPTION]: 'Absorption chess',
  [GameVariantEnum.FRANKFURT]: 'Frankfurt chess',
  [GameVariantEnum.CAPABLANCA]: 'Capablanca chess',
  [GameVariantEnum.THREE_CHECK]: 'Three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'Cylinder chess',
  [GameVariantEnum.CIRCULAR_CHESS]: 'Circular chess',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'Hexagonal chess',
  [GameVariantEnum.COMPENSATION_CHESS]: 'Compensation chess',
  [GameVariantEnum.RETREAT_CHESS]: 'Retreat chess',
  [GameVariantEnum.BENEDICT_CHESS]: 'Benedict chess',
};

export const GAME_VARIANT_SHORT_NAMES: EachVariant<string> = {
  [GameVariantEnum.CHESS_960]: '960',
  [GameVariantEnum.CRAZYHOUSE]: 'Crazyhouse',
  [GameVariantEnum.ATOMIC]: 'Atomic',
  [GameVariantEnum.KING_OF_THE_HILL]: 'KOTH',
  [GameVariantEnum.CIRCE]: 'Circe',
  [GameVariantEnum.PATROL]: 'Patrol',
  [GameVariantEnum.MADRASI]: 'Madrasi',
  [GameVariantEnum.ALICE_CHESS]: 'Alice',
  [GameVariantEnum.TWO_FAMILIES]: 'Two families',
  [GameVariantEnum.DARK_CHESS]: 'Dark',
  [GameVariantEnum.ANTICHESS]: 'Antichess',
  [GameVariantEnum.ABSORPTION]: 'Absorption',
  [GameVariantEnum.FRANKFURT]: 'Frankfurt',
  [GameVariantEnum.CAPABLANCA]: 'Capablanca',
  [GameVariantEnum.THREE_CHECK]: 'Three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'Cylinder',
  [GameVariantEnum.CIRCULAR_CHESS]: 'Circular',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'Hexagonal',
  [GameVariantEnum.COMPENSATION_CHESS]: 'Compensation',
  [GameVariantEnum.RETREAT_CHESS]: 'Retreat',
  [GameVariantEnum.BENEDICT_CHESS]: 'Benedict',
};

export const GAME_VARIANT_PGN_NAMES: EachVariant<string> = {
  [GameVariantEnum.CHESS_960]: 'Chess960',
  [GameVariantEnum.CRAZYHOUSE]: 'Crazyhouse',
  [GameVariantEnum.ATOMIC]: 'Atomic',
  [GameVariantEnum.KING_OF_THE_HILL]: 'King of the Hill',
  [GameVariantEnum.CIRCE]: 'Circe',
  [GameVariantEnum.PATROL]: 'Patrol',
  [GameVariantEnum.MADRASI]: 'Madrasi',
  [GameVariantEnum.ALICE_CHESS]: 'Alice',
  [GameVariantEnum.TWO_FAMILIES]: 'Two Families',
  [GameVariantEnum.DARK_CHESS]: 'Dark',
  [GameVariantEnum.ANTICHESS]: 'Antichess',
  [GameVariantEnum.ABSORPTION]: 'Absorption',
  [GameVariantEnum.FRANKFURT]: 'Frankfurt',
  [GameVariantEnum.CAPABLANCA]: 'Capablanca',
  [GameVariantEnum.THREE_CHECK]: 'Three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'Cylinder',
  [GameVariantEnum.CIRCULAR_CHESS]: 'Circular',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'Hexagonal',
  [GameVariantEnum.COMPENSATION_CHESS]: 'Compensation',
  [GameVariantEnum.RETREAT_CHESS]: 'Retreat',
  [GameVariantEnum.BENEDICT_CHESS]: 'Benedict',
};

export const GAME_VARIANT_LINKS: EachVariant<string> = {
  [GameVariantEnum.CHESS_960]: 'chess-960',
  [GameVariantEnum.CRAZYHOUSE]: 'crazyhouse',
  [GameVariantEnum.ATOMIC]: 'atomic-chess',
  [GameVariantEnum.KING_OF_THE_HILL]: 'king-of-the-hill',
  [GameVariantEnum.CIRCE]: 'circe',
  [GameVariantEnum.PATROL]: 'patrol',
  [GameVariantEnum.MADRASI]: 'madrasi',
  [GameVariantEnum.ALICE_CHESS]: 'alice-chess',
  [GameVariantEnum.TWO_FAMILIES]: 'two-families',
  [GameVariantEnum.DARK_CHESS]: 'dark-chess',
  [GameVariantEnum.ANTICHESS]: 'antichess',
  [GameVariantEnum.ABSORPTION]: 'absorption',
  [GameVariantEnum.FRANKFURT]: 'frankfurt',
  [GameVariantEnum.CAPABLANCA]: 'capablanca',
  [GameVariantEnum.THREE_CHECK]: 'three-check',
  [GameVariantEnum.CYLINDER_CHESS]: 'cylinder-chess',
  [GameVariantEnum.CIRCULAR_CHESS]: 'circular-chess',
  [GameVariantEnum.HEXAGONAL_CHESS]: 'hexagonal-chess',
  [GameVariantEnum.COMPENSATION_CHESS]: 'compensation-chess',
  [GameVariantEnum.RETREAT_CHESS]: 'retreat-chess',
  [GameVariantEnum.BENEDICT_CHESS]: 'benedict-chess',
};

export const RESULT_REASON_NAMES: Record<ResultReasonEnum, string> = {
  [ResultReasonEnum.CHECKMATE]: 'checkmate',
  [ResultReasonEnum.KING_IN_THE_CENTER]: 'king in the center',
  [ResultReasonEnum.KING_EXPLODED]: 'king exploded',
  [ResultReasonEnum.KING_CAPTURED]: 'king captured',
  [ResultReasonEnum.KING_FLIPPED]: 'king flipped',
  [ResultReasonEnum.NO_MORE_PIECES]: 'no more pieces',
  [ResultReasonEnum.THREE_CHECKS]: 'three checks',
  [ResultReasonEnum.STALEMATE]: 'stalemate',
  [ResultReasonEnum.TIMEOUT]: 'time out',
  [ResultReasonEnum.SELF_TIMEOUT]: 'time out',
  [ResultReasonEnum.RESIGN]: 'opponent resigned',
  [ResultReasonEnum.AGREED_TO_DRAW]: 'players agreed to a draw',
  [ResultReasonEnum.INSUFFICIENT_MATERIAL]: 'insufficient material',
  [ResultReasonEnum.INSUFFICIENT_MATERIAL_AND_TIMEOUT]: 'insufficient material + time out',
  [ResultReasonEnum.THREEFOLD_REPETITION]: 'threefold repetition',
  [ResultReasonEnum.FIFTY_MOVE_RULE]: '50 move rule',
};

export const COLOR_NAMES: EachColor<string> = {
  [ColorEnum.WHITE]: 'White',
  [ColorEnum.BLACK]: 'Black',
};

export const GAME_STATUS_NAMES: Record<GameStatusEnum, string> = {
  [GameStatusEnum.ONGOING]: 'In progress',
  [GameStatusEnum.FINISHED]: 'Finished',
  [GameStatusEnum.ABORTED]: 'Aborted',
};

export const TIME_CONTROL_NAMES: Record<TimeControlEnum, string> = {
  [TimeControlEnum.NONE]: 'None',
  [TimeControlEnum.TIMER]: 'Real time',
  [TimeControlEnum.CORRESPONDENCE]: 'Correspondence',
};

export const SPEED_TYPE_NAMES: Record<SpeedType, string> = {
  [SpeedType.CORRESPONDENCE]: 'Correspondence',
  [SpeedType.CLASSICAL]: 'Classical',
  [SpeedType.RAPID]: 'Rapid',
  [SpeedType.BLITZ]: 'Blitz',
  [SpeedType.BULLET]: 'Bullet',
};

export const PIECES_WORTH: Record<'orthodox' | 'circular' | 'hexagonal', EachPieceType<number>> = {
  orthodox: {
    [PieceTypeEnum.KING]: 3,
    [PieceTypeEnum.AMAZON]: 12,
    [PieceTypeEnum.QUEEN]: 9,
    [PieceTypeEnum.EMPRESS]: 8,
    [PieceTypeEnum.CARDINAL]: 7,
    [PieceTypeEnum.ROOK]: 5,
    [PieceTypeEnum.BISHOP]: 3,
    [PieceTypeEnum.KNIGHT]: 3,
    [PieceTypeEnum.PAWN]: 1,
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
    [PieceTypeEnum.PAWN]: 1,
  },
  hexagonal: {
    [PieceTypeEnum.KING]: 4,
    [PieceTypeEnum.AMAZON]: 14,
    [PieceTypeEnum.QUEEN]: 11,
    [PieceTypeEnum.EMPRESS]: 11,
    [PieceTypeEnum.CARDINAL]: 7,
    [PieceTypeEnum.ROOK]: 8,
    [PieceTypeEnum.BISHOP]: 3,
    [PieceTypeEnum.KNIGHT]: 4,
    [PieceTypeEnum.PAWN]: 1,
  },
};

export const DEFAULT_RATING: GlickoRating = {
  r: 1500,
  rd: 350,
  vol: 0.06,
  lg: 0,
};
