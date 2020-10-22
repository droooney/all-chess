import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import intersection from 'lodash/intersection';
import map from 'lodash/map';
import sortBy from 'lodash/sortBy';
import times from 'lodash/times';

import {
  ALICE_CHESS_BOARDS_MARGIN,
  DRAWN_SYMBOL_COLORS,
  SVG_SQUARE_SIZE,
} from 'client/constants';

import {
  AnyMove,
  BoardPiece as IBoardPiece,
  BoardPossibleMove,
  ColorEnum,
  DrawnSymbol as IDrawnSymbol,
  DrawnSymbolColor,
  DrawnSymbolType,
  Piece as IPiece,
  PieceLocationEnum,
  Premove,
  RealPiece,
  RealPieceLocation,
  Square,
} from 'shared/types';

import { Game } from 'client/helpers';

import { ReduxState } from 'client/store';

import BoardCenterSquares from './BoardCenterSquares';
import BoardLiterals from './BoardLiterals';
import BoardPiece from './BoardPiece';
import BoardSquare, { BoardSquareProps } from './BoardSquare';
import BoardSquares from './BoardSquares';
import DrawnSymbol from '../DrawnSymbol';

import './index.less';

export interface OwnProps {
  game: Game;
  selectedPiece: RealPiece | null;
  selectedPieceBoard: number;
  allowedMoves: BoardPossibleMove[];
  premoves: Premove[];
  drawnSymbols: IDrawnSymbol[];
  onSquareClick(square: Square): void;
  startDraggingPiece(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
  enableClick: boolean;
  enableDnd: boolean;
  isBlackBase: boolean;
  isDragging: boolean;
  boardToShow: number | 'all';
  darkChessMode: ColorEnum | null;
  currentMoveIndex: number;
  boardsShiftX: number;
  pieces: readonly IPiece[];

  withLiterals?: boolean;
  showKingAttack?: boolean;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps>;

class Boards extends React.Component<Props> {
  static defaultProps = {
    withLiterals: true,
    showKingAttack: true,
  };

  boardsRef = React.createRef<HTMLDivElement>();
  prevMoveIndexes: [number, number] = [-1, this.props.currentMoveIndex];
  prevIsBlackBase = this.props.isBlackBase;
  prevIsDragging = this.props.isDragging;
  prevGame = this.props.game;
  prevPremovesCount = this.props.premoves.length;
  prevBoardsShiftX = this.props.boardsShiftX;

  componentDidUpdate(prevProps: Props) {
    this.prevIsBlackBase = this.props.isBlackBase;
    this.prevIsDragging = this.props.isDragging;
    this.prevGame = this.props.game;
    this.prevPremovesCount = this.props.premoves.length;
    this.prevBoardsShiftX = this.props.boardsShiftX;

    if (this.props.currentMoveIndex !== prevProps.currentMoveIndex) {
      this.prevMoveIndexes = [prevProps.currentMoveIndex, this.props.currentMoveIndex];
    }
  }

  isInCheck(square: Square): boolean {
    const {
      game,
      showKingAttack,
    } = this.props;

    if (game.isAntichess || game.isBenedictChess || !showKingAttack) {
      return false;
    }

    const pieceInSquare = game.getBoardPiece(square);

    if (!pieceInSquare) {
      return false;
    }

    return (
      Game.isKing(pieceInSquare)
      && game.isAttackedByOpponentPiece(pieceInSquare.location, Game.getOppositeColor(pieceInSquare.color))
    );
  }

  onSquareClick = (square: Square) => {
    const {
      enableClick,
      onSquareClick,
    } = this.props;

    if (!enableClick) {
      return;
    }

    onSquareClick(square);
  };

  onPieceDragStart = (e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation) => {
    const {
      enableDnd,
      startDraggingPiece,
    } = this.props;

    if (!enableDnd) {
      return;
    }

    startDraggingPiece(e, location);
  };

  render() {
    const {
      game,
      game: {
        id: gameId,
        isAliceChess,
        isDarkChess,
        isKingOfTheHill,
        boardCount,
        boardWidth,
        boardHeight,
        boardOrthodoxWidth,
        boardOrthodoxHeight,
        boardCenterX,
        boardCenterY,
      },
      selectedPiece,
      selectedPieceBoard,
      allowedMoves,
      premoves,
      drawnSymbols,
      pieces,
      withLiterals,
      currentMoveIndex,
      isBlackBase,
      isDragging,
      darkChessMode,
      boardToShow,
      boardsShiftX,
      showFantomPieces,
      squareColorTheme,
    } = this.props;
    const prevMoveIndex = currentMoveIndex === this.prevMoveIndexes[1]
      ? this.prevMoveIndexes[0]
      : this.prevMoveIndexes[1];
    const currentMove = game.getUsedMoves()[currentMoveIndex] as AnyMove | undefined;
    const movedPieceIds: string[] = [];
    const capturedPieceIds: string[] = [];
    const prevPieces = game.getMovePieces(prevMoveIndex);

    const visibleSquares = isDarkChess && darkChessMode
      ? currentMove && 'prevVisibleSquares' in currentMove
        ? game.getLocalVisibleSquares(darkChessMode).filter(
          (square) => currentMove.prevVisibleSquares!.some(Game.equalToSquare(square)),
        )
        : game.getLocalVisibleSquares(darkChessMode)
      : [];
    const isHiddenSquare = (square: Square): boolean => (
      !!darkChessMode
      && isDarkChess
      && visibleSquares.every((visibleSquare) => !Game.areSquaresEqual(square, visibleSquare))
    );
    const isAllowed = (square: Square): boolean => (
      allowedMoves.some(({ square: allowedSquare }) => Game.areSquaresEqual(square, allowedSquare))
    );
    const piecesSelector = (ids: string[]) => ids.map((id) => `#boards-${gameId} #piece-${id}`).join(',');

    const boardPieces = pieces.filter(Game.isBoardPiece);

    pieces.forEach((piece) => {
      const prevPiece = prevPieces[piece.id];

      if (prevPiece && Game.isBoardPiece(prevPiece)) {
        if (
          Game.isBoardPiece(piece)
          && !Game.areSquaresEqual(piece.location, prevPiece.location)
        ) {
          movedPieceIds.push(piece.id);
        }

        if (
          currentMoveIndex - prevMoveIndex === 1
          && !Game.isBoardPiece(piece)
        ) {
          capturedPieceIds.push(piece.id);
          boardPieces.push(prevPiece);
        }
      }
    });

    const showTransition = (
      this.prevIsBlackBase === isBlackBase
      && this.prevIsDragging === isDragging
      && this.prevGame === game
      && this.prevPremovesCount === premoves.length
      && this.prevBoardsShiftX === boardsShiftX
    );

    const movedPieceIdsSelector = piecesSelector(movedPieceIds);
    const capturedPieceIdsSelector = piecesSelector(capturedPieceIds);
    const movedAndCapturedPieceIdsSelector = piecesSelector(
      intersection(movedPieceIds, capturedPieceIds),
    );

    return (
      <div
        ref={this.boardsRef}
        id={`boards-${gameId}`}
        className={classNames('boards', `theme-${squareColorTheme}`, {
          'no-transition': !showTransition,
          'no-fantom': !showFantomPieces,
        })}
        style={{
          '--is-black-base': +isBlackBase,
          '--board-count': boardCount,
          '--shown-board-count': boardToShow === 'all' ? boardCount : 1,
          '--board-width': boardWidth,
          '--board-orthodox-width': boardOrthodoxWidth,
          '--board-height': boardOrthodoxHeight,
          '--board-orthodox-height': boardHeight,
          ...times(boardWidth).reduce((files, fileX) => {
            const adjustedFileX = game.adjustFileX(fileX + boardsShiftX);

            return {
              ...files,
              [`--file-${fileX}-transform`]: `${(adjustedFileX - fileX) * SVG_SQUARE_SIZE}px`,
            };
          }, {}),
          '--boards-margin': `${ALICE_CHESS_BOARDS_MARGIN}px`,
        } as React.CSSProperties}
        onContextMenu={(e) => e.preventDefault()}
      >
        <style>
          {movedPieceIdsSelector && (
            `${movedPieceIdsSelector} {
              transition-property: transform;
            }`
          )}

          {capturedPieceIdsSelector && (
            `${capturedPieceIdsSelector} {
              opacity: 0;
              transition-property: opacity;
            }`
          )}

          {movedAndCapturedPieceIdsSelector && (
            `${movedAndCapturedPieceIdsSelector} {
              opacity: 0;
              transition-property: transform, opacity;
            }`
          )}
        </style>

        {times(boardCount, (board) => {
          if (boardToShow !== 'all' && board !== boardToShow) {
            return;
          }

          const currentMoveSquares: JSX.Element[] = [];
          const allowedSquares: JSX.Element[] = [];
          const checkSquares: JSX.Element[] = [];
          const hiddenSquares: JSX.Element[] = [];
          const premoveSquares: JSX.Element[] = [];
          const allowedDots: JSX.Element[] = [];
          const pieces = boardPieces
            .filter(({ location }) => location.board === board)
            .map((piece) => ({
              piece,
              isFantom: (
                isDragging
                && !!selectedPiece
                && selectedPiece.id === piece.id
                && board === selectedPieceBoard
              ),
            }));
          let fantomPieces: { piece: IBoardPiece; isFantom: boolean; }[] = [];
          let selectedSquare: JSX.Element | null = null;

          if (isAliceChess) {
            const prevBoard = game.getPrevBoard(board);

            fantomPieces = boardPieces
              .filter(({ location }) => location.board === prevBoard)
              .map((piece) => ({ piece, isFantom: true }));
          }

          const allPieces = sortBy([
            ...pieces,
            ...fantomPieces,
          ], ({ piece }) => piece.id);

          times(boardHeight, (rankY) => {
            times(boardWidth, (fileX) => {
              const square = {
                board,
                x: fileX,
                y: rankY,
              };

              if (game.isEmptySquare(square)) {
                return;
              }

              const baseSquareParams: BoardSquareProps & { key: any; } = {
                key: `${rankY}-${fileX}`,
                game,
                board,
                fileX,
                rankY,
              };

              if (
                selectedPiece
                && Game.isBoardPiece(selectedPiece)
                && Game.areSquaresEqual({ ...selectedPiece.location, board: selectedPieceBoard }, square)
              ) {
                selectedSquare = (
                  <BoardSquare
                    {...baseSquareParams}
                    className="selected-square"
                  />
                );
              }

              if (
                currentMove && (
                  (
                    currentMove.from
                    && currentMove.from.type !== PieceLocationEnum.POCKET
                    && Game.areSquaresEqual(currentMove.from, square, false)
                  ) || (
                    currentMove.to
                    && Game.areSquaresEqual(currentMove.to, square, false)
                  )
                )
              ) {
                currentMoveSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="current-move-square"
                  />,
                );
              }

              if (isAllowed(square)) {
                const center = game.getSquareCenter({
                  ...square,
                  x: game.adjustFileX(square.x + boardsShiftX),
                });

                allowedSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="allowed-square"
                    onSquareClick={this.onSquareClick}
                    onPieceDragStart={this.onPieceDragStart}
                  />,
                );

                allowedDots.push(
                  <circle
                    key={baseSquareParams.key}
                    className="allowed-dot"
                    r={7 * game.getPieceSize() / SVG_SQUARE_SIZE}
                    style={{
                      transform: `rotate(calc(180deg * var(--is-black-base, 0))) translate(${center.x}px, ${center.y}px)`,
                      transformOrigin: `${boardCenterX}px ${boardCenterY}px`,
                    }}
                  />,
                );
              }

              if (this.isInCheck(square)) {
                checkSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="check-square"
                  />,
                );
              }

              if (isHiddenSquare(square)) {
                hiddenSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="hidden-square"
                  />,
                );
              }

              premoves.forEach(({ from, to }, index) => {
                if (
                  (from.type === PieceLocationEnum.BOARD && Game.areSquaresEqual(from, square, false))
                  || Game.areSquaresEqual(to, square, false)
                ) {
                  premoveSquares.push(
                    <BoardSquare
                      {...baseSquareParams}
                      key={`${baseSquareParams.key}-${index}`}
                      className="premove-square"
                    />,
                  );
                }
              });
            });
          });

          return (
            <svg
              key={board}
              className="board"
              viewBox={`0 0 ${2 * boardCenterX} ${2 * boardCenterY}`}
            >
              <defs>
                <radialGradient id="allowed-grad" r="100%" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgba(0,255,255,0.5)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>

                <radialGradient id="check-grad" r="80%" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="red" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>

                {map(DrawnSymbolColor, (color) => (
                  <marker
                    key={color}
                    id={`arrow-marker-${color}`}
                    viewBox="0 0 10 8"
                    orient="auto"
                    markerWidth={5}
                    markerHeight={4}
                    refX={7}
                    refY={4}
                  >
                    <path d="M0,0 V8 L10,4 Z" className="arrow-marker" fill={DRAWN_SYMBOL_COLORS[color]} />
                  </marker>
                ))}
              </defs>
              <g className="bottom-squares">
                <BoardSquares
                  game={game}
                  board={board}
                  onSquareClick={this.onSquareClick}
                  onPieceDragStart={this.onPieceDragStart}
                />
                {selectedSquare}
                {currentMoveSquares}
                {allowedSquares}
                {checkSquares}
              </g>
              <g className="literals">
                {withLiterals && (
                  <BoardLiterals
                    game={game}
                    board={board}
                    boardsShiftX={boardsShiftX}
                    isBlackBase={isBlackBase}
                  />
                )}
              </g>
              <g className="pieces">
                {allPieces.map(({ piece, isFantom }) => (
                  <BoardPiece
                    key={piece.id}
                    game={game}
                    piece={piece}
                    isFantom={isFantom}
                  />
                ))}
              </g>
              <g className="allowed-dots">
                {allowedDots}
              </g>
              <g className="top-squares">
                {hiddenSquares}
                {premoveSquares}
              </g>
              <g className="center-borders">
                {isKingOfTheHill && (
                  <BoardCenterSquares game={game} />
                )}
              </g>
              <g className="symbols">
                {[
                  ...drawnSymbols.filter(({ type }) => type === DrawnSymbolType.CIRCLE),
                  ...drawnSymbols.filter(({ type }) => type === DrawnSymbolType.ARROW),
                ].map((symbol) => (
                  <DrawnSymbol
                    key={symbol.id}
                    game={game}
                    symbol={symbol}
                    boardsShiftX={boardsShiftX}
                  />
                ))}
              </g>
            </svg>
          );
        })}
      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    showFantomPieces: state.gameSettings.showFantomPieces,
    squareColorTheme: state.gameSettings.squareColorTheme,
  };
}

export default connect(mapStateToProps)(Boards);
