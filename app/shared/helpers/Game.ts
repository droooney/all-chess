import * as _ from 'lodash';

import {
  CastlingTypeEnum,
  ChatMessage,
  ColorEnum,
  Game as IGame,
  GameCreateOptions,
  GamePlayers,
  GameResult,
  GameVariantEnum,
  Move,
  PGNTags,
  PieceLocationEnum,
  PieceTypeEnum,
  RealPiece,
  ResultReasonEnum,
  Square,
  StartingData,
  TakebackRequest,
  TimeControl,
  TimeControlEnum
} from '../../types';
import {
  COLOR_NAMES,
  GAME_VARIANT_PGN_NAMES
} from '../constants';
import GameResultUtils from './GameResultUtils';

const DIGITS_REGEX = /^\d+$/;

const PGN_TAG_REGEX = /^\[([a-z0-9]+) +"((?:[^"\\]|\\"|\\\\)*)"]$/i;
const PGN_MOVE_REGEX = /^\S+(?=\s|$)/;
const PGN_MOVE_SQUARES_REGEX = /^(?:([A-Z]?)(@?)([₀-₉]*)([a-w]*)(\d*)x?([₀-₉]*)([a-w])(\d+)(?:=([A-Z]))?)|O-O(-O)?/;

const RESULT_WIN_WHITE = '1-0';
const RESULT_WIN_BLACK = '0-1';
const RESULT_DRAW = '1/2-1/2';

export class Game extends GameResultUtils implements IGame {
  static getGameFromPgn(pgn: string): Game {
    const pgnData = pgn
      .split('\n')
      .map((string) => string.trim())
      .filter(Boolean);
    const variants: GameVariantEnum[] = [];
    const pgnTags: PGNTags = {};
    let timeControl: TimeControl = null;
    let startingData: StartingData;
    let fen = '';
    let i = 0;

    for (; i < pgnData.length; i++) {
      const tag = pgnData[i];
      const match = tag.match(PGN_TAG_REGEX);

      if (!match) {
        break;
      }

      const [, tagName, tagValue] = match;
      const trueTagValue = tagValue
        .replace(/\\"/g, '"')
        .replace(/\\\\/, '\\');

      if (tagName === 'Variant') {
        if (trueTagValue !== 'Standard') {
          trueTagValue.split(/\s*\+\s*/).forEach((variantString) => {
            const variant = _.findKey(GAME_VARIANT_PGN_NAMES, (name) => name === variantString) as GameVariantEnum | undefined;

            if (!variant) {
              throw new Error(`Invalid PGN: invalid variant (${variantString})`);
            }

            variants.push(variant);
          });

          if (!Game.validateVariants(variants)) {
            throw new Error('Invalid PGN: invalid variants combination');
          }
        }
      } else if (tagName === 'TimeControl') {
        if (trueTagValue !== '-') {
          const values = trueTagValue.split(/\s*\+\s*/);
          const baseString = values[0];
          const base = +(+baseString * 1000).toFixed(2);

          if (
            (
              values.length !== 1
              && values.length !== 2
            )
            || baseString === '0'
            || !DIGITS_REGEX.test(baseString)
          ) {
            throw new Error(`Invalid PGN: invalid time control base (${baseString})`);
          }

          if (values.length === 1) {
            timeControl = {
              type: TimeControlEnum.CORRESPONDENCE,
              base
            };
          } else {
            const incrementString = values[1];

            if (!DIGITS_REGEX.test(incrementString)) {
              throw new Error(`Invalid PGN: invalid time control increment (${incrementString})`);
            }

            const increment = +(+incrementString * 1000).toFixed(2);

            timeControl = {
              type: TimeControlEnum.TIMER,
              base,
              increment
            };
          }
        }
      } else if (tagName === 'FEN') {
        fen = trueTagValue;
      }

      pgnTags[tagName] = trueTagValue;
    }

    if (fen) {
      startingData = Game.getStartingDataFromFen(fen, variants);
    } else {
      startingData = Game.getStartingData(variants);
    }

    const resultString = 'Result' in pgnTags
      ? pgnTags.Result
      : null;
    let result: GameResult | null = null;

    if (
      resultString === RESULT_WIN_WHITE
      || resultString === RESULT_WIN_BLACK
      || resultString === RESULT_DRAW
    ) {
      if (resultString === RESULT_WIN_WHITE || resultString === RESULT_WIN_BLACK) {
        result = {
          winner: resultString === RESULT_WIN_WHITE
            ? ColorEnum.WHITE
            : ColorEnum.BLACK,
          reason: ResultReasonEnum.RESIGN
        };
      } else {
        result = {
          winner: null,
          reason: ResultReasonEnum.AGREED_TO_DRAW
        };
      }

      if ('Termination' in pgnTags && pgnTags.Termination !== 'Normal') {
        result.reason = pgnTags.Termination as any;
      }
    }

    startingData.result = result;

    const game = new Game({
      id: '',
      startingData,
      variants,
      timeControl,
      pgnTags
    });

    if (!game.isLeftInCheckAllowed && game.isInCheck(game.getOpponentColor())) {
      throw new Error('Invalid FEN: the king is in check');
    }

    if (i < pgnData.length) {
      let movesString = pgnData
        .slice(i)
        .map((string) => string.replace(/;[\s\S]*$/, ''))
        .filter(Boolean)
        .join(' ');
      let shouldBeMoveIndex = true;
      let wasMoveIndex = false;

      while (movesString) {
        const whitespace = movesString.match(/^\s+/);

        // whitespace
        if (whitespace) {
          movesString = movesString.slice(whitespace.length);

          continue;
        }

        const isUsualComment = movesString.indexOf('{') === 0;
        const isMovesComment = movesString.indexOf('(') === 0;

        // comment
        if (isUsualComment || isMovesComment) {
          const commentEnd = movesString.indexOf(isUsualComment ? '}' : ')');

          if (commentEnd === -1) {
            throw new Error('Invalid PGN: unterminated comment');
          }

          movesString = movesString.slice(commentEnd + 1);
          shouldBeMoveIndex = true;

          continue;
        }

        // game result
        if (movesString === resultString) {
          break;
        }

        // move index including dots
        if (shouldBeMoveIndex) {
          const moveIndex = Math.floor(game.pliesCount / 2) + 1;
          const moveIndexString = (startingData.startingMoveIndex && !wasMoveIndex) || game.pliesCount % 2 !== 0
            ? `${moveIndex}...`
            : `${moveIndex}.`;

          if (movesString.indexOf(moveIndexString) !== 0) {
            throw new Error('Invalid PGN: wrong move index');
          }

          movesString = movesString.slice(moveIndexString.length);
          shouldBeMoveIndex = false;
          wasMoveIndex = true;

          continue;
        }

        // move
        const moveMatch = movesString.match(PGN_MOVE_REGEX);

        if (!moveMatch) {
          throw new Error('Invalid PGN: wrong move string');
        }

        const moveString = moveMatch[0];
        const moveSquaresMatch = moveString.match(PGN_MOVE_SQUARES_REGEX);

        if (!moveSquaresMatch) {
          throw new Error('Invalid PGN: wrong move string');
        }

        const [
          moveSquares,
          pieceLiteral,
          drop,
          fromBoardLiteral = '',
          fromFileLiteral = '',
          fromRankLiteral = '',
          toBoardLiteral,
          toFileLiteral,
          toRankLiteral,
          promotionPieceLiteral,
          queenSideCastling
        ] = moveSquaresMatch;
        const isDrop = !!drop;
        const isCastling = moveSquares.includes('O-O');
        const isQueenSideCastling = !!queenSideCastling;
        // TODO: fix piece parsing for absorption/frankfurt
        const pieceFromLiteral = Game.getPieceFromLiteral(isCastling ? 'K' : pieceLiteral || 'P');

        if (!pieceFromLiteral) {
          throw new Error(`Invalid PGN: wrong piece name (${pieceLiteral})`);
        }

        const pieceType = pieceFromLiteral.type;
        const fromBoard = Game.getBoardNumber(fromBoardLiteral);
        const fromFile = Game.getFileNumber(fromFileLiteral);
        const fromRank = Game.getRankNumber(fromRankLiteral);
        const promotedPiece = promotionPieceLiteral && Game.getPieceFromLiteral(promotionPieceLiteral);
        let toBoard: number;
        let toFile: number;
        let toRank: number;

        if (isCastling) {
          const kings = game.kings[game.turn];
          const king = isQueenSideCastling ? kings[0] : _.last(kings);

          if (!king || !king.location || king.location.type !== PieceLocationEnum.BOARD) {
            throw new Error('Invalid PGN: wrong castling move');
          }

          const castlingRooks = game.getCastlingRooks(game.turn);
          const castlingRook = castlingRooks[isQueenSideCastling ? CastlingTypeEnum.QUEEN_SIDE : CastlingTypeEnum.KING_SIDE];

          if (!castlingRook) {
            throw new Error('Invalid PGN: wrong castling move');
          }

          toBoard = king.location.board;
          toFile = game.is960
            ? castlingRook.location.x
            : isQueenSideCastling
              ? 2
              : game.boardWidth - 2;
          toRank = king.location.y;
        } else {
          toBoard = Game.getBoardNumber(toBoardLiteral);
          toFile = Game.getFileNumber(toFileLiteral);
          toRank = Game.getRankNumber(toRankLiteral);
        }

        const getToSquare = (piece: RealPiece): Square => ({
          board: Game.isPocketPiece(piece)
            ? game.isAliceChess
              ? toBoard
              : 0
            : piece.location.board,
          x: toFile,
          y: toRank
        });
        const pieces = game.getPieces(game.turn)
          .filter(Game.isRealPiece)
          .filter((piece) => {
            const toSquare = getToSquare(piece);

            return (
              piece.type === pieceType
              && ((
                isDrop
                && Game.isPocketPiece(piece)
              ) || (
                Game.isBoardPiece(piece)
                && (!fromBoardLiteral || piece.location.board === fromBoard)
                && (!fromFileLiteral || piece.location.x === fromFile)
                && (!fromRankLiteral || piece.location.x === fromRank)
              ))
              && game.isMoveAllowed(piece, toSquare, promotedPiece ? promotedPiece.type : PieceTypeEnum.PAWN)
            );
          });

        if (isDrop && !pieces.length) {
          throw new Error('Invalid PGN: no pieces to drop');
        }

        if (!isDrop && pieces.length !== 1) {
          throw pieces.length
            ? new Error('Invalid PGN: ambiguous move')
            : new Error('Invalid PGN: no pieces to move');
        }

        const piece = pieces[0];
        const toSquare = getToSquare(piece);
        const move: Move = {
          from: piece.location,
          to: toSquare,
          duration: 0
        };

        if (game.isPromoting(piece, toSquare) && promotedPiece) {
          move.promotion = promotedPiece.type;
        }

        game.registerMove(move);

        movesString = movesString.slice(moveString.length);
        shouldBeMoveIndex = game.pliesCount % 2 === 0;
      }
    }

    return game;
  }

  static validateStartingData(startingData: StartingData, variants: readonly GameVariantEnum[]): void {
    const {
      isAliceChess,
      isAntichess,
      isHexagonalChess,
      isHorde,
      isTwoFamilies
    } = Game.getVariantsInfo(variants);
    const middleFile = 5;

    if (isAliceChess) {
      // pieces on the same square
      startingData.pieces.forEach((piece1) => {
        if (
          Game.isBoardPiece(piece1)
          && startingData.pieces.some((piece2) => (
            Game.isBoardPiece(piece2)
            && piece1.location.x === piece2.location.x
            && piece1.location.y === piece2.location.y
          ))
        ) {
          throw new Error(`Invalid FEN: multiple pieces on the same square (${
            Game.getFileLiteral(piece1.location.x) + Game.getRankLiteral(piece1.location.y)
          })`);
        }
      });
    }

    const whiteKingsNumber = startingData.pieces.filter((piece) => (
      piece.color === ColorEnum.WHITE
      && Game.isKing(piece)
    )).length;
    const blackKingsNumber = startingData.pieces.filter((piece) => (
      piece.color === ColorEnum.BLACK
      && Game.isKing(piece)
    )).length;

    // wrong number of kings on the board
    if (
      !isAntichess && (
        whiteKingsNumber !== (isHorde ? 0 : isTwoFamilies ? 2 : 1)
        || blackKingsNumber !== (isTwoFamilies ? 2 : 1)
      )
    ) {
      throw new Error('Invalid FEN: wrong number of kings');
    }

    const {
      boardHeight
    } = Game.getBoardDimensions(variants);

    // not promoted pawns
    startingData.pieces.forEach((piece) => {
      if (
        Game.isBoardPiece(piece)
        && Game.isPawn(piece)
      ) {
        if (
          piece.location.y === (
            piece.color === ColorEnum.WHITE
              ? isHexagonalChess
                ? boardHeight - 1 - Math.abs(piece.location.x - middleFile)
                : boardHeight - 1
              : 0
          )
        ) {
          throw new Error(`Invalid FEN: not promoted pawn (${Game.getFileLiteral(piece.location.x) + Game.getRankLiteral(piece.location.y)})`);
        }

        if (isHexagonalChess) {
          if (
            piece.color === ColorEnum.WHITE
              ? piece.location.y < middleFile - 1 - Math.abs(piece.location.x - middleFile)
              : piece.location.y > 6
          ) {
            throw new Error(`Invalid FEN: pawn behind the initial pawn structure (${
              Game.getFileLiteral(piece.location.x) + Game.getRankLiteral(piece.location.y)
            })`);
          }
        } else if (
          piece.location.y === (
            piece.color === ColorEnum.WHITE
              ? isHorde ? Infinity : 0
              : boardHeight - 1
          )
        ) {
          throw new Error(`Invalid FEN: pawn on the pieces rank (${Game.getFileLiteral(piece.location.x) + Game.getRankLiteral(piece.location.y)})`);
        }
      }
    });

    // king may be captured
    const game = new Game({
      timeControl: null,
      id: '',
      startingData,
      variants
    });

    if (game.isInCheck(game.getOpponentColor())) {
      throw new Error('Invalid FEN: king may be captured');
    }

    if (game.isNoMoves()) {
      throw new Error('Invalid FEN: no legal moves');
    }

    const opponentColor = Game.getOppositeColor(game.turn);

    if (!game.getPieces(opponentColor).length) {
      throw new Error(`Invalid FEN: no pieces (${COLOR_NAMES[opponentColor]})`);
    }
  }

  id: string;
  startingFen: string | null;
  players: GamePlayers = {
    [ColorEnum.WHITE]: null!,
    [ColorEnum.BLACK]: null!
  };
  timeControl: TimeControl;
  pgnTags: PGNTags;
  chat: ChatMessage[] = [];
  drawOffer: ColorEnum | null = null;
  takebackRequest: TakebackRequest | null = null;
  lastMoveTimestamp: number = 0;
  pawnTimeValue: number = 0;

  constructor(options: GameCreateOptions) {
    super(options);

    this.id = options.id || '';
    this.startingFen = options.startingFen || null;

    this.pgnTags = options.pgnTags || {};
    this.timeControl = options.timeControl;

    this.setupStartingData();

    if (this.isCompensationChess && this.timeControl?.type === TimeControlEnum.TIMER) {
      this.pawnTimeValue = this.timeControl.base / 2 / this.getPiecesWorth()[ColorEnum.WHITE];
    }
  }

  changePlayerTime(averagePing: number = 0) {
    if (this.moves.length > 2 && this.timeControl) {
      const prevTurn = this.getOpponentColor();
      const player = this.players[prevTurn];
      const {
        duration: actualDuration,
        prevPiecesWorth
      } = _.last(this.moves)!;
      const duration = Math.max(actualDuration / 2, actualDuration - averagePing / 2);

      if (this.isOngoing()) {
        if (this.timeControl.type === TimeControlEnum.TIMER) {
          player.time! -= duration - this.timeControl.increment;

          if (this.isCompensationChess) {
            const newPiecesWorth = this.getPiecesWorth();
            const gainedMaterial = newPiecesWorth[player.color] - prevPiecesWorth[player.color];
            const takenMaterial = prevPiecesWorth[this.turn] - newPiecesWorth[this.turn];

            player.time! -= (gainedMaterial + takenMaterial) * this.pawnTimeValue;
          }
        } else {
          player.time = this.timeControl.base;
        }
      } else {
        player.time! -= duration;
      }

      player.time = Math.max(player.time!, 0);
    }
  }
}
