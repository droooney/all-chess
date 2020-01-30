import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classNames';

import {
  BoardPiece as IBoardPiece,
  BoardPossibleMove,
  CenterSquareParams,
  ColorEnum,
  DarkChessLocalMove,
  LocalMove,
  Piece as IPiece,
  PieceBoardLocation,
  PieceLocationEnum,
  Player,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO } from '../../constants';
import { Game } from '../../helpers';
import { ReduxState } from '../../store';

import BoardPiece from '../BoardPiece';

import './index.less';

export interface OwnProps {
  game: Game;
  player: Player | null;
  selectedPiece: RealPiece | null;
  makeMove(square: Square, isDndMove: boolean): void;
  selectPiece(piece: IPiece | null): void;
  startDraggingPiece(e: React.MouseEvent, location: RealPieceLocation): void;
  enableClick: boolean;
  enableDnd: boolean;
  isBlackBase: boolean;
  isDragging: boolean;
  darkChessMode: ColorEnum | null;
  currentMove: DarkChessLocalMove | LocalMove | undefined;
  boardsShiftX: number;
  pieces: readonly IPiece[];
  squareSize: number;

  withLiterals?: boolean;
  showFantomPieces?: boolean;
  showKingAttack?: boolean;
  forceMoveWithClick?: boolean;
  getAllowedMoves?(): BoardPossibleMove[];
}

type Props = OwnProps & ReturnType<typeof mapStateToProps>;

class Boards extends React.Component<Props> {
  static defaultProps = {
    withLiterals: true,
    showKingAttack: true,
    forceMoveWithClick: false
  };

  boardsRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.isBlackBase !== this.props.isBlackBase
      || prevProps.isDragging !== this.props.isDragging
      || prevProps.game !== this.props.game
      || (
        this.props.currentMove
        && this.props.currentMove.isDndMove
      )
    ) {
      this.boardsRef.current!.classList.add('no-transition');

      setTimeout(() => {
        this.boardsRef.current!.classList.remove('no-transition');
      }, 0);
    }
  }

  getAllowedMoves(): BoardPossibleMove[] {
    const {
      game,
      selectedPiece,
      getAllowedMoves
    } = this.props;

    if (getAllowedMoves) {
      return getAllowedMoves();
    }

    if (!selectedPiece) {
      return [];
    }

    return game.getAllowedMoves(selectedPiece).map((move) => ({
      ...move,
      realSquare: move.square
    }));
  }

  getSquareParams(square: Square): CenterSquareParams {
    const {
      game
    } = this.props;

    if (!game.isKingOfTheHill) {
      return {};
    }

    return game.getCenterSquareParams(square) || {};
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
      game,
      player,
      selectedPiece,
      selectPiece,
      makeMove,
      forceMoveWithClick
    } = this.props;
    const playerColor = player ? player.color : null;

    if (!selectedPiece) {
      const pieceInSquare = game.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        return;
      }

      return selectPiece(pieceInSquare);
    }

    if (
      selectedPiece.location.type === PieceLocationEnum.BOARD
      && Game.areSquaresEqual(square, selectedPiece.location)
    ) {
      return selectPiece(null);
    }

    const allowedMoves = this.getAllowedMoves().filter(({ square: allowedSquare }) => Game.areSquaresEqual(square, allowedSquare));

    if (!allowedMoves.length && !forceMoveWithClick) {
      const pieceInSquare = game.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        return selectPiece(null);
      }

      return selectPiece(pieceInSquare);
    }

    makeMove(square, false);
  };

  onPieceDragStart = (e: React.MouseEvent, location: RealPieceLocation) => {
    const {
      startDraggingPiece
    } = this.props;

    startDraggingPiece(e, location);
  };

  render() {
    const {
      game,
      game: {
        isCircularChess,
        isHexagonalChess,
        isAliceChess,
        isDarkChess,
        isAntichess,
        boardCount,
        boardWidth,
        boardHeight,
        boardOrthodoxWidth,
        boardOrthodoxHeight,
        middleFileX,
        middleRankY
      },
      selectedPiece,
      enableClick,
      enableDnd,
      pieces,
      withLiterals,
      currentMove,
      isBlackBase,
      isDragging,
      darkChessMode,
      boardsShiftX,
      showFantomPieces,
      squareSize
    } = this.props;

    const maximumSize = Math.max(boardOrthodoxWidth, boardOrthodoxHeight);
    const half = maximumSize * squareSize / 2;
    const rOuter = boardWidth * squareSize;
    const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * squareSize;
    const literalFontSize = Math.ceil((
      isCircularChess
        ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO / 2) * squareSize
        : squareSize
    ) * 0.25);
    const literalMargin = literalFontSize / 3;
    const allowedMoves = this.getAllowedMoves();
    const visibleSquares = isDarkChess && darkChessMode ? game.getVisibleSquares(darkChessMode) : [];
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
        className={classNames('boards', {
          opposite: isBlackBase,
          antichess: isAntichess
        })}
      >
        {_.times(boardCount, (board) => {
          const squares: JSX.Element[] = [];
          const currentMoveSquares: JSX.Element[] = [];
          const allowedSquares: JSX.Element[] = [];
          const checkSquares: JSX.Element[] = [];
          const literals: JSX.Element[] = [];
          const hiddenSquares: JSX.Element[] = [];
          const voidSquares: JSX.Element[] = [];
          const centerBorders: JSX.Element[] = [];
          const pieces = boardPieces
            .filter(({ location }) => location.board === board)
            .map((piece) => ({
              ...piece,
              isFantom: (
                isDragging
                && !!selectedPiece
                && selectedPiece.id === piece.id
              )
            }));
          let fantomPieces: (IBoardPiece & { isFantom: boolean; })[] = [];
          let selectedSquare: JSX.Element | null = null;

          if (isAliceChess) {
            const prevBoard = game.getPrevBoard(board);

            fantomPieces = boardPieces
              .filter(({ location }) => location.board === prevBoard)
              .map((piece) => ({ ...piece, location: { ...piece.location, board }, isFantom: true }));
          }

          const allPieces = _.sortBy([
            ...pieces,
            ...fantomPieces
          ], 'id');

          _.times(boardHeight, (rankY) => {
            _.times(boardWidth, (fileX) => {
              const initialFileX = fileX;

              fileX = game.adjustFileX(fileX + (isBlackBase ? boardsShiftX : -boardsShiftX));

              const square = {
                board,
                x: fileX,
                y: rankY
              };
              const location: PieceBoardLocation = {
                ...square,
                type: PieceLocationEnum.BOARD
              };

              if (game.isEmptySquare(square)) {
                return;
              }

              const translateX = squareSize * (
                isBlackBase
                  ? boardWidth - 1 - initialFileX
                  : initialFileX
              );
              const translateY = squareSize * (
                isBlackBase
                  ? rankY
                  : boardHeight - 1 - rankY
              );
              const key = `${rankY}-${fileX}`;
              const baseParams = {
                'data-square': JSON.stringify(square),
                transform: isCircularChess || isHexagonalChess
                  ? undefined
                  : `translate(${translateX}, ${translateY})`,
                onClick: enableClick ? (() => this.onSquareClick(square)) : undefined,
                onMouseDown: enableDnd ? ((e: React.MouseEvent) => this.onPieceDragStart(e, location)) : undefined
              };
              const centerSquareParams = this.getSquareParams(square);
              const SVGSquareElem = (props: React.SVGProps<SVGPathElement> | React.SVGProps<SVGRectElement>) => (
                isCircularChess || isHexagonalChess ? (
                  <path
                    d={pathD}
                    {...baseParams}
                    {...props as React.SVGProps<SVGPathElement>}
                  />
                ) : (
                  <rect
                    width={squareSize}
                    height={squareSize}
                    {...baseParams}
                    {...props as React.SVGProps<SVGRectElement>}
                  />
                )
              );
              let pathD = '';

              if (isCircularChess) {
                const adjustedRankY = rankY > boardOrthodoxHeight
                  ? boardHeight - 1 - rankY
                  : rankY;
                const adjustedFileX = rankY > boardOrthodoxHeight
                  ? boardOrthodoxWidth - fileX
                  : fileX;
                const right = rankY > boardOrthodoxHeight ? 1 : 0;
                const r = rOuter - (right ? boardOrthodoxWidth - adjustedFileX : adjustedFileX) * rDiff;
                const nextR = r - rDiff;
                const angle = adjustedRankY * Math.PI / 8;
                const nextAngle = (adjustedRankY + 1) * Math.PI / 8;
                const getCirclePoint = (r: number, angle: number) => {
                  const x = half - (right ? -1 : 1) * r * Math.sin(angle);
                  const y = half - r * Math.cos(angle);

                  return isBlackBase
                    ? { x: maximumSize * squareSize - x, y }
                    : { x, y: maximumSize * squareSize - y };
                };
                const circlePoints = [
                  getCirclePoint(r, angle),
                  getCirclePoint(r, nextAngle),
                  getCirclePoint(nextR, nextAngle),
                  getCirclePoint(nextR, angle)
                ];

                pathD = `
                  M ${circlePoints[0].x},${circlePoints[0].y}
                  A ${r} ${r} 0 0 ${1 - right} ${circlePoints[1].x} ${circlePoints[1].y}
                  L ${circlePoints[2].x},${circlePoints[2].y}
                  A ${nextR} ${nextR} 0 0 ${right} ${circlePoints[3].x} ${circlePoints[3].y}
                  Z
                `;
              } else if (isHexagonalChess) {
                const a = squareSize / 2 / Math.sqrt(3);
                const x0 = (
                  isBlackBase
                    ? (boardWidth - fileX) * 3
                    : (fileX * 3) + 1
                ) * a;
                const rankAdjustmentY = 1 / 2 * Math.abs(fileX - middleFileX);
                const y0 = (
                  isBlackBase
                    ? rankY + rankAdjustmentY
                    : boardHeight - rankY - rankAdjustmentY
                ) * squareSize;
                const hexPoint = (x: number, y: number) => (
                  isBlackBase
                    ? { x: -x, y }
                    : { x, y: -y }
                );
                const hexPoints = [
                  hexPoint(-a, squareSize / 2),
                  hexPoint(a, squareSize / 2),
                  hexPoint(2 * a, 0),
                  hexPoint(a, -squareSize / 2),
                  hexPoint(-a, -squareSize / 2)
                ];

                pathD = `
                  M ${x0},${y0}
                  l ${hexPoints[0].x},${hexPoints[0].y}
                  l ${hexPoints[1].x},${hexPoints[1].y}
                  h ${hexPoints[2].x}
                  l ${hexPoints[3].x},${hexPoints[3].y}
                  l ${hexPoints[4].x},${hexPoints[4].y}
                  Z
                `;
              }

              let squareLightClass: 'light' | 'dark' | 'half-dark';
              let literalLightClass: 'light' | 'dark' | 'half-dark';

              if (isHexagonalChess) {
                const x = middleFileX - Math.abs(fileX - middleFileX);

                squareLightClass = (rankY + x) % 3 === 2
                  ? 'light'
                  : (rankY + x) % 3 === 1
                    ? 'half-dark'
                    : 'dark';
                literalLightClass = (rankY + x) % 3 === 2
                  ? 'dark'
                  : 'light';
              } else {
                const isLight = (rankY + fileX) % 2;

                squareLightClass = isLight ? 'light' : 'dark';
                literalLightClass = isLight ? 'dark' : 'light';
              }

              squares.push(
                <SVGSquareElem
                  key={key}
                  className={classNames(`square ${squareLightClass}`)}
                />
              );

              if (
                selectedPiece
                && selectedPiece.location.type === PieceLocationEnum.BOARD
                && Game.areSquaresEqual(selectedPiece.location, square)
              ) {
                selectedSquare = (
                  <SVGSquareElem
                    key={key}
                    className="selected-square"
                  />
                );
              }

              if (
                currentMove && (
                  (
                    currentMove.from
                    && currentMove.from.type !== PieceLocationEnum.POCKET
                    && Game.areSquaresEqual(currentMove.from, square)
                  ) || (
                    currentMove.to
                    && Game.areSquaresEqual(currentMove.to, square)
                  )
                )
              ) {
                currentMoveSquares.push(
                  <SVGSquareElem
                    key={key}
                    className="current-move-square"
                  />
                );
              }

              if (isAllowed(square)) {
                allowedSquares.push(
                  <SVGSquareElem
                    key={key}
                    className="allowed-square"
                  />
                );
              }

              if (this.isInCheck(square)) {
                checkSquares.push(
                  <SVGSquareElem
                    key={key}
                    className="check-square"
                  />
                );
              }

              if (withLiterals) {
                if (
                  rankY === (
                    isBlackBase && !isHexagonalChess
                      ? isCircularChess
                        ? boardOrthodoxHeight
                        : boardHeight - 1
                      : 0
                  )
                ) {
                  const fileLiteral = Game.getFileLiteral(fileX);
                  let transform = baseParams.transform;

                  if (isCircularChess) {
                    const r = rOuter - (fileX + 1) * rDiff;

                    transform = `translate(${half},${half + r})`;
                  } else if (isHexagonalChess) {
                    const fileAdjustmentX = fileX * 3 + 0.25;
                    const translateX = (
                      isBlackBase
                        ? boardWidth * 3 - fileAdjustmentX
                        : fileAdjustmentX + 1
                    ) * squareSize / 2 / Math.sqrt(3);
                    const rankAdjustmentY = 1 / 2 * Math.abs(fileX - middleFileX) + 0.17;
                    const translateY = (
                      isBlackBase
                        ? rankAdjustmentY
                        : boardHeight - rankAdjustmentY
                    ) * squareSize;

                    transform = `translate(${translateX},${translateY})`;
                  }

                  literals.push(
                    <g {...baseParams} key={`${key}-file`} transform={transform}>
                      <text
                        className={`literal file-literal ${literalLightClass}`}
                        transform={
                          isCircularChess
                            ? `translate(${-literalMargin - literalFontSize / 2 * (fileLiteral.length)},${literalFontSize * 1.05})`
                            : isHexagonalChess
                              ? undefined
                              : `translate(${literalMargin}, ${squareSize - literalMargin})`
                        }
                        fontSize={literalFontSize}
                        alignmentBaseline={isHexagonalChess ? 'middle' : undefined}
                        textAnchor={isHexagonalChess ? 'middle' : undefined}
                      >
                        {fileLiteral}
                      </text>
                    </g>
                  );
                }

                if (
                  initialFileX === (
                    (isBlackBase && !isHexagonalChess) || isCircularChess
                      ? 0
                      : isHexagonalChess && rankY > middleRankY
                        ? boardWidth - 1 - (rankY - middleRankY)
                        : boardWidth - 1
                  )
                ) {
                  const rankLiteral = Game.getRankLiteral(rankY);
                  let transform = baseParams.transform;

                  if (isCircularChess) {
                    const angleDiff = 2 * Math.PI / boardHeight;
                    const angle = (rankY + 1) * angleDiff + (isBlackBase ? Math.PI : 0) - Math.PI / 80;
                    const r = rOuter - rDiff * 0.25;
                    const translateX = half - r * Math.sin(angle);
                    const translateY = half + r * Math.cos(angle);

                    transform = `translate(${translateX},${translateY})`;
                  } else if (isHexagonalChess) {
                    const fileAdjustmentX = fileX * 3 + 1.85 - (isBlackBase ? 0.1 : rankLiteral.length * 0.1);
                    const translateX = (
                      isBlackBase
                        ? boardWidth * 3 - fileAdjustmentX
                        : fileAdjustmentX + 1
                    ) * squareSize / 2 / Math.sqrt(3);
                    const rankAdjustmentY = rankY + 1 + 1 / 2 * Math.abs(fileX - middleFileX) - 0.2;
                    const translateY = (
                      isBlackBase
                        ? rankAdjustmentY + 0.05
                        : boardHeight - rankAdjustmentY + 0.05
                    ) * squareSize;

                    transform = `translate(${translateX},${translateY})`;
                  }

                  literals.push(
                    <g {...baseParams} key={`${key}-rank`} transform={transform}>
                      <text
                        className={`literal rank-literal ${literalLightClass}`}
                        transform={
                          isCircularChess || isHexagonalChess
                            ? undefined
                            : `translate(${squareSize - literalMargin - literalFontSize / 2 * (rankLiteral.length)}, ${literalFontSize * 1.12})`
                        }
                        fontSize={literalFontSize}
                        alignmentBaseline={isCircularChess || isHexagonalChess ? 'middle' : undefined}
                        textAnchor={isCircularChess || isHexagonalChess ? 'middle' : undefined}
                      >
                        {rankLiteral}
                      </text>
                    </g>
                  );
                }
              }

              if (isHiddenSquare(square)) {
                hiddenSquares.push(
                  <SVGSquareElem
                    key={key}
                    className="hidden-square"
                  />
                );
              }

              if (!_.isEmpty(centerSquareParams)) {
                if (centerSquareParams.top) {
                  centerBorders.push(
                    <g {...baseParams} key={`${key}-top`}>
                      <line
                        className="center-border"
                        transform={isBlackBase ? undefined : `translate(0, ${squareSize})`}
                        x1={0}
                        y1={0}
                        x2={squareSize}
                        y2={0}
                      />
                    </g>
                  );
                }

                if (centerSquareParams.bottom) {
                  centerBorders.push(
                    <g {...baseParams} key={`${key}-bottom`}>
                      <line
                        className="center-border"
                        transform={isBlackBase ? undefined : `translate(0, -${squareSize})`}
                        x1={0}
                        y1={squareSize}
                        x2={squareSize}
                        y2={squareSize}
                      />
                    </g>
                  );
                }

                if (centerSquareParams.left) {
                  centerBorders.push(
                    <g {...baseParams} key={`${key}-left`}>
                      <line
                        className="center-border"
                        transform={isBlackBase ? `translate(${squareSize}, 0)` : undefined}
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={squareSize}
                      />
                    </g>
                  );
                }

                if (centerSquareParams.right) {
                  centerBorders.push(
                    <g {...baseParams} key={`${key}-right`}>
                      <line
                        className="center-border"
                        transform={isBlackBase ? `translate(-${squareSize}, 0)` : undefined}
                        x1={squareSize}
                        y1={0}
                        x2={squareSize}
                        y2={squareSize}
                      />
                    </g>
                  );
                }
              }
            });
          });

          return (
            <svg
              key={board}
              className="board"
              style={isCircularChess ? {
                width: maximumSize * squareSize,
                height: maximumSize * squareSize
              } : {
                width: isHexagonalChess
                  ? (boardWidth * 3 + 1) * squareSize / 2 / Math.sqrt(3)
                  : boardWidth * squareSize,
                height: boardHeight * squareSize
              }}
            >
              <radialGradient id="allowed-grad" r="100%" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(0,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <radialGradient id="check-grad" r="80%" cx="50%" cy="50%">
                <stop offset="0%" stopColor="red" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              {squares}
              {selectedSquare}
              {currentMoveSquares}
              {allowedSquares}
              {checkSquares}
              {literals}
              {allPieces.map((piece) => (
                <BoardPiece
                  key={piece.id}
                  game={game}
                  piece={piece}
                  isBlackBase={isBlackBase}
                  isFantom={piece.isFantom}
                  isFullFantom={(piece.isFantom && !showFantomPieces) || !piece.location}
                  boardsShiftX={boardsShiftX}
                  squareSize={squareSize}
                  onClick={enableClick ? this.onSquareClick : undefined}
                  onDragStart={enableDnd ? this.onPieceDragStart : undefined}
                />
              ))}
              {hiddenSquares}
              {voidSquares}
              {centerBorders}
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
