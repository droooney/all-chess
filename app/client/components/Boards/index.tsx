import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import {
  BoardPiece as IBoardPiece,
  BoardPossibleMove,
  ColorEnum,
  DarkChessLocalMove,
  DrawnSymbol as IDrawnSymbol,
  LocalMove,
  Piece as IPiece,
  PieceLocationEnum,
  Player,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import { ALICE_CHESS_BOARDS_MARGIN } from '../../constants';
import { Game } from '../../helpers';
import { ReduxState } from '../../store';

import BoardCenterSquares from '../BoardCenterSquares';
import BoardLiterals from '../BoardLiterals';
import BoardPiece from '../BoardPiece';
import BoardSquare, { BoardSquareProps } from '../BoardSquare';
import BoardSquares from '../BoardSquares';
import DrawnSymbol from '../DrawnSymbol';

import './index.less';

export interface OwnProps {
  game: Game;
  player: Player | null;
  selectedPiece: RealPiece | null;
  allowedMoves: BoardPossibleMove[];
  drawnSymbols: IDrawnSymbol[];
  onSquareClick(square: Square): void;
  startDraggingPiece(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
  enableClick: boolean;
  enableDnd: boolean;
  isBlackBase: boolean;
  isDragging: boolean;
  boardToShow: number | 'all';
  darkChessMode: ColorEnum | null;
  currentMove: DarkChessLocalMove | LocalMove | undefined;
  boardsShiftX: number;
  pieces: readonly IPiece[];

  withLiterals?: boolean;
  showFantomPieces?: boolean;
  showKingAttack?: boolean;
  getAllowedMoves?(): Generator<BoardPossibleMove>;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps>;

class Boards extends React.Component<Props> {
  static defaultProps = {
    withLiterals: true,
    showKingAttack: true
  };

  boardsRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.isBlackBase !== this.props.isBlackBase
      || prevProps.isDragging !== this.props.isDragging
      || prevProps.game !== this.props.game
    ) {
      this.boardsRef.current!.classList.add('no-transition');

      setTimeout(() => {
        this.boardsRef.current!.classList.remove('no-transition');
      }, 0);
    }
  }

  isInCheck(square: Square): boolean {
    const {
      game,
      showKingAttack
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
      onSquareClick
    } = this.props;

    if (!enableClick) {
      return;
    }

    onSquareClick(square);
  };

  onPieceDragStart = (e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation) => {
    const {
      enableDnd,
      startDraggingPiece
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
        boardCenterY
      },
      selectedPiece,
      allowedMoves,
      drawnSymbols,
      pieces,
      withLiterals,
      currentMove,
      isBlackBase,
      isDragging,
      darkChessMode,
      boardToShow,
      boardsShiftX,
      showFantomPieces
    } = this.props;

    const visibleSquares = isDarkChess && darkChessMode
      ? currentMove && 'prevVisibleSquares' in currentMove
        ? game.getVisibleSquares(darkChessMode).filter((square) => currentMove.prevVisibleSquares!.some((sq) => (
          Game.areSquaresEqual(square, sq)
        )))
        : game.getVisibleSquares(darkChessMode)
      : [];
    const boardPieces = pieces.filter(Game.isBoardPiece);
    const isHiddenSquare = (square: Square): boolean => (
      !!darkChessMode
      && isDarkChess
      && visibleSquares.every((visibleSquare) => !Game.areSquaresEqual(square, visibleSquare))
    );
    const isAllowed = (square: Square) => (
      allowedMoves.some(({ square: allowedSquare }) => Game.areSquaresEqual(square, allowedSquare))
    );

    return (
      <div
        ref={this.boardsRef}
        className={classNames('boards', { antichess: isAntichess })}
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
            [`--rendered-file-${fileX}`]: game.adjustFileX(fileX + boardsShiftX)
          }), {}),
          '--light-square-color': '#eeeece',
          // '--light-square-color': 'beige',
          '--dark-square-color': '#bbb',
          // '--dark-square-color': 'silver',
          '--half-dark-square-color': '#d8d8d8',
          '--symbol-color': '#080',
          '--boards-margin': `${ALICE_CHESS_BOARDS_MARGIN}px`
        } as React.CSSProperties}
        onContextMenu={(e) => e.preventDefault()}
      >
        {_.times(boardCount, (board) => {
          if (boardToShow !== 'all' && board !== boardToShow) {
            return;
          }

          const currentMoveSquares: JSX.Element[] = [];
          const allowedSquares: JSX.Element[] = [];
          const checkSquares: JSX.Element[] = [];
          const hiddenSquares: JSX.Element[] = [];
          const pieces = boardPieces
            .filter(({ location }) => location.board === board)
            .map((piece) => ({
              piece,
              isFantom: (
                isDragging
                && !!selectedPiece
                && selectedPiece.id === piece.id
              )
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
            ...fantomPieces
          ], ({ piece }) => piece.id);

          _.times(boardHeight, (rankY) => {
            _.times(boardWidth, (fileX) => {
              const square = {
                board,
                x: fileX,
                y: rankY
              };

              if (game.isEmptySquare(square)) {
                return;
              }

              const baseSquareParams: BoardSquareProps & { key: any; } = {
                key: `${rankY}-${fileX}`,
                game,
                board,
                fileX,
                rankY
              };

              if (
                selectedPiece
                && Game.isBoardPiece(selectedPiece)
                && Game.areSquaresEqual(selectedPiece.location, square)
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
                    && currentMove.from.x === square.x
                    && currentMove.from.y === square.y
                  ) || (
                    currentMove.to
                    && currentMove.to.x === square.x
                    && currentMove.to.y === square.y
                  )
                )
              ) {
                currentMoveSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="current-move-square"
                  />
                );
              }

              if (isAllowed(square)) {
                allowedSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="allowed-square"
                    onSquareClick={this.onSquareClick}
                    onPieceDragStart={this.onPieceDragStart}
                  />
                );
              }

              if (this.isInCheck(square)) {
                checkSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="check-square"
                  />
                );
              }

              if (isHiddenSquare(square)) {
                hiddenSquares.push(
                  <BoardSquare
                    {...baseSquareParams}
                    className="hidden-square"
                  />
                );
              }
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
                <marker
                  id="arrow-marker"
                  viewBox="0 0 10 8"
                  orient="auto"
                  markerWidth={5}
                  markerHeight={4}
                  refX={7}
                  refY={4}
                >
                  <path d="M0,0 V8 L10,4 Z" className="arrow-marker" />
                </marker>
              </defs>
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
              {withLiterals && (
                <BoardLiterals
                  game={game}
                  board={board}
                  boardsShiftX={boardsShiftX}
                  isBlackBase={isBlackBase}
                />
              )}
              {allPieces.map(({ piece, isFantom }) => (
                <BoardPiece
                  key={piece.id}
                  game={game}
                  piece={piece}
                  isFantom={isFantom}
                  isFullFantom={(isFantom && !showFantomPieces) || !piece.location}
                />
              ))}
              {hiddenSquares}
              {isKingOfTheHill && (
                <BoardCenterSquares game={game} />
              )}
              {drawnSymbols.map((symbol) => (
                <DrawnSymbol
                  key={symbol.id}
                  game={game}
                  symbol={symbol}
                  boardsShiftX={boardsShiftX}
                />
              ))}
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
      : state.gameSettings.showFantomPieces
  };
}

export default connect(mapStateToProps)(Boards);
