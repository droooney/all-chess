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
          x: pieceX,
          y: pieceY
        }
      },
      isBlackBase,
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
          transform: `translate(${x * 70}px,${y * 70}px)`
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
