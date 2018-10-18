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

export interface OwnProps {
  pieces: IPiece[];
  boardCount: number;
  boardWidth: number;
  boardHeight: number;
  player: Player | null;
  selectedPiece: RealPiece | null;
  selectPiece(piece: IPiece | null): void;
  getPrevBoard(board: number): number;
  getAllowedMoves(piece: RealPiece): Square[];
  getVisibleSquares(): Square[];
  getBoardPiece(square: Square): IBoardPiece | null;
  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean;
  isPawnPromotion(move: BaseMove): boolean;
  isVoidSquare(square: Square): boolean;
  getCenterSquareParams(square: Square): CenterSquareParams;
  sendMove(move: BaseMove): void;
  readOnly: boolean;
  withLiterals: boolean;
  isKingOfTheHill: boolean;
  isAliceChess: boolean;
  isDarkChess: boolean;
  isBoardAtTop: boolean;
  isChessence: boolean;
  isBlackBase: boolean;
  darkChessMode: ColorEnum | null;
  currentMove: AnyMove | undefined;
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
      selectedPiece,
      getAllowedMoves
    } = this.props;

    return selectedPiece
      ? getAllowedMoves(selectedPiece)
      : [] as Square[];
  }

  getSquareClasses(square: Square): string[] {
    const {
      isKingOfTheHill,
      getCenterSquareParams
    } = this.props;

    if (!isKingOfTheHill) {
      return [];
    }

    const params = getCenterSquareParams(square);

    if (!params) {
      return [];
    }

    return _.keys(params).map((direction) => `border-${direction}`);
  }

  isInCheck(square: Square): boolean {
    const {
      getBoardPiece,
      isAttackedByOpponentPiece
    } = this.props;
    const pieceInSquare = getBoardPiece(square);

    if (!pieceInSquare) {
      return false;
    }

    return (
      pieceInSquare.type === PieceTypeEnum.KING
      && isAttackedByOpponentPiece(pieceInSquare.location, Game.getOppositeColor(pieceInSquare.color))
    );
  }

  onSquareClick = (square: Square) => {
    const {
      player,
      selectedPiece,
      getBoardPiece,
      isPawnPromotion,
      selectPiece,
      sendMove
    } = this.props;

    if (!selectedPiece) {
      const pieceInSquare = getBoardPiece(square);

      if (!pieceInSquare || player!.color !== pieceInSquare.color) {
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
      const pieceInSquare = getBoardPiece(square);

      if (!pieceInSquare || player!.color !== pieceInSquare.color) {
        return;
      }

      return selectPiece(pieceInSquare);
    }

    const move = {
      from: selectedPiece.location,
      to: square,
      promotion: PieceTypeEnum.QUEEN
    };

    if (isPawnPromotion(move)) {
      this.setState({
        promotionModalVisible: true,
        promotionMove: move
      });
    } else {
      sendMove(move);
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
      sendMove
    } = this.props;

    sendMove({
      ...this.state.promotionMove!,
      promotion: location.pieceType
    });
    this.closePromotionPopup();
  };

  render() {
    const {
      player,
      selectedPiece,
      readOnly,
      boardCount,
      boardWidth,
      boardHeight,
      pieces,
      withLiterals,
      currentMove,
      isBoardAtTop,
      isAliceChess,
      isChessence,
      isDarkChess,
      isBlackBase,
      darkChessMode,
      showFantomPieces,
      getVisibleSquares,
      isVoidSquare,
      getPrevBoard
    } = this.props;
    const squareSize = isChessence ? 60 : isAliceChess ? 45 : 70;
    const literalSize = isBoardAtTop ? 13 : 20;
    const literalFontSize = isBoardAtTop ? 10 : 16;
    const allowedMoves = this.getAllowedMoves();
    const visibleSquares = isDarkChess && darkChessMode ? getVisibleSquares() : [];
    const boardPieces = pieces.filter(Game.isBoardPiece);
    const isHiddenSquare = (square: Square): boolean => (
      !!darkChessMode
      && isDarkChess
      && visibleSquares.every((visibleSquare) => !Game.areSquaresEqual(square, visibleSquare))
    );

    return (
      <div ref={this.boardsRef} className={classNames('boards', { opposite: isBlackBase })}>
        {_.times(boardCount, (board) => {
          const emptyCorner = (
            <div
              className="empty-corner"
              style={{ width: literalSize, height: literalSize }}
            />
          );
          const filesElement = (
            <div className="rank">
              {(board === 0 || isBlackBase) && emptyCorner}
              {_.times(boardWidth, (file) => (
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

          if (isAliceChess && showFantomPieces) {
            const prevBoard = getPrevBoard(board);

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
              {_.times(boardHeight, (rankY) => {
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
                    {_.times(boardWidth, (fileX) => {
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
                          {isVoidSquare(square) && (
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
                  boardWidth={boardWidth}
                  boardHeight={boardHeight}
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
            {[PieceTypeEnum.QUEEN, PieceTypeEnum.ROOK, PieceTypeEnum.BISHOP, PieceTypeEnum.KNIGHT].map((pieceType) => (
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

function mapStateToProps(state: ReduxState) {
  return {
    showFantomPieces: state.gameSettings.showFantomPieces
  };
}

export default connect(mapStateToProps)(Boards);
