import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { ALICE_CHESS_BOARDS_MARGIN, drawnSymbolColors, SVG_SQUARE_SIZE } from 'client/constants';

import {
  AnyMove,
  BoardPiece as IBoardPiece,
  BoardPossibleMove,
  ColorEnum,
  DrawnSymbol as IDrawnSymbol,
  DrawnSymbolColor,
  Piece as IPiece,
  PieceBoardLocation,
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
  showFantomPieces?: boolean;
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

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.isBlackBase !== this.props.isBlackBase
      || prevProps.isDragging !== this.props.isDragging
      || prevProps.game !== this.props.game
      || prevProps.premoves.length !== this.props.premoves.length
    ) {
      this.boardsRef.current!.classList.add('no-transition');

      setTimeout(() => {
        this.boardsRef.current!.classList.remove('no-transition');
      }, 0);
    }

    if (this.props.currentMoveIndex !== prevProps.currentMoveIndex) {
      this.prevMoveIndexes = [prevProps.currentMoveIndex, this.props.currentMoveIndex];
    }
  }

  isInCheck(square: Square): boolean {
    const {
      game,
      showKingAttack,
    } = this.props;

    if (game.isAntichess || !showKingAttack) {
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
        isAntichess,
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
    } = this.props;
    const prevMoveIndex = currentMoveIndex === this.prevMoveIndexes[1]
      ? this.prevMoveIndexes[0]
      : this.prevMoveIndexes[1];
    const currentMove = game.getUsedMoves()[currentMoveIndex] as AnyMove | undefined;
    const movedPieceIds: string[] = [];
    const capturedPieceIds: string[] = [];
    const prevPieceLocations = game.getMovePieceLocations(prevMoveIndex);

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
    const wasCaptured = (piece: IPiece): boolean => {
      const prevLocation = prevPieceLocations[piece.id];

      return (
        currentMoveIndex - prevMoveIndex === 1
        && !!prevLocation
        && prevLocation.type === PieceLocationEnum.BOARD
        && !piece.location
      );
    };
    const piecesSelector = (ids: string[]) => ids.map((id) => `#boards-${gameId}  #piece-${id}`).join(',');

    pieces.forEach((piece) => {
      const prevLocation = prevPieceLocations[piece.id];

      if (
        Game.isBoardPiece(piece)
        && prevLocation
        && prevLocation.type === PieceLocationEnum.BOARD
        && !Game.areSquaresEqual(piece.location, prevLocation)
      ) {
        movedPieceIds.push(piece.id);
      }
    });

    const realPieces = pieces.filter(Game.isBoardPiece);
    const capturedPieces = pieces
      .filter(wasCaptured)
      .map((piece) => {
        capturedPieceIds.push(piece.id);

        return {
          ...piece,
          location: prevPieceLocations[piece.id] as PieceBoardLocation,
        };
      });
    const boardPieces = [...realPieces, ...capturedPieces];
    const movedPieceIdsSelector = piecesSelector(movedPieceIds);
    const capturedPieceIdsSelector = piecesSelector(capturedPieceIds);
    const movedAndCapturedPieceIdsSelector = piecesSelector(_.intersection(movedPieceIds, capturedPieceIds));

    return (
      <div
        ref={this.boardsRef}
        id={`boards-${gameId}`}
        className={classNames('boards', {
          antichess: isAntichess,
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
          ..._.times(boardWidth).reduce((files, fileX) => ({
            ...files,
            [`--rendered-file-${fileX}`]: game.adjustFileX(fileX + boardsShiftX),
          }), {}),
          '--light-square-color': '#eeeece',
          // '--light-square-color': 'beige',
          '--dark-square-color': '#bbb',
          // '--dark-square-color': 'silver',
          '--half-dark-square-color': '#d8d8d8',
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

        {_.times(boardCount, (board) => {
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

          const allPieces = _.sortBy([
            ...pieces,
            ...fantomPieces,
          ], ({ piece }) => piece.id);

          _.times(boardHeight, (rankY) => {
            _.times(boardWidth, (fileX) => {
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
                {_.map(DrawnSymbolColor, (color) => (
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
                    <path d="M0,0 V8 L10,4 Z" className="arrow-marker" fill={drawnSymbolColors[color]} />
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
                  ...drawnSymbols.filter(({ type }) => type === 'circle'),
                  ...drawnSymbols.filter(({ type }) => type === 'arrow'),
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

function mapStateToProps(state: ReduxState, ownProps: OwnProps) {
  return {
    showFantomPieces: 'showFantomPieces' in ownProps
      ? ownProps.showFantomPieces
      : state.gameSettings.showFantomPieces,
  };
}

export default connect(mapStateToProps)(Boards);
