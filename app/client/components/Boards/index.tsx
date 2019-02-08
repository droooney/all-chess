import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames = require('classnames');

import {
  AnyMove,
  BaseMove,
  BoardPiece as IBoardPiece,
  ColorEnum,
  Piece as IPiece,
  PieceBoardLocation,
  PieceTypeEnum,
  PieceLocationEnum,
  PiecePocketLocation,
  Player,
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

  pieces?: ReadonlyArray<IPiece>;
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

  isAllowed(square: Square, allowedMoves: Square[]): boolean {
    return allowedMoves.some((allowedSquare) => Game.areSquaresEqual(square, allowedSquare));
  }

  getAllowedMoves(): Square[] {
    const {
      game,
      selectedPiece
    } = this.props;

    if (!selectedPiece) {
      return [];
    }

    const allowedMoves = game.getAllowedMoves(selectedPiece);

    // add own rooks as castling move targets
    if (!game.is960) {
      [...allowedMoves].forEach((square) => {
        if (
          game.isCastling({
            from: selectedPiece.location,
            to: square
          })
        ) {
          const isKingSideCastling = square.x - (selectedPiece.location as PieceBoardLocation).x > 0;

          allowedMoves.push({
            ...square,
            x: isKingSideCastling ? game.boardWidth - 1 : 0
          });
        }
      });
    }

    return allowedMoves;
  }

  getSquareClasses(square: Square): string[] {
    const {
      game
    } = this.props;

    if (!game.isKingOfTheHill) {
      return [];
    }

    const params = game.getCenterSquareParams(square);

    if (!params) {
      return [];
    }

    return _.keys(params).map((direction) => `border-${direction}`);
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
      pieceInSquare.type === PieceTypeEnum.KING
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

    if (!this.isAllowed(square, this.getAllowedMoves())) {
      const pieceInSquare = game.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        return;
      }

      return selectPiece(pieceInSquare);
    }

    let toSquare = square;
    const pieceInSquare = game.getBoardPiece(square);

    // if clicked on own rook for castling
    if (
      !game.is960
      && selectedPiece.type === PieceTypeEnum.KING
      && selectedPiece.location.type === PieceLocationEnum.BOARD
      && pieceInSquare
      && pieceInSquare.type === PieceTypeEnum.ROOK
      && pieceInSquare.color === playerColor
    ) {
      toSquare = {
        ...square,
        x: pieceInSquare.location.x - selectedPiece.location.x > 0
          ? game.boardWidth - 2
          : 2
      };
    }

    const move = {
      from: selectedPiece.location,
      to: toSquare,
      promotion: PieceTypeEnum.QUEEN
    };

    if (game.isPawnPromotion(move)) {
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
      showFantomPieces,
      squareSize: propsSquareSize
    } = this.props;
    const squareSize = propsSquareSize || (game.isChessence ? 60 : game.isAliceChess ? 45 : 70);
    const literalSize = withLiterals ? Math.ceil(squareSize * 0.3) : 0;
    const literalFontSize = Math.ceil(literalSize * 0.85);
    const allowedMoves = this.getAllowedMoves();
    const visibleSquares = game.isDarkChess && darkChessMode ? game.getVisibleSquares(darkChessMode) : [];
    const boardPieces = (pieces || game.pieces).filter(Game.isBoardPiece);
    const isHiddenSquare = (square: Square): boolean => (
      !!darkChessMode
      && game.isDarkChess
      && visibleSquares.every((visibleSquare) => !Game.areSquaresEqual(square, visibleSquare))
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
          const emptyCorner = (
            <div
              className="empty-corner"
              style={{ width: literalSize, height: literalSize }}
            />
          );
          const filesElement = (
            <div className="rank">
              {(board === 0 || isBlackBase) && emptyCorner}
              {_.times(game.boardWidth, (file) => (
                <div
                  key={file}
                  className="file-literal"
                  style={{
                    fontSize: literalFontSize,
                    width: squareSize,
                    height: literalSize
                  }}
                >
                  {Game.getFileLiteral(file)}
                </div>
              ))}
              {(board === 0 || !isBlackBase) && emptyCorner}
            </div>
          );
          const pieces = boardPieces
            .filter(({ location }) => location.board === board)
            .map((piece) => ({ ...piece, isFantom: false }));
          let fantomPieces: (IBoardPiece & { isFantom: boolean; })[] = [];

          if (game.isAliceChess && showFantomPieces) {
            const prevBoard = game.getPrevBoard(board);

            fantomPieces = boardPieces
              .filter(({ location }) => location.board === prevBoard)
              .map((piece) => ({ ...piece, location: { ...piece.location, board }, isFantom: true }));
          }

          const allPieces = _.sortBy([
            ...pieces,
            ...fantomPieces
          ], 'id');

          return (
            <div key={board} className="board">
              {withLiterals && filesElement}
              {_.times(game.boardHeight, (rankY) => {
                const rankLiteral = (
                  <div
                    className="rank-literal"
                    style={{
                      fontSize: literalFontSize,
                      width: literalSize,
                      height: squareSize
                    }}
                  >
                    {Game.getRankLiteral(rankY)}
                  </div>
                );

                return (
                  <div
                    key={rankY}
                    className="rank"
                  >
                    {withLiterals && (board === 0 || isBlackBase) && rankLiteral}
                    {_.times(game.boardWidth, (fileX) => {
                      const square = {
                        board,
                        x: fileX,
                        y: rankY
                      };

                      return (
                        <div
                          key={fileX}
                          className={classNames(
                            `square ${(rankY + fileX) % 2 ? 'white' : 'black'}`,
                            this.getSquareClasses(square)
                          )}
                          style={{
                            width: squareSize,
                            height: squareSize
                          }}
                          onClick={readOnly ? undefined : (() => this.onSquareClick(square))}
                        >
                          {
                            selectedPiece
                            && selectedPiece.location.type === PieceLocationEnum.BOARD
                            && Game.areSquaresEqual(selectedPiece.location, square)
                            && (
                              <div className="selected-square" />
                            )
                          }
                          {currentMove && (
                            (
                              currentMove.from
                              && currentMove.from.type !== PieceLocationEnum.POCKET
                              && Game.areSquaresEqual(currentMove.from, square)
                            ) || (
                              currentMove.to
                              && Game.areSquaresEqual(currentMove.to, square)
                            )
                          ) && (
                            <div className="current-move-square" />
                          )}
                          {this.isAllowed(square, allowedMoves) && (
                            <div className="allowed-square" />
                          )}
                          {this.isInCheck(square) && (
                            <div className="check-square" />
                          )}
                          {game.isVoidSquare(square) && (
                            <div className="void-square" />
                          )}
                          {isHiddenSquare(square) && (
                            <div className="hidden-square" />
                          )}
                        </div>
                      );
                    })}
                    {withLiterals && (board === 0 || !isBlackBase) && rankLiteral}
                  </div>
                );
              })}
              {withLiterals && filesElement}
              {allPieces.map((piece) => (
                <BoardPiece
                  key={piece.id}
                  piece={piece}
                  isBlackBase={isBlackBase}
                  isFantom={piece.isFantom}
                  boardWidth={game.boardWidth}
                  boardHeight={game.boardHeight}
                  squareSize={squareSize}
                  literalSize={literalSize}
                  onClick={readOnly ? undefined : this.onSquareClick}
                />
              ))}
            </div>
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
