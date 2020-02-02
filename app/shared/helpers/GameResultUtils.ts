import * as _ from 'lodash';

import GameDarkChessUtils from './GameDarkChessUtils';
import { ColorEnum, GameCreateOptions, GameResult, GameStatusEnum, ResultReasonEnum } from '../../types';

export default class GameResultUtils extends GameDarkChessUtils {
  status: GameStatusEnum = GameStatusEnum.BEFORE_START;
  result: GameResult | null;

  constructor(options: GameCreateOptions) {
    super(options);

    this.result = this.startingData.result;
  }

  end(winner: ColorEnum | null, reason: ResultReasonEnum) {
    this.result = {
      winner,
      reason
    };
    this.status = GameStatusEnum.FINISHED;
  }

  isCheckmate(): boolean {
    return this.isCheck && this.isNoMoves();
  }

  isDraw(): ResultReasonEnum | null {
    if (
      this.isAntichess
      && this.isNoPieces(this.turn)
      && this.isNoPieces(this.getNextTurn())
    ) {
      return ResultReasonEnum.NO_MORE_PIECES;
    }

    if (this.isStalemate()) {
      return ResultReasonEnum.STALEMATE;
    }

    if (this.isInsufficientMaterial()) {
      return ResultReasonEnum.INSUFFICIENT_MATERIAL;
    }

    if (this.pliesWithoutCaptureOrPawnMove >= 100) {
      return ResultReasonEnum.FIFTY_MOVE_RULE;
    }

    if (this.positionsMap[this.positionString] === 3) {
      return ResultReasonEnum.THREEFOLD_REPETITION;
    }

    return null;
  }

  isInsufficientMaterial(): boolean {
    if (
      !this.isAntichess && (
        this.isKingOfTheHill
        || this.isMonsterChess
        || this.isHorde
        || this.isDarkChess
        || this.isCrazyhouse
      )
    ) {
      return false;
    }

    // TODO: add support for absorption/frankfurt

    const whitePieces = this.getPieces(ColorEnum.WHITE);
    const blackPieces = this.getPieces(ColorEnum.BLACK);
    const pieces = _
      .sortBy([
        whitePieces,
        blackPieces
      ], 'length')
      .map((pieces) => (
        pieces.filter(GameResultUtils.isBoardPiece)
      ));

    if (this.isAntichess) {
      const possibleBishopColors = pieces.map(([piece]) => (
        piece
          ? piece.location.x % 2 + piece.location.y % 2
          : 0.5
      ));

      return (
        possibleBishopColors[0] !== possibleBishopColors[1]
        && pieces.every((pieces, index) => (
          pieces.every((piece) => (
            GameResultUtils.isBishop(piece)
            && piece.location.x % 2 + piece.location.y % 2 === possibleBishopColors[index]
          ))
        ))
      );
    }

    if (
      // king vs king
      pieces[0].length === 1
      && pieces[1].length === 1
    ) {
      return true;
    }

    if (this.isPatrol) {
      return false;
    }

    if (
      // kings vs kings
      pieces[0].every(GameResultUtils.isKing)
      && pieces[1].every(GameResultUtils.isKing)
    ) {
      return true;
    }

    if (this.isAtomic || this.isMadrasi || this.isThreeCheck) {
      return false;
    }

    if (
      // king vs king & knight
      pieces[0].length === 1
      && pieces[1].length === 2
      && GameResultUtils.isKnight(pieces[1][1])
    ) {
      return true;
    }

    const possibleBishopColor = pieces[1][1].location.x % 2 + pieces[1][1].location.y % 2;

    return pieces.every((pieces) => (
      pieces.slice(1).every((piece) => (
        GameResultUtils.isBishop(piece)
        && piece.location.x % 2 + piece.location.y % 2 === possibleBishopColor
      ))
    ));
  }

  isOngoing(): boolean {
    return this.status === GameStatusEnum.ONGOING;
  }

  isStalemate(): boolean {
    return !this.isCheck && this.isNoMoves();
  }

  isWin(): GameResult | null {
    const prevTurn = this.getPrevTurn();
    const currentTurn = this.turn;
    const nextTurn = this.getNextTurn();

    if (this.isCheckmate()) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.CHECKMATE
      };
    }

    if (this.isKingOfTheHill && this.isKingInTheCenter(prevTurn)) {
      return {
        winner: this.isAntichess
          ? currentTurn
          : prevTurn,
        reason: ResultReasonEnum.KING_IN_THE_CENTER
      };
    }

    if (this.isAtomic && !this.isAntichess && !this.areKingsOnTheBoard(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_EXPLODED
      };
    }

    if ((this.isMonsterChess || this.isDarkChess) && !this.isAntichess && !this.areKingsOnTheBoard(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.KING_CAPTURED
      };
    }

    if (this.isMonsterChess && !this.areKingsOnTheBoard(nextTurn)) {
      return {
        winner: currentTurn,
        reason: ResultReasonEnum.KING_CAPTURED
      };
    }

    if ((this.isHorde || this.isAmazons) && currentTurn === ColorEnum.WHITE && this.isNoPieces(ColorEnum.WHITE)) {
      return {
        winner: prevTurn,
        reason: this.isHorde
          ? ResultReasonEnum.HORDE_DESTROYED
          : ResultReasonEnum.AMAZONS_DESTROYED
      };
    }

    if (this.isThreeCheck && this.checksCount[prevTurn] === 3) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.THREE_CHECKS
      };
    }

    if (this.isAntichess && this.isNoPieces(prevTurn) && !this.isNoPieces(currentTurn)) {
      return {
        winner: prevTurn,
        reason: ResultReasonEnum.NO_MORE_PIECES
      };
    }

    if (this.isAntichess && this.isStalemate() && !this.isNoPieces(nextTurn)) {
      return {
        winner: currentTurn,
        reason: this.isNoPieces(currentTurn)
          ? ResultReasonEnum.NO_MORE_PIECES
          : ResultReasonEnum.STALEMATE
      };
    }

    return null;
  }
}
