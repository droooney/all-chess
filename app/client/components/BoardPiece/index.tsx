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
  isFullFantom: boolean;
  boardWidth: number;
  boardHeight: number;
  boardsShiftX: number;
  squareSize: number;
  cornerPieceSize: number;

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
          x: pieceX,
          y: pieceY
        }
      },
      isBlackBase,
      isFantom,
      isFullFantom,
      squareSize,
      cornerPieceSize,
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
    const pieceClassNames = {
      fantom: isFantom,
      'full-fantom': isFullFantom
    };
    const originalPieceCoords = {
      x: squareSize - cornerPieceSize,
      y: squareSize - cornerPieceSize
    };

    return (
      <g
        className="piece-container"
        transform={`translate(${x * squareSize}, ${y * squareSize})`}
      >
        <Piece
          width={squareSize}
          height={squareSize}
          piece={{
            ...piece,
            type: piece.abilities || piece.type
          }}
          onClick={onClick}
          className={classNames(pieceClassNames)}
        />

        {(piece.abilities || piece.type !== piece.originalType) && (
          <React.Fragment>
            <rect
              {...originalPieceCoords}
              width={cornerPieceSize}
              height={cornerPieceSize}
              className={classNames('original-piece', pieceClassNames)}
            />
            <Piece
              {...originalPieceCoords}
              width={cornerPieceSize}
              height={cornerPieceSize}
              piece={{
                ...piece,
                type: piece.abilities
                  ? piece.type
                  : piece.originalType
              }}
              onClick={onClick}
            />
          </React.Fragment>
        )}
      </g>
    );
  }
}
