import * as _ from 'lodash';

import {
  ColorEnum,
  DarkChessRevertableMove,
  DarkChessVisiblePiece,
  Dictionary,
  EachColor,
  Move,
  Piece,
  PieceBoardLocation,
  PieceLocationEnum,
} from 'shared/types';

import GameMovesUtils from './GameMovesUtils';

export default abstract class GameDarkChessUtils extends GameMovesUtils {
  colorMoves: EachColor<DarkChessRevertableMove[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: [],
  };
  visiblePieces: EachColor<readonly DarkChessVisiblePiece[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: [],
  };
  startingVisiblePieces: EachColor<readonly DarkChessVisiblePiece[]> = {
    [ColorEnum.WHITE]: [],
    [ColorEnum.BLACK]: [],
  };

  getVisiblePieces(forColor: ColorEnum): Piece[] {
    const visibleSquares = this.getVisibleSquares(forColor);

    return this.pieces.filter((piece) => (
      piece.color === forColor || (
        GameDarkChessUtils.isBoardPiece(piece)
        && visibleSquares.some(GameDarkChessUtils.equalToSquare(piece.location))
      )
    ));
  }

  registerAnyMove(move: Move, constructMoveNotation: boolean) {
    if (this.isDarkChess) {
      this.registerDarkChessMove(move, constructMoveNotation);
    } else {
      this.registerMove(move, constructMoveNotation);
    }
  }

  registerDarkChessMove(move: Move, constructMoveNotation: boolean) {
    const prevPieceLocations = this.pieces.map(({ location }) => location);
    const idMap = this.pieces.reduce<Dictionary<true>>((map, piece) => {
      map[piece.id] = true;

      return map;
    }, {});
    const prevVisibleSquares = {
      [ColorEnum.WHITE]: this.getVisibleSquares(ColorEnum.WHITE),
      [ColorEnum.BLACK]: this.getVisibleSquares(ColorEnum.BLACK),
    };

    const {
      movedPiece: piece,
      isWin,
      isCapture,
    } = this.registerMove(move, constructMoveNotation);

    const registeredMove = _.last(this.moves)!;
    const isPromotion = !!move.promotion;

    _.forEach(ColorEnum, (color) => {
      const isOwnMove = color === piece.color;
      const oldVisiblePieces = this.visiblePieces[color];
      const newVisiblePieces = this.getVisiblePieces(color);
      const visibleSquares = this.getVisibleSquares(color);

      const newPieces = newVisiblePieces.map((piece) => {
        const isOwnPiece = piece.color === color;
        const oldPiece = oldVisiblePieces.find(({ realId }) => realId === piece.id);
        const prevPieceLocation = prevPieceLocations[this.pieces.findIndex(({ id }) => id === piece.id)];
        const oldLocationVisible = (
          !!prevPieceLocation
          && prevPieceLocation.type === PieceLocationEnum.BOARD
          && prevVisibleSquares[color].some(GameDarkChessUtils.equalToSquare(prevPieceLocation))
          && visibleSquares.some(GameDarkChessUtils.equalToSquare(prevPieceLocation))
        );
        const newLocationVisible = (
          GameDarkChessUtils.isBoardPiece(piece)
          && visibleSquares.some(GameDarkChessUtils.equalToSquare(piece.location))
        );
        const newId = oldPiece && (isOwnPiece || (oldLocationVisible && newLocationVisible))
          ? oldPiece.id
          : GameDarkChessUtils.generateUid(idMap);

        return {
          ...piece,
          moved: isOwnPiece && piece.moved,
          id: newId,
          realId: piece.id,
        };
      });
      const fromLocationVisible = (
        move.from.type === PieceLocationEnum.BOARD
        && prevVisibleSquares[color].some(GameDarkChessUtils.equalToSquare(move.from))
        && visibleSquares.some(GameDarkChessUtils.equalToSquare(move.from))
      );
      const toLocationVisible = visibleSquares.some(GameDarkChessUtils.equalToSquare(move.to));
      let notation = '';

      if (isOwnMove) {
        notation = registeredMove.notation;
      } else if (fromLocationVisible || toLocationVisible || isCapture) {
        if (fromLocationVisible || toLocationVisible) {
          notation += GameDarkChessUtils.getPieceLiteral(piece.type);
        }

        if (fromLocationVisible) {
          const {
            x: fromX,
            y: fromY,
          } = move.from as PieceBoardLocation;
          const fileLiteral = GameDarkChessUtils.getFileLiteral(fromX);
          const rankLiteral = GameDarkChessUtils.getRankLiteral(fromY);
          const fromLocationLiteral = fileLiteral + rankLiteral;

          notation += fromLocationLiteral;
        } else {
          notation += '?';
        }

        if (isCapture) {
          notation += 'x';
        }

        if (toLocationVisible || isCapture) {
          const {
            x: toX,
            y: toY,
          } = move.to;
          const fileLiteral = GameDarkChessUtils.getFileLiteral(toX);
          const rankLiteral = GameDarkChessUtils.getRankLiteral(toY);
          const toLocationLiteral = fileLiteral + rankLiteral;

          notation += toLocationLiteral;
        } else {
          notation += '?';
        }

        const promotionVisible = (
          isPromotion
          && fromLocationVisible
          && (!this.isHexagonalChess || toLocationVisible)
        );

        if (promotionVisible) {
          notation += `=${toLocationVisible ? GameDarkChessUtils.getPieceLiteral(move.promotion!) : '?'}`;
        }

        if (isWin) {
          notation += '#';
        }
      } else {
        notation = '?';
      }

      this.visiblePieces[color] = newPieces;

      this.colorMoves[color].push({
        ...move,
        from: fromLocationVisible ? move.from : null,
        to: toLocationVisible || isCapture ? move.to : null,
        notation,
        isCapture,
        pieces: newPieces.map((piece) => _.omit(piece, 'realId')),
        prevPiecesWorth: this.isFrankfurt || this.isAbsorption || this.isAtomic || this.isCirce
          ? { [ColorEnum.WHITE]: 0, [ColorEnum.BLACK]: 0 }
          : registeredMove.prevPiecesWorth,
        timeBeforeMove: registeredMove.timeBeforeMove,
        revertMove: () => {
          this.visiblePieces[color] = oldVisiblePieces;
        },
      });
    });
  }

  setupStartingData() {
    super.setupStartingData();

    if (this.isDarkChess) {
      _.forEach(ColorEnum, (color) => {
        this.visiblePieces[color] = this.startingVisiblePieces[color] = this.getVisiblePieces(color).map((piece) => ({
          ...piece,
          realId: piece.id,
        }));
      });
    }
  }
}
