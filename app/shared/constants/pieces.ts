import { PieceEnum } from '../../types';

export const SHORT_PIECE_NAMES: { [piece in PieceEnum]: string } = {
  [PieceEnum.KING]: 'K',
  [PieceEnum.QUEEN]: 'Q',
  [PieceEnum.ROOK]: 'R',
  [PieceEnum.BISHOP]: 'B',
  [PieceEnum.KNIGHT]: 'N',
  [PieceEnum.PAWN]: ''
};
