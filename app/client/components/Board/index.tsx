import * as _ from 'lodash';
import * as React from 'react';
import classNames = require('classnames');

import {
  Board as IBoard,
  ColorEnum,
  GamePieces,
  Move,
  Piece as IPiece,
  PieceEnum,
  Player,
  Square
} from '../../../types';
import { Game } from '../../helpers';
import Piece from '../Piece';

interface OwnProps {
  pieces: GamePieces;
  board: IBoard;
  player: Player | null;
  turn: ColorEnum;
  getAllowedMoves(square: Square): Square[];
  sendMove(move: Move): void;
  isCheck: boolean;
  readOnly: boolean;
  withLiterals: boolean;
  isBlackBase: boolean;
  currentMove: Move | undefined;
}

interface State {
  selectedPiece: IPiece | null;
}

type Props = OwnProps;

export default class Board extends React.Component<Props, State> {
  static defaultProps = {
    withLiterals: true
  };

  state: State = {
    selectedPiece: null
  };

  componentDidUpdate(prevProps: Props) {
    if (this.props.readOnly && !prevProps.readOnly) {
      this.setState({
        selectedPiece: null
      });
    }
  }

  areSquaresEqual(square1: Square, square2: Square): boolean {
    return (
      square1.y === square2.y
      && square1.x === square2.x
    );
  }

  isAllowed(square: Square, state: State = this.state): boolean {
    const {
      getAllowedMoves
    } = this.props;
    const {
      selectedPiece
    } = state;

    if (!selectedPiece) {
      return false;
    }

    return getAllowedMoves(selectedPiece.square).some((allowedSquare) => this.areSquaresEqual(square, allowedSquare));
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

  onSquareClick = (square: Square) => {
    const {
      board,
      player,
      sendMove
    } = this.props;

    this.setState((state) => {
      if (!state.selectedPiece) {
        const piece = board[square.y][square.x];

        if (!piece || player!.color !== piece.color) {
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

      sendMove({
        from: state.selectedPiece.square,
        to: square,
        timestamp: Date.now(),
        promotion: PieceEnum.QUEEN
      });

      return {
        selectedPiece: null
      };
    });
  };

  render() {
    const {
      readOnly,
      board,
      pieces,
      withLiterals,
      currentMove,
      isBlackBase
    } = this.props;
    const {
      selectedPiece
    } = this.state;
    const files = _.keys(
      _.reduce(board, (files, rank) => (
        _.assign(files, _.keys(rank))
      ), {})
    )
      .map((rank) => +rank)
      .sort();
    const maxRank = Math.max(..._.keys(board).map((rank) => +rank));
    const maxFile = Math.max(...files);
    const filesElement = (
      <div className="rank">
        <div className="empty-corner" />
        {files.map((file) => (
          <div key={file} className="file-literal">
            {Game.getFileLiteral(file)}
          </div>
        ))}
        <div className="empty-corner" />
      </div>
    );

    return (
      <div className={classNames('board', {
        opposite: isBlackBase
      })}>
        {withLiterals && filesElement}
        {_.map(board, (rank, rankY) => {
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
              {_.times(maxFile + 1, (fileX) => {
                if (!(fileX in rank)) {
                  return (
                    <div className="square" />
                  );
                }

                const square = {
                  x: +fileX,
                  y: +rankY
                };

                return (
                  <div
                    key={fileX}
                    className={`square ${(+rankY + +fileX) % 2 ? 'white' : 'black'}`}
                    onClick={readOnly ? undefined : (() => this.onSquareClick(square))}
                  >
                    {selectedPiece && this.areSquaresEqual(selectedPiece.square, square) && (
                      <div className="selected-square" />
                    )}
                    {currentMove && (
                      this.areSquaresEqual(currentMove.from, square)
                      || this.areSquaresEqual(currentMove.to, square)
                    ) && (
                      <div className="current-move-square" />
                    )}
                    {this.isAllowed(square) && (
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
        {_.flatten(_.map(pieces)).map((piece) => (
          <Piece
            key={piece.id}
            piece={piece}
            isBlackBase={isBlackBase}
            maxRank={maxRank}
            maxFile={maxFile}
            onClick={readOnly ? undefined : this.onSquareClick}
          />
        ))}
      </div>
    );
  }
}
