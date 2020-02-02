import * as _ from 'lodash';

import GameStartingDataUtils from './GameStartingDataUtils';
import { BoardPiece, CastlingTypeEnum, ColorEnum, GameCreateOptions, PieceLocationEnum, Square } from '../../types';

type CastlingRookCoordinates = Record<CastlingTypeEnum, Square | null>;

export default abstract class GameCastlingUtils extends GameStartingDataUtils {
  castlingRookCoordinates: Record<ColorEnum, CastlingRookCoordinates>;

  protected constructor(options: GameCreateOptions) {
    super(options);

    this.castlingRookCoordinates = {
      [ColorEnum.WHITE]: this.getCastlingRookCoordinates(ColorEnum.WHITE),
      [ColorEnum.BLACK]: this.getCastlingRookCoordinates(ColorEnum.BLACK)
    };
  }

  getCastlingRookCoordinates(color: ColorEnum): CastlingRookCoordinates {
    let rookCoordinates: CastlingRookCoordinates = {
      [CastlingTypeEnum.QUEEN_SIDE]: null,
      [CastlingTypeEnum.KING_SIDE]: null
    };
    const castlingRank = color === ColorEnum.WHITE
      ? 0
      : this.boardHeight - 1;

    if (this.is960) {
      const rooksOnTheCastlingRank = this.startingData.pieces.filter((piece) => (
        piece.color === color
        && GameCastlingUtils.isRook(piece)
        && piece.location.type === PieceLocationEnum.BOARD
        && piece.location.y === castlingRank
      )) as BoardPiece[];

      if (rooksOnTheCastlingRank.length > 1) {
        rookCoordinates = {
          [CastlingTypeEnum.QUEEN_SIDE]: rooksOnTheCastlingRank[0].location,
          [CastlingTypeEnum.KING_SIDE]: _.last(rooksOnTheCastlingRank)!.location
        };
      } else if (rooksOnTheCastlingRank.length === 1) {
        const kingOnTheCastlingRank = this.startingData.pieces.find((piece) => (
          piece.color === color
          && GameCastlingUtils.isKing(piece)
          && piece.location.type === PieceLocationEnum.BOARD
          && piece.location.y === castlingRank
        )) as BoardPiece | undefined;

        if (kingOnTheCastlingRank) {
          const castlingRook = rooksOnTheCastlingRank[0];

          if (castlingRook.location.x > kingOnTheCastlingRank.location.x) {
            rookCoordinates = {
              [CastlingTypeEnum.QUEEN_SIDE]: null,
              [CastlingTypeEnum.KING_SIDE]: castlingRook.location
            };
          } else {
            rookCoordinates = {
              [CastlingTypeEnum.QUEEN_SIDE]: castlingRook.location,
              [CastlingTypeEnum.KING_SIDE]: null
            };
          }
        }
      }
    } else {
      rookCoordinates = {
        [CastlingTypeEnum.QUEEN_SIDE]: {
          board: 0,
          x: 0,
          y: castlingRank
        },
        [CastlingTypeEnum.KING_SIDE]: {
          board: 0,
          x: this.boardWidth - 1,
          y: castlingRank
        }
      };
    }

    return rookCoordinates;
  }

  getCastlingRooks(color: ColorEnum): Record<CastlingTypeEnum, BoardPiece | null> {
    const getRook = (square: Square | null): BoardPiece | null => {
      const pieceInSquare = square && this.getBoardPiece(square);

      return pieceInSquare && !pieceInSquare.moved
        ? pieceInSquare
        : null;
    };

    return {
      [CastlingTypeEnum.QUEEN_SIDE]: getRook(this.castlingRookCoordinates[color][CastlingTypeEnum.QUEEN_SIDE]),
      [CastlingTypeEnum.KING_SIDE]: getRook(this.castlingRookCoordinates[color][CastlingTypeEnum.KING_SIDE])
    };
  }
}
