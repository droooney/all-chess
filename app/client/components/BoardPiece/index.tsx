import * as React from 'react';

import {
  BoardPiece as IBoardPiece,
  PieceBoardLocation
} from '../../../types';

import Piece from '../Piece';

interface OwnProps {
  piece: IBoardPiece;
  isBlackBase: boolean;
  maxRank: number;
  maxFile: number;
  literalSize: number;
  squareSize: number;
  onClick?(location: PieceBoardLocation): void;
}

type Props = OwnProps;

export default class BoardPiece extends React.Component<Props> {
  onClick = () => {
    const {
      piece,
      onClick
    } = this.props;

    onClick!(piece.location);
  };

  render() {
    const {
      piece,
      piece: {
        location: {
          board: pieceBoard,
          x: pieceX,
          y: pieceY
        }
      },
      isBlackBase,
      literalSize,
      squareSize,
      maxFile,
      maxRank,
      onClick
    } = this.props;
    const x = isBlackBase
      ? maxFile - pieceX
      : pieceX;
    const y = isBlackBase
      ? pieceY
      : maxRank - pieceY;

    return (
      <div
        className="piece-container"
        style={{
          width: squareSize,
          height: squareSize,
          left: x * squareSize + literalSize + (literalSize + (maxFile + 1) * squareSize) * pieceBoard,
          top: y * squareSize + literalSize
        }}
      >
        <Piece
          piece={piece}
          onClick={onClick}
        />

        {piece.type !== piece.originalType && (
          <Piece
            className="original-piece"
            piece={{
              ...piece,
              type: piece.originalType
            }}
            onClick={onClick}
          />
        )}
      </div>
    );
  }
}
