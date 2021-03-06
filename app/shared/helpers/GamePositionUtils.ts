import last from 'lodash/last';
import times from 'lodash/times';

import {
  BoardPiece,
  CastlingTypeEnum,
  ChecksCount,
  ColorEnum,
  Dictionary,
  GameVariantEnum,
  PieceLocationEnum,
  PieceTypeEnum,
  PossibleEnPassant,
  RealPiece,
  RealPieceLocation,
  StartingData,
} from 'shared/types';

import GameCastlingUtils from './GameCastlingUtils';

const FEN_DIGITS_REGEX = /^\d+$/;
const FEN_CASTLING_REGEX = /^[kq]+$/i;
const FEN_CHECKS_COUNT_REGEX = /^\+([0-3])\+([0-3])$/i;
const FEN_SQUARE_REGEX = /^[a-w]\d+$/;
const FEN_PIECE_REGEX = /^([a-w])(~)?(!)?/i;

export default abstract class GamePositionUtils extends GameCastlingUtils {
  static getStartingDataFromFen(fen: string, variants: readonly GameVariantEnum[]): StartingData {
    const {
      boardCount,
      boardWidth,
      boardHeight,
    } = GamePositionUtils.getBoardDimensions(variants);
    const startingData: StartingData = {
      possibleCastling: {
        [ColorEnum.WHITE]: {
          [CastlingTypeEnum.KING_SIDE]: false,
          [CastlingTypeEnum.QUEEN_SIDE]: false,
        },
        [ColorEnum.BLACK]: {
          [CastlingTypeEnum.KING_SIDE]: false,
          [CastlingTypeEnum.QUEEN_SIDE]: false,
        },
      },
      possibleEnPassant: null,
      checksCount: {
        [ColorEnum.WHITE]: 0,
        [ColorEnum.BLACK]: 0,
      },
      turn: ColorEnum.WHITE,
      startingMoveIndex: 0,
      pliesFor50MoveRule: 0,
      pieces: [],
    };
    const isPocketUsed = GamePositionUtils.getIsPocketUsed(variants);
    const {
      isAntichess,
      isCircularChess,
      isCylinderChess,
      isDarkChess,
      isHexagonalChess,
      isThreeCheck,
    } = GamePositionUtils.getVariantsInfo(variants);
    const fenData = fen.trim().split(/\s+/);
    const boards = fenData.slice(0, boardCount);

    // 5 is turn, possible castling, possible en passant, pliesFor50MoveRule, startingMoveIndex
    // 1 for checks count in three-check
    if (fenData.length !== boardCount + 5 + (isThreeCheck ? 1 : 0)) {
      throw new Error('Invalid FEN: wrong text blocks count');
    }

    const [
      turnString,
      possibleCastlingString,
      possibleEnPassantString,
      pliesFor50MoveRuleString,
      startingMoveIndexString,
      checksCount,
    ] = fenData.slice(boardCount);

    if (turnString !== 'w' && turnString !== 'b') {
      throw new Error('Invalid FEN: wrong turn');
    }

    startingData.turn = turnString === 'b' ? ColorEnum.BLACK : ColorEnum.WHITE;

    if (possibleCastlingString !== '-' && !FEN_CASTLING_REGEX.test(possibleCastlingString)) {
      throw new Error('Invalid FEN: wrong castling block');
    }

    if (possibleCastlingString !== '-' && !isAntichess && !isCylinderChess) {
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.KING_SIDE] = possibleCastlingString.includes('K');
      startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.QUEEN_SIDE] = possibleCastlingString.includes('Q');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.KING_SIDE] = possibleCastlingString.includes('k');
      startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.QUEEN_SIDE] = possibleCastlingString.includes('q');
    }

    if (possibleEnPassantString !== '-') {
      if (isDarkChess) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      if (!FEN_SQUARE_REGEX.test(possibleEnPassantString)) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      const enPassantSquare = GamePositionUtils.getSquare(possibleEnPassantString);

      startingData.possibleEnPassant = {
        enPassantSquare,
        pieceLocation: {
          board: 0,
          x: enPassantSquare.x,
          y: startingData.turn === ColorEnum.WHITE
            ? isCircularChess && enPassantSquare.y >= boardHeight / 2
              ? enPassantSquare.y + 1
              : enPassantSquare.y - 1
            : isCircularChess && enPassantSquare.y >= boardHeight / 2
              ? enPassantSquare.y - 1
              : enPassantSquare.y + 1,
        },
      };
    }

    if (!FEN_DIGITS_REGEX.test(pliesFor50MoveRuleString)) {
      throw new Error('Invalid FEN: wrong plies without capture or pawn move count');
    }

    startingData.pliesFor50MoveRule = +pliesFor50MoveRuleString;

    if (startingMoveIndexString === '0' || !FEN_DIGITS_REGEX.test(startingMoveIndexString)) {
      throw new Error('Invalid FEN: wrong starting move index');
    }

    const startingMoveIndexNumber = +startingMoveIndexString - 1;

    startingData.startingMoveIndex = 2 * startingMoveIndexNumber + (turnString === 'b' ? 1 : 0);

    let id = 0;
    const pieces: RealPiece[] = [];
    const addPiece = (
      color: ColorEnum,
      type: PieceTypeEnum,
      location: RealPieceLocation,
      originalType: PieceTypeEnum,
      abilities: PieceTypeEnum | null,
    ) => {
      pieces.push({
        id: `${++id}`,
        type,
        originalType,
        color,
        moved: false,
        abilities,
        location,
      } as RealPiece);
    };

    for (let board = 0; board < boards.length; board++) {
      const ranks = boards[board].split('/').reverse();
      const ranksCount = isPocketUsed && board === 0 ? boardHeight + 1 : boardHeight;

      if (ranks.length !== ranksCount) {
        throw new Error(`Invalid FEN: wrong ranks blocks count on board ${board}`);
      }

      for (let rank = 0; rank < boardHeight; rank++) {
        const fileData = ranks[rank + ranksCount - boardHeight];
        let file = isHexagonalChess && rank > 5 ? rank - 5 : 0;
        let string = fileData;

        // TODO: fix piece parsing for absorption/frankfurt

        while (string) {
          const emptySquaresMatch = string.match(/^\d+/);

          if (emptySquaresMatch) {
            file += +emptySquaresMatch[0];
            string = string.slice(emptySquaresMatch[0].length);
          } else {
            const pieceMatch = string.match(FEN_PIECE_REGEX);

            if (!pieceMatch) {
              throw new Error(`Invalid FEN: wrong piece literal (${string[0]})`);
            }

            const [pieceString, pieceLiteral, isPawnOriginally, isRoyal] = pieceMatch;
            const piece = GamePositionUtils.getPieceFromLiteral(pieceLiteral);

            if (!piece) {
              throw new Error(`Invalid FEN: wrong piece literal (${pieceLiteral})`);
            }

            let pieceType = piece.type;
            let originalPieceType = pieceType;
            let abilities: PieceTypeEnum | null = null;

            if (isPawnOriginally) {
              originalPieceType = PieceTypeEnum.PAWN;
            }

            if (isRoyal) {
              abilities = pieceType;
              pieceType = PieceTypeEnum.KING;
            }

            addPiece(
              piece.color,
              pieceType,
              {
                type: PieceLocationEnum.BOARD,
                board,
                x: file,
                y: rank,
              },
              originalPieceType,
              abilities,
            );

            file += 1;
            string = string.slice(pieceString.length);
          }
        }

        if (file !== (isHexagonalChess && rank > 5 ? boardWidth - (rank - 5) : boardWidth)) {
          throw new Error('Invalid FEN: wrong files count in a rank');
        }
      }

      if (ranksCount !== boardHeight) {
        const pocket = ranks[0];

        for (let pieceIndex = 0; pieceIndex < pocket.length; pieceIndex++) {
          const piece = GamePositionUtils.getPieceFromLiteral(pocket[pieceIndex]);

          if (!piece) {
            throw new Error(`Invalid FEN: wrong pocket piece literal (${pocket[pieceIndex]})`);
          }

          addPiece(
            piece.color,
            piece.type,
            {
              type: PieceLocationEnum.POCKET,
              pieceType: piece.type,
              color: piece.color,
            },
            piece.type,
            null,
          );
        }
      }
    }

    if (startingData.possibleEnPassant) {
      // TODO: validate en passant (turn and color)
      // TODO: validate file, rank (don't forget about hex)

      const enPassantPieceLocation = startingData.possibleEnPassant.pieceLocation;
      const enPassantPiece = pieces.find((piece) => (
        GamePositionUtils.isPawn(piece)
        && GamePositionUtils.isBoardPiece(piece)
        && GamePositionUtils.areSquaresEqual(piece.location, enPassantPieceLocation, false)
      )) as BoardPiece | undefined;

      if (!enPassantPiece) {
        throw new Error('Invalid FEN: wrong en passant');
      }

      startingData.possibleEnPassant = {
        enPassantSquare: {
          ...startingData.possibleEnPassant.enPassantSquare,
          board: enPassantPiece.location.board,
        },
        pieceLocation: {
          ...startingData.possibleEnPassant.pieceLocation,
          board: enPassantPiece.location.board,
        },
      };
    }

    if (isThreeCheck) {
      const checksCountMatch = checksCount.match(FEN_CHECKS_COUNT_REGEX);

      if (!checksCountMatch) {
        throw new Error('Invalid FEN: wrong checks count');
      }

      startingData.checksCount[ColorEnum.WHITE] = +checksCountMatch[1];
      startingData.checksCount[ColorEnum.BLACK] = +checksCountMatch[2];
    }

    startingData.pieces = pieces;

    return startingData;
  }

  abstract pliesCount: number;

  checksCount: ChecksCount = {
    [ColorEnum.WHITE]: 0,
    [ColorEnum.BLACK]: 0,
  };
  isCheck: boolean = false;
  pliesFor50MoveRule: number = 0;
  possibleEnPassant: PossibleEnPassant | null = null;

  positionsMap: Dictionary<number> = {};
  positionString: string = '';

  getFen(): string {
    const piecesFen = this.getFenPieces();
    const castlingFen = this.getFenPossibleCastling();
    const turnFen = this.getFenTurn();
    const enPassantFen = this.getFenEnPassant();
    const pliesCountFen = this.pliesFor50MoveRule;
    const moveIndexFen = Math.floor(this.pliesCount / 2) + 1;
    const checksCountFen = this.getFenChecksCount();

    return `${piecesFen} ${turnFen} ${castlingFen} ${enPassantFen} ${pliesCountFen} ${moveIndexFen}${checksCountFen}`;
  }

  getFenChecksCount(): string {
    if (!this.isThreeCheck) {
      return '';
    }

    return ` +${this.checksCount[ColorEnum.WHITE]}+${this.checksCount[ColorEnum.BLACK]}`;
  }

  getFenEnPassant(): string {
    return this.possibleEnPassant
      ? (
        GamePositionUtils.getFileLiteral(this.possibleEnPassant.enPassantSquare.x)
        + GamePositionUtils.getRankLiteral(this.possibleEnPassant.enPassantSquare.y)
      )
      : '-';
  }

  getFenPieces(): string {
    return times(this.boardCount, (board) => (
      times(this.boardHeight, (y) => {
        let rankString = '';
        let emptySpaces = 0;
        const putEmptySpacesIfNeeded = () => {
          if (emptySpaces) {
            rankString += emptySpaces;
            emptySpaces = 0;
          }
        };

        times(this.boardWidth, (x) => {
          const square = { board, x, y };

          if (this.isEmptySquare(square)) {
            return;
          }

          const pieceInSquare = this.getBoardPiece(square);

          if (pieceInSquare) {
            putEmptySpacesIfNeeded();

            const pieceLiteral = GamePositionUtils.getPieceLiteral(
              pieceInSquare.abilities || pieceInSquare.type,
            );

            rankString += pieceInSquare.color === ColorEnum.WHITE
              ? pieceLiteral
              : pieceLiteral.toLowerCase();

            if (
              this.isCrazyhouse
              && pieceInSquare.originalType === PieceTypeEnum.PAWN
              && !GamePositionUtils.isPawn(pieceInSquare)
            ) {
              rankString += '~';
            } else if (
              this.isFrankfurt
              && GamePositionUtils.isKing(pieceInSquare)
              && pieceInSquare.abilities
            ) {
              rankString += '!';
            }
          } else {
            emptySpaces++;
          }
        });

        putEmptySpacesIfNeeded();

        return rankString;
      })
        .reverse()
        .join('/')
      + (
        board === 0 && this.isPocketUsed ? `/${
          this.pieces
            .filter(GamePositionUtils.isPocketPiece)
            .map((piece) => {
              const pieceLiteral = GamePositionUtils.getPieceLiteral(piece.type);

              return piece.color === ColorEnum.WHITE
                ? pieceLiteral
                : pieceLiteral.toLowerCase();
            })
            .join('')
        }` : ''
      )
    )).join(' ');
  }

  getFenPossibleCastling(): string {
    const whiteCastlingRooks = this.getCastlingRooks(ColorEnum.WHITE);
    const blackCastlingRooks = this.getCastlingRooks(ColorEnum.BLACK);
    const whiteQueenSideKing = this.kings[ColorEnum.WHITE][0];
    const whiteKingSideKing = last(this.kings[ColorEnum.WHITE]);
    const blackQueenSideKing = this.kings[ColorEnum.BLACK][0];
    const blackKingSideKing = last(this.kings[ColorEnum.BLACK]);
    const whiteQueenSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.QUEEN_SIDE]
      && !!whiteQueenSideKing
      && !whiteQueenSideKing.moved
      && !!whiteCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]
      && !whiteCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]!.moved
    );
    const whiteKingSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.WHITE][CastlingTypeEnum.KING_SIDE]
      && !!whiteKingSideKing
      && !whiteKingSideKing.moved
      && !!whiteCastlingRooks[CastlingTypeEnum.KING_SIDE]
      && !whiteCastlingRooks[CastlingTypeEnum.KING_SIDE]!.moved
    );
    const blackQueenSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.QUEEN_SIDE]
      && !!blackQueenSideKing
      && !blackQueenSideKing.moved
      && !!blackCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]
      && !blackCastlingRooks[CastlingTypeEnum.QUEEN_SIDE]!.moved
    );
    const blackKingSideCastlingPossible = (
      this.startingData.possibleCastling[ColorEnum.BLACK][CastlingTypeEnum.KING_SIDE]
      && !!blackKingSideKing
      && !blackKingSideKing.moved
      && !!blackCastlingRooks[CastlingTypeEnum.KING_SIDE]
      && !blackCastlingRooks[CastlingTypeEnum.KING_SIDE]!.moved
    );
    let castlingString = '';

    if (whiteKingSideCastlingPossible) {
      castlingString += 'K';
    }

    if (whiteQueenSideCastlingPossible) {
      castlingString += 'Q';
    }

    if (blackKingSideCastlingPossible) {
      castlingString += 'k';
    }

    if (blackQueenSideCastlingPossible) {
      castlingString += 'q';
    }

    if (!castlingString) {
      castlingString = '-';
    }

    return castlingString;
  }

  getFenTurn(): string {
    return this.turn === ColorEnum.WHITE ? 'w' : 'b';
  }

  getPositionFen(): string {
    const piecesFen = this.getFenPieces();
    const castlingFen = this.getFenPossibleCastling();
    const turnFen = this.getFenTurn();
    const enPassantFen = this.getFenEnPassant();
    const checksCountFen = this.getFenChecksCount();

    return `${piecesFen} ${turnFen} ${castlingFen} ${enPassantFen}${checksCountFen}`;
  }

  isInCheck(color: ColorEnum): boolean {
    const opponentColor = GamePositionUtils.getOppositeColor(color);

    return (
      !this.isLeftInCheckAllowed
      && this.kings[color].some((king) => (
        GamePositionUtils.isBoardPiece(king)
        && this.isAttackedByOpponentPiece(king.location, opponentColor)
      ))
    );
  }

  setupStartingData() {
    super.setupStartingData();

    this.pliesFor50MoveRule = this.startingData.pliesFor50MoveRule;
    this.possibleEnPassant = this.startingData.possibleEnPassant;
    this.positionString = this.getPositionFen();
    this.positionsMap = {};
    this.positionsMap[this.positionString] = 1;
    this.checksCount = { ...this.startingData.checksCount };
    this.isCheck = this.isInCheck(this.turn);
  }
}
