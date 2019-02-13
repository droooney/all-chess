import * as React from 'react';
import classNames = require('classnames');

import {
  BoardPiece as IBoardPiece,
  PieceBoardLocation
} from '../../../types';
import { Game } from '../../helpers';

import Piece from '../Piece';

interface OwnProps {
  game: Game;
  piece: IBoardPiece;
  isBlackBase: boolean;
  isFantom: boolean;
  boardWidth: number;
  boardHeight: number;
  boardsShiftX: number;
  literalSize: number;
  squareSize: number;

  onClick?(location: PieceBoardLocation): void;
}

type Props = OwnProps;

export default class BoardPiece extends React.Component<Props> {
  render() {
    const {
      game,
      piece,
      piece: {
        location: {
          board: pieceBoard,
          x: pieceX,
          y: pieceY
        }
      },
      isBlackBase,
      isFantom,
      literalSize,
      squareSize,
      boardWidth,
      boardHeight,
      boardsShiftX,
      onClick
    } = this.props;
    const x = game.adjustFileX(
      boardsShiftX + (
        isBlackBase
          ? boardWidth - 1 - pieceX
          : pieceX
      )
    );
    const y = isBlackBase
      ? pieceY
      : boardHeight - 1 - pieceY;

    return (
      <div
        className="piece-container"
        style={{
          width: squareSize,
          height: squareSize,
          left: x * squareSize + (pieceBoard ? 0 : literalSize),
          top: y * squareSize + literalSize
        }}
      >
        <Piece
          piece={{
            ...piece,
            type: piece.abilities || piece.type
          }}
          onClick={onClick}
          className={classNames({ fantom: isFantom })}
        />

        {(piece.abilities || piece.type !== piece.originalType) && (
          <Piece
            className="original-piece"
            piece={{
              ...piece,
              type: piece.abilities
                ? piece.type
                : piece.originalType
            }}
            onClick={onClick}
          />
        )}
      </div>
    );
  }
}
