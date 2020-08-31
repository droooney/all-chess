import {
  ColorEnum,
  GameCreateOptions,
  GameResult,
  GameStatusEnum,
  ResultReasonEnum,
  SquareColor,
} from 'shared/types';

import GameDarkChessUtils from './GameDarkChessUtils';

export default abstract class GameResultUtils extends GameDarkChessUtils {
  status: GameStatusEnum;
  result: GameResult | null = null;

  protected constructor(options: GameCreateOptions) {
    super(options);

    this.status = options.status;
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    this.result = {
      winner,
      reason,
    };
    this.status = GameStatusEnum.FINISHED;
  }

  hasSufficientMaterialForWin(color: ColorEnum): boolean {
    if (
      this.isCrazyhouse
      || this.isAbsorption
      || this.isFrankfurt
      || (
        !this.isAntichess && (
          this.isKingOfTheHill
          || this.isDarkChess
        )
      )
    ) {
      return true;
    }

    const pieces = this.getBoardPieces(color);
    const opponentPieces = this.getBoardPieces(GameResultUtils.getOppositeColor(color));

    if (this.isAntichess) {
      return (
        opponentPieces.some((piece) => !GameResultUtils.isBishop(piece))
        || pieces.every((piece) => {
          if (!GameResultUtils.isBishop(piece)) {
            return true;
          }

          const squareColor = this.getSquareColor(piece.location);

          return opponentPieces.some(({ location }) => this.getSquareColor(location) === squareColor);
        })
      );
    }

    if (pieces.length === 1) {
      return false;
    }

    if (this.isPatrol) {
      return true;
    }

    if (pieces.every(GameResultUtils.isKing)) {
      return false;
    }

    if (this.isAtomic || this.isMadrasi || this.isThreeCheck) {
      return true;
    }

    if (this.isCylinderChess || this.isCircularChess) {
      const possibleBishopColor = this.getSquareColor(pieces[1].location);
      let pieceCount = pieces.length;

      if (
        pieces.slice(1).every((piece) => (
          GameResultUtils.isBishop(piece)
          && this.getSquareColor(piece.location) === possibleBishopColor
        ))
      ) {
        pieceCount = 2;
      }

      if (pieceCount >= 3) {
        // TODO: finish this segment

        return true;
      }

      const secondPiece = pieces[1];

      if (
        GameResultUtils.isAmazon(secondPiece)
        || GameResultUtils.isQueen(secondPiece)
        || GameResultUtils.isEmpress(secondPiece)
        || GameResultUtils.isCardinal(secondPiece)
        || GameResultUtils.isRook(secondPiece)
        || GameResultUtils.isPawn(secondPiece)
      ) {
        return true;
      }

      if (GameResultUtils.isKnight(secondPiece)) {
        return (
          opponentPieces.length >= 3
          && opponentPieces.some((piece) => (
            GameResultUtils.isPawn(piece)
            || GameResultUtils.isKnight(piece)
            || GameResultUtils.isRook(piece)
          ))
        );
      }

      if (GameResultUtils.isBishop(secondPiece)) {
        return (
          opponentPieces.length > (pieces.length > 2 ? 2 : 3)
          && opponentPieces.some((piece) => (
            GameResultUtils.isPawn(piece)
            || GameResultUtils.isKnight(piece)
          ))
        );
      }

      return true;
    }

    if (this.isHexagonalChess) {
      return opponentPieces.length >= 2
        ? (
          pieces.slice(1).some((piece) => (
            !GameResultUtils.isBishop(piece)
            || this.getSquareColor(piece.location) !== SquareColor.HALF_DARK
          ))
          || opponentPieces.some((piece) => (
            GameResultUtils.isBishop(piece)
            && this.getSquareColor(piece.location) !== SquareColor.HALF_DARK
          ))
        )
        : pieces.some((piece) => (
          GameResultUtils.isAmazon(piece)
          || GameResultUtils.isQueen(piece)
          || GameResultUtils.isEmpress(piece)
          || GameResultUtils.isCardinal(piece)
          || GameResultUtils.isRook(piece)
        ));
    }

    const possibleBishopColor = this.getSquareColor(pieces[1].location);
    let pieceCount = pieces.length;

    if (
      pieces.slice(1).every((piece) => (
        GameResultUtils.isBishop(piece)
        && this.getSquareColor(piece.location) === possibleBishopColor
      ))
    ) {
      pieceCount = 2;
    }

    if (pieceCount >= 3) {
      return true;
    }

    const secondPiece = pieces[1];

    if (
      GameResultUtils.isAmazon(secondPiece)
      || GameResultUtils.isQueen(secondPiece)
      || GameResultUtils.isEmpress(secondPiece)
      || GameResultUtils.isCardinal(secondPiece)
      || GameResultUtils.isRook(secondPiece)
      || GameResultUtils.isPawn(secondPiece)
    ) {
      return true;
    }

    if (GameResultUtils.isKnight(secondPiece)) {
      return opponentPieces.some((piece) => (
        GameResultUtils.isPawn(piece)
        || GameResultUtils.isKnight(piece)
        || GameResultUtils.isBishop(piece)
        || GameResultUtils.isRook(piece)
      ));
    }

    if (GameResultUtils.isBishop(secondPiece)) {
      const bishopColor = this.getSquareColor(secondPiece.location);

      return opponentPieces.some((piece) => (
        GameResultUtils.isPawn(piece)
        || GameResultUtils.isKnight(piece)
        || (GameResultUtils.isBishop(piece) && this.getSquareColor(piece.location) === bishopColor)
        || GameResultUtils.isCardinal(piece)
      ));
    }

    return true;
  }

  isAborted(): boolean {
    return this.status === GameStatusEnum.ABORTED;
  }

  isCheckmate(): boolean {
    return this.isCheck && this.isNoMoves();
  }

  isDraw(): ResultReasonEnum | null {
    if (
      this.isAntichess
      && this.isNoPieces(this.turn)
      && this.isNoPieces(this.getOpponentColor())
    ) {
      return ResultReasonEnum.NO_MORE_PIECES;
    }

    if (this.isStalemate()) {
      return ResultReasonEnum.STALEMATE;
    }

    if (
      !this.hasSufficientMaterialForWin(ColorEnum.WHITE)
      && !this.hasSufficientMaterialForWin(ColorEnum.BLACK)
    ) {
      return ResultReasonEnum.INSUFFICIENT_MATERIAL;
    }

    if (this.pliesFor50MoveRule >= 100 && this.is50MoveRuleUsed) {
      return ResultReasonEnum.FIFTY_MOVE_RULE;
    }

    if (this.positionsMap[this.positionString] === 3) {
      return ResultReasonEnum.THREEFOLD_REPETITION;
    }

    return null;
  }

  isFinished(): boolean {
    return this.status === GameStatusEnum.FINISHED;
  }

  isOngoing(): boolean {
    return this.status === GameStatusEnum.ONGOING;
  }

  isStalemate(): boolean {
    return !this.isCheck && this.isNoMoves();
  }

  isWin(): GameResult | null {
    const prevTurn = this.getOpponentColor();
    const currentTurn = this.turn;

    if (this.isCheckmate()) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.CHECKMATE,
      };
    }

    if (this.isKingOfTheHill && this.isKingInTheCenter(prevTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_IN_THE_CENTER,
      };
    }

    if (this.isAtomic && !this.isAntichess && !this.areKingsOnTheBoard(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_EXPLODED,
      };
    }

    if (this.isDarkChess && !this.isAntichess && !this.areKingsOnTheBoard(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_CAPTURED,
      };
    }

    if (this.isThreeCheck && this.checksCount[prevTurn] === 3) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.THREE_CHECKS,
      };
    }

    if (this.isAntichess && this.isNoPieces(prevTurn) && !this.isNoPieces(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.NO_MORE_PIECES,
      };
    }

    if (this.isAntichess && this.isStalemate() && !this.isNoPieces(prevTurn)) {
      return {
        winner: currentTurn,
        reason: this.isNoPieces(currentTurn)
          ? ResultReasonEnum.NO_MORE_PIECES
          : ResultReasonEnum.STALEMATE,
      };
    }

    if (this.isBenedictChess && this.kings[this.turn].some(({ color }) => color !== this.turn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_FLIPPED,
      };
    }

    return null;
  }
}
