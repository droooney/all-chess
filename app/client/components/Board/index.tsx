import * as _ from 'lodash';
import * as React from 'react';
import classNames = require('classnames');
import { Socket } from 'socket.io-client';

import {
  Board as IBoard,
  ColorEnum,
  Piece as IPiece,
  PieceEnum,
  Player,
  Square
} from '../../../types';
import Piece from '../Piece';

interface OwnProps {
  board: IBoard;
  player: Player | null;
  turn: ColorEnum;
  socket: Socket;
  isCheck: boolean;
}

interface State {
  selectedPiece: IPiece | null;
}

type Props = OwnProps;

export default class Board extends React.Component<Props, State> {
  state: State = {
    selectedPiece: null
  };

  areSquaresEqual(square1: Square, square2: Square): boolean {
    return (
      square1.y === square2.y
      && square1.x === square2.x
    );
  }

  isAllowed(square: Square, state: State = this.state): boolean {
    const {
      selectedPiece
    } = state;

    if (!selectedPiece) {
      return false;
    }

    return selectedPiece.allowedMoves.some((allowedSquare) => this.areSquaresEqual(square, allowedSquare));
  }

  isInCheck(square: Square): boolean {
    const {
      board,
      turn,
      isCheck
    } = this.props;
    const piece = board[square.y][square.x];

    if (!piece) {
      return false;
    }

    return (
      piece.type === PieceEnum.KING
      && piece.color === turn
      && isCheck
    );
  }

  onSquareClick(square: Square) {
    const {
      board,
      player,
      turn,
      socket
    } = this.props;

    if (!player || player.color !== turn) {
      return;
    }

    this.setState((state) => {
      if (!state.selectedPiece) {
        const piece = board[square.y][square.x];

        if (!piece || player.color !== piece.color) {
          return null;
        }

        return {
          selectedPiece: piece
        };
      }

      if (this.areSquaresEqual(square, state.selectedPiece.square)) {
        return {
          selectedPiece: null
        };
      }

      if (!this.isAllowed(square, state)) {
        const piece = board[square.y][square.x];

        return piece
          ? { selectedPiece: piece }
          : null;
      }

      socket.emit('move', {
        from: state.selectedPiece.square,
        to: square,
        promotion: PieceEnum.QUEEN
      });

      return {
        selectedPiece: null
      };
    });
  }

  render() {
    const {
      board,
      player
    } = this.props;
    const {
      selectedPiece
    } = this.state;

    return (
      <div className={classNames('board', {
        opposite: player && player.color === ColorEnum.BLACK
      })}>
        {_.map(board, (rank, rankY) => (
          <div
            key={rankY}
            className="rank"
          >
            {_.map(rank, (piece, fileX) => {
              const square = {
                x: +fileX,
                y: +rankY
              };

              return (
                <div
                  key={fileX}
                  className={`square ${(+rankY + +fileX) % 2 ? 'white' : 'black'}`}
                  onClick={() => this.onSquareClick(square)}
                >
                  {selectedPiece && this.areSquaresEqual(selectedPiece.square, square) && (
                    <div className="selected-square" />
                  )}
                  {this.isAllowed(square) && (
                    <div className="allowed-square" />
                  )}
                  {this.isInCheck(square) && (
                    <div className="check-square" />
                  )}
                  {piece && (
                    <Piece piece={piece} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
}
