import * as _ from 'lodash';
import * as React from 'react';
import classNames = require('classnames');

import {
  BaseMove,
  Board as IBoard,
  CenterSquareParams,
  ColorEnum,
  GamePieces,
  Move,
  Piece as IPiece,
  PieceEnum,
  PieceLocationEnum,
  PiecePocketLocation,
  Player,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import { Game } from '../../helpers';

import BoardPiece from '../BoardPiece';
import Piece from '../Piece';
import Modal from '../Modal';

interface OwnProps {
  pieces: GamePieces;
  board: IBoard;
  player: Player | null;
  selectedPiece: RealPiece | null;
  selectPiece(piece: IPiece | null): void;
  getAllowedMoves(location: RealPieceLocation): Square[];
  isAttackedByOpponentPiece(square: Square, opponentColor: ColorEnum): boolean;
  isPawnPromotion(move: BaseMove): boolean;
  getOppositeColor(color: ColorEnum): ColorEnum;
  getCenterSquareParams(square: Square): CenterSquareParams;
  sendMove(move: BaseMove): void;
  readOnly: boolean;
  withLiterals: boolean;
  isKingOfTheHill: boolean;
  isBlackBase: boolean;
  currentMove: Move | undefined;
}

interface State {
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
}

type Props = OwnProps;

export default class Board extends React.Component<Props, State> {
  static defaultProps = {
    withLiterals: true
  };

  state: State = {
    promotionModalVisible: false,
    promotionMove: null
  };

  areSquaresEqual(square1: Square, square2: Square): boolean {
    return (
      square1.y === square2.y
      && square1.x === square2.x
    );
  }

  isAllowed(square: Square, allowedMoves: Square[]): boolean {
    return allowedMoves.some((allowedSquare) => this.areSquaresEqual(square, allowedSquare));
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
      board,
      getOppositeColor,
      isAttackedByOpponentPiece
    } = this.props;
    const piece = board[square.y][square.x];

    if (!piece) {
      return false;
    }

    return (
      piece.type === PieceEnum.KING
      && isAttackedByOpponentPiece(piece.location, getOppositeColor(piece.color))
    );
  }

  onSquareClick = (square: Square) => {
    const {
      board,
      player,
      selectedPiece,
      isPawnPromotion,
      selectPiece,
      sendMove
    } = this.props;

    if (!selectedPiece) {
      const piece = board[square.y][square.x];

      if (!piece || player!.color !== piece.color) {
        return;
      }

      return selectPiece(piece);
    }

    if (
      selectedPiece.location.type === PieceLocationEnum.BOARD
      && this.areSquaresEqual(square, selectedPiece.location)
    ) {
      return selectPiece(null);
    }

    if (!this.isAllowed(square, this.getAllowedMoves())) {
      const piece = board[square.y][square.x];

      if (!piece || player!.color !== piece.color) {
        return;
      }

      return selectPiece(piece);
    }

    const move = {
      from: selectedPiece.location,
      to: square,
      promotion: PieceEnum.QUEEN
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
      board,
      pieces,
      withLiterals,
      currentMove,
      isBlackBase
    } = this.props;
    const maxRank = board.length - 1;
    const maxFile = board[0].length - 1;
    const filesElement = (
      <div className="rank">
        <div className="empty-corner" />
        {board[0].map((_piece, file) => (
          <div key={file} className="file-literal">
            {Game.getFileLiteral(file)}
          </div>
        ))}
        <div className="empty-corner" />
      </div>
    );
    const allowedMoves = this.getAllowedMoves();

    return (
      <div className={classNames('board', {
        opposite: isBlackBase
      })}>
        {withLiterals && filesElement}
        {board.map((rank, rankY) => {
          const rankLiteral = (
            <div className="rank-literal">
              {Game.getRankLiteral(rankY)}
            </div>
          );

          return (
            <div
              key={rankY}
              className="rank"
            >
              {withLiterals && rankLiteral}
              {rank.map((_piece, fileX) => {
                const square = {
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
                    onClick={readOnly ? undefined : (() => this.onSquareClick(square))}
                  >
                    {
                      selectedPiece
                      && selectedPiece.location.type === PieceLocationEnum.BOARD
                      && this.areSquaresEqual(selectedPiece.location, square)
                      && (
                        <div className="selected-square" />
                      )
                    }
                    {currentMove && (
                      (
                        currentMove.from
                        && currentMove.from.type !== PieceLocationEnum.POCKET
                        && this.areSquaresEqual(currentMove.from, square)
                      ) || this.areSquaresEqual(currentMove.to, square)
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
              {withLiterals && rankLiteral}
            </div>
          );
        })}
        {withLiterals && filesElement}
        {
          _.flatten(_.map(pieces))
            .filter(Game.isBoardPiece)
            .map((piece) => (
              <BoardPiece
                key={piece.id}
                piece={piece}
                isBlackBase={isBlackBase}
                maxRank={maxRank}
                maxFile={maxFile}
                onClick={readOnly ? undefined : this.onSquareClick}
              />
            ))
        }
        <Modal
          visible={this.state.promotionModalVisible}
          onOverlayClick={this.closePromotionPopup}
          className="promotion-modal"
        >
          <div className="modal-content">
            {[PieceEnum.QUEEN, PieceEnum.ROOK, PieceEnum.BISHOP, PieceEnum.KNIGHT].map((pieceType) => (
              <Piece
                key={pieceType}
                piece={{
                  type: pieceType,
                  color: player!.color,
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
