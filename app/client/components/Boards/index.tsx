import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames = require('classnames');

import {
  AnyMove,
  BaseMove,
  BoardPiece as IBoardPiece,
  CenterSquareParams,
  ColorEnum,
  Piece as IPiece,
  PieceLocationEnum,
  PiecePocketLocation,
  Player,
  PossibleMove,
  RealPiece,
  Square
} from '../../../types';
import { Game } from '../../helpers';
import { ReduxState } from '../../store';

import BoardPiece from '../BoardPiece';
import Piece from '../Piece';
import Modal from '../Modal';

import './index.less';

export interface OwnProps {
  game: Game;
  player: Player | null;
  selectedPiece: RealPiece | null;
  selectPiece(piece: IPiece | null): void;
  readOnly: boolean;
  isBlackBase: boolean;
  darkChessMode: ColorEnum | null;
  currentMove: AnyMove | undefined;
  boardsShiftX: number;
  pieces: ReadonlyArray<IPiece>;

  withLiterals?: boolean;
  showFantomPieces?: boolean;
  squareSize?: number;
}

interface State {
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps>;

class Boards extends React.Component<Props, State> {
  static defaultProps = {
    withLiterals: true
  };

  boardsRef = React.createRef<HTMLDivElement>();
  state: State = {
    promotionModalVisible: false,
    promotionMove: null
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.isBlackBase !== this.props.isBlackBase) {
      this.boardsRef.current!.classList.add('no-transition');

      setTimeout(() => {
        this.boardsRef.current!.classList.remove('no-transition');
      }, 0);
    }
  }

  getAllowedMoves(): (PossibleMove & { realSquare: Square; })[] {
    const {
      game,
      selectedPiece
    } = this.props;

    if (!selectedPiece) {
      return [];
    }

    const allowedMoves = game.getAllowedMoves(selectedPiece).map((move) => ({
      ...move,
      realSquare: move.square
    }));

    // add own rooks as castling move targets
    if (!game.is960) {
      [...allowedMoves].forEach(({ square, castling }) => {
        if (castling) {
          allowedMoves.push({
            square: castling.rook.location,
            realSquare: square,
            capture: null,
            castling,
            isPawnPromotion: false
          });
        }
      });
    }

    return allowedMoves;
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
      game
    } = this.props;

    if (game.isAntichess) {
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
      selectPiece
    } = this.props;
    const playerColor = player!.color;

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

    if (!allowedMoves.length) {
      const pieceInSquare = game.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        return;
      }

      return selectPiece(pieceInSquare);
    }

    const move: BaseMove = {
      from: selectedPiece.location,
      to: allowedMoves[0].realSquare
    };

    if (allowedMoves.some(({ isPawnPromotion }) => isPawnPromotion)) {
      this.setState({
        promotionModalVisible: true,
        promotionMove: move
      });
    } else {
      game.move(move);
    }

    selectPiece(null);
  };

  closePromotionPopup = () => {
    this.setState({
      promotionModalVisible: false,
      promotionMove: null
    });
  };

  promoteToPiece = (location: PiecePocketLocation) => {
    const {
      game
    } = this.props;

    game.move({
      ...this.state.promotionMove!,
      promotion: location.pieceType
    });
    this.closePromotionPopup();
  };

  render() {
    const {
      game,
      player,
      selectedPiece,
      readOnly,
      pieces,
      withLiterals,
      currentMove,
      isBlackBase,
      darkChessMode,
      boardsShiftX,
      showFantomPieces,
      squareSize: propsSquareSize
    } = this.props;

    const squareSize = propsSquareSize || (game.isChessence ? 60 : game.isAliceChess ? 45 : 70);
    const literalSize = withLiterals ? Math.ceil(squareSize * 0.3) : 0;
    const literalFontSize = Math.ceil(literalSize * 0.85);
    const literalMargin = literalFontSize / 3;
    const cornerPieceSize = squareSize * 2 / 7;
    const allowedMoves = this.getAllowedMoves();
    const visibleSquares = game.isDarkChess && darkChessMode ? game.getVisibleSquares(darkChessMode) : [];
    const boardPieces = (pieces || game.pieces).filter(Game.isBoardPiece);
    const isHiddenSquare = (square: Square): boolean => (
      !!darkChessMode
      && game.isDarkChess
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
          antichess: game.isAntichess
        })}
      >
        {_.times(game.boardCount, (board) => {
          const squares: JSX.Element[] = [];
          const currentMoveSquares: JSX.Element[] = [];
          const allowedSquares: JSX.Element[] = [];
          const checkSquares: JSX.Element[] = [];
          const literals: JSX.Element[] = [];
          const hiddenSquares: JSX.Element[] = [];
          const voidSquares: JSX.Element[] = [];
          const centerBorders: JSX.Element[] = [];
          let selectedSquare: JSX.Element | null = null;
          const pieces = boardPieces
            .filter(({ location }) => location.board === board)
            .map((piece) => ({ ...piece, isFantom: false }));
          let fantomPieces: (IBoardPiece & { isFantom: boolean; })[] = [];

          if (game.isAliceChess) {
            const prevBoard = game.getPrevBoard(board);

            fantomPieces = boardPieces
              .filter(({ location }) => location.board === prevBoard)
              .map((piece) => ({ ...piece, location: { ...piece.location, board }, isFantom: true }));
          }

          const allPieces = _.sortBy([
            ...pieces,
            ...fantomPieces
          ], 'id');

          _.times(game.boardHeight, (rankY) => {
            _.times(game.boardWidth, (fileX) => {
              const initialFileX = fileX;

              fileX = game.adjustFileX(fileX + (isBlackBase ? boardsShiftX : -boardsShiftX));

              const square = {
                board,
                x: fileX,
                y: rankY
              };
              const translateX = squareSize * (
                isBlackBase
                  ? game.boardHeight - 1 - initialFileX
                  : initialFileX
              );
              const translateY = squareSize * (
                isBlackBase
                  ? rankY
                  : game.boardWidth - 1 - rankY
              );
              const baseParams = {
                key: `${rankY}-${fileX}`,
                transform: `translate(${translateX}, ${translateY})`,
                onClick: readOnly ? undefined : (() => this.onSquareClick(square))
              };
              const squareParams = {
                ...baseParams,
                width: squareSize,
                height: squareSize
              };
              const centerSquareParams = this.getSquareParams(square);
              const isLight = (rankY + fileX) % 2;

              squares.push(
                <rect
                  className={classNames(`square ${isLight ? 'light' : 'dark'}`)}
                  {...squareParams}
                />
              );

              if (
                selectedPiece
                && selectedPiece.location.type === PieceLocationEnum.BOARD
                && Game.areSquaresEqual(selectedPiece.location, square)
              ) {
                selectedSquare = (
                  <rect className="selected-square" {...squareParams} />
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
                  <rect className="current-move-square" {...squareParams} />
                );
              }

              if (isAllowed(square)) {
                allowedSquares.push(
                  <rect className="allowed-square" {...squareParams} />
                );
              }

              if (this.isInCheck(square)) {
                checkSquares.push(
                  <rect className="check-square" {...squareParams} />
                );
              }

              if (withLiterals) {
                if (rankY === (isBlackBase ? game.boardHeight - 1 : 0)) {
                  literals.push(
                    <g {...baseParams} key={`${baseParams.key}-file`}>
                      <text
                        className={`literal file-literal ${isLight ? 'dark' : 'light'}`}
                        transform={`translate(${literalMargin}, ${squareSize - literalMargin})`}
                        fontSize={literalFontSize}
                      >
                        {Game.getFileLiteral(fileX)}
                      </text>
                    </g>
                  );
                }

                if (initialFileX === (isBlackBase ? 0 : game.boardWidth - 1)) {
                  literals.push(
                    <g {...baseParams} key={`${baseParams.key}-rank`}>
                      <text
                        className={`literal rank-literal ${isLight ? 'dark' : 'light'}`}
                        transform={`translate(${squareSize - literalFontSize * 0.86}, ${literalFontSize * 1.12})`}
                        fontSize={literalFontSize}
                      >
                        {Game.getRankLiteral(rankY)}
                      </text>
                    </g>
                  );
                }
              }

              if (isHiddenSquare(square)) {
                hiddenSquares.push(
                  <rect className="hidden-square" {...squareParams} />
                );
              }

              if (game.isVoidSquare(square)) {
                voidSquares.push(
                  <rect className="void-square" {...squareParams} />
                );
              }

              if (!_.isEmpty(centerSquareParams)) {
                if (centerSquareParams.top) {
                  centerBorders.push(
                    <g {...baseParams} key={`${baseParams.key}-top`}>
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
                    <g {...baseParams} key={`${baseParams.key}-bottom`}>
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
                    <g {...baseParams} key={`${baseParams.key}-left`}>
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
                    <g {...baseParams} key={`${baseParams.key}-right`}>
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
              style={{
                width: squareSize * game.boardWidth,
                height: squareSize * game.boardHeight
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
                  boardWidth={game.boardWidth}
                  boardHeight={game.boardHeight}
                  boardsShiftX={boardsShiftX}
                  squareSize={squareSize}
                  cornerPieceSize={cornerPieceSize}
                  onClick={readOnly ? undefined : this.onSquareClick}
                />
              ))}
              {hiddenSquares}
              {voidSquares}
              {centerBorders}
            </svg>
          );
        })}
        <Modal
          visible={this.state.promotionModalVisible}
          onOverlayClick={this.closePromotionPopup}
          className="promotion-modal"
        >
          <div className="modal-content">
            {game.validPromotions.map((pieceType) => (
              <Piece
                key={pieceType}
                piece={{
                  type: pieceType,
                  color: player ? player.color : ColorEnum.WHITE,
                  location: {
                    type: PieceLocationEnum.POCKET,
                    pieceType
                  }
                }}
                onClick={this.promoteToPiece}
              />
            ))}
          </div>
        </Modal>
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
