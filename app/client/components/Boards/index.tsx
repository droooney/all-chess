import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames = require('classnames');

import {
  BaseMove,
  BoardPiece as IBoardPiece,
  CenterSquareParams,
  ColorEnum,
  Move,
  Piece as IPiece,
  PieceTypeEnum,
  PieceLocationEnum,
  PiecePocketLocation,
  Player,
  RealPiece,
  RealPieceLocation,
  Square,
  StartingBoard
} from '../../../types';
import { Game } from '../../helpers';
import { ReduxState } from '../../store';

import BoardPiece from '../BoardPiece';
import Piece from '../Piece';
import Modal from '../Modal';

export interface OwnProps {
  pieces: IPiece[];
  startingBoards: StartingBoard[];
  player: Player | null;
  selectedPiece: RealPiece | null;
  selectPiece(piece: IPiece | null): void;
  getPrevBoard(board: number): number;
  getAllowedMoves(location: RealPieceLocation): Square[];
  getBoardPiece(square: Square): IBoardPiece | null;
  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean;
  isPawnPromotion(move: BaseMove): boolean;
  getOppositeColor(color: ColorEnum): ColorEnum;
  getCenterSquareParams(square: Square): CenterSquareParams;
  sendMove(move: BaseMove): void;
  readOnly: boolean;
  withLiterals: boolean;
  isKingOfTheHill: boolean;
  isAliceChess: boolean;
  isBlackBase: boolean;
  currentMove: Move | undefined;
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

  state: State = {
    promotionModalVisible: false,
    promotionMove: null
  };

  isAllowed(square: Square, allowedMoves: Square[]): boolean {
    return allowedMoves.some((allowedSquare) => Game.areSquaresEqual(square, allowedSquare));
  }

  getAllowedMoves(): Square[] {
    const {
      selectedPiece,
      getAllowedMoves
    } = this.props;

    return selectedPiece
      ? getAllowedMoves(selectedPiece.location)
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
      getOppositeColor,
      isAttackedByOpponentPiece
    } = this.props;
    const pieceInSquare = getBoardPiece(square);

    if (!pieceInSquare) {
      return false;
    }

    return (
      pieceInSquare.type === PieceTypeEnum.KING
      && isAttackedByOpponentPiece(pieceInSquare.location, getOppositeColor(pieceInSquare.color))
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
      startingBoards,
      pieces,
      withLiterals,
      currentMove,
      isAliceChess,
      isBlackBase,
      showFantomPieces,
      getPrevBoard
    } = this.props;
    const maxRank = startingBoards[0].length - 1;
    const maxFile = startingBoards[0][0].length - 1;
    const squareSize = isAliceChess ? 45 : 70;
    const literalSize = isAliceChess ? 13 : 20;
    const literalFontSize = isAliceChess ? 10 : 16;
    const allowedMoves = this.getAllowedMoves();
    const boardPieces = pieces.filter(Game.isBoardPiece);

    return (
      <div className={classNames('boards', { opposite: isBlackBase })}>
        {startingBoards.map((board, boardNumber) => {
          const emptyCorner = (
            <div
              className="empty-corner"
              style={{ width: literalSize, height: literalSize }}
            />
          );
          const filesElement = (
            <div className="rank">
              {(boardNumber === 0 || isBlackBase) && emptyCorner}
              {startingBoards[0][0].map((_piece, file) => (
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
              {(boardNumber === 0 || !isBlackBase) && emptyCorner}
            </div>
          );

          return (
            <div key={boardNumber} className="board">
              {withLiterals && filesElement}
              {board.map((rank, rankY) => {
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
                    {withLiterals && (boardNumber === 0 || isBlackBase) && rankLiteral}
                    {rank.map((_piece, fileX) => {
                      const square = {
                        board: boardNumber,
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
                            ) || Game.areSquaresEqual(currentMove.to, square)
                          ) && (
                            <div className="current-move-square" />
                          )}
                          {this.isAllowed(square, allowedMoves) && (
                            <div className="allowed-square" />
                          )}
                          {this.isInCheck(square) && (
                            <div className="check-square" />
                          )}
                        </div>
                      );
                    })}
                    {withLiterals && (boardNumber === 0 || !isBlackBase) && rankLiteral}
                  </div>
                );
              })}
              {withLiterals && filesElement}
            </div>
          );
        })}
        {boardPieces.map((piece) => (
          <BoardPiece
            key={piece.id}
            piece={piece}
            isBlackBase={isBlackBase}
            isFantom={false}
            maxRank={maxRank}
            maxFile={maxFile}
            squareSize={squareSize}
            literalSize={literalSize}
            onClick={readOnly ? undefined : this.onSquareClick}
          />
        ))}
        {isAliceChess && showFantomPieces && boardPieces.map((piece) => (
          <BoardPiece
            key={piece.id}
            piece={{
              ...piece,
              location: {
                ...piece.location,
                board: getPrevBoard(piece.location.board)
              }
            }}
            isBlackBase={isBlackBase}
            isFantom
            maxRank={maxRank}
            maxFile={maxFile}
            squareSize={squareSize}
            literalSize={literalSize}
          />
        ))}
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
