import * as _ from 'lodash';
import * as React from 'react';

import {
  BaseMove,
  Board as IBoard,
  ColorEnum,
  GamePieces,
  Move,
  Piece as IPiece,
  PieceEnum,
  PieceLocationEnum,
  Player,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import { Game } from '../../helpers';
import BoardPiece from '../BoardPiece';
import classNames = require('classnames');

interface OwnProps {
  pieces: GamePieces;
  board: IBoard;
  player: Player | null;
  turn: ColorEnum;
  selectedPiece: RealPiece | null;
  selectPiece(piece: IPiece | null): void;
  getAllowedMoves(location: RealPieceLocation): Square[];
  sendMove(move: BaseMove): void;
  isCheck: boolean;
  readOnly: boolean;
  withLiterals: boolean;
  isBlackBase: boolean;
  currentMove: Move | undefined;
}

type Props = OwnProps;

export default class Board extends React.Component<Props> {
  static defaultProps = {
    withLiterals: true
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
      selectedPiece,
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

    sendMove({
      from: selectedPiece.location,
      to: square,
      promotion: PieceEnum.QUEEN
    });

    selectPiece(null);
  };

  render() {
    const {
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
                    className={`square ${(rankY + fileX) % 2 ? 'white' : 'black'}`}
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
      </div>
    );
  }
}
