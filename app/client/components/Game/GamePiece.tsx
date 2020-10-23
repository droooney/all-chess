import classNames from 'classnames';
import * as React from 'react';

import {
  RealPiece,
} from 'shared/types';

import Piece from '../Piece';

interface OwnProps {
  piece: RealPiece;
  pieceSize: number;

  className?: string;
  originalPieceClassName?: string;
}

type Props = OwnProps;

export default class GamePiece extends React.Component<Props> {
  render() {
    const {
      piece,
      pieceSize,
      className,
      originalPieceClassName,
    } = this.props;
    const cornerPieceSize = pieceSize * 2 / 7;
    const originalPieceCoords = {
      x: pieceSize - cornerPieceSize,
      y: pieceSize - cornerPieceSize,
    };

    return (
      <svg>
        <Piece
          width={pieceSize}
          height={pieceSize}
          color={piece.color}
          type={piece.abilities || piece.type}
          location={piece.location}
          className={className}
        />

        {(piece.abilities || piece.type !== piece.originalType) && (
          <React.Fragment>
            <circle
              cx={originalPieceCoords.x + cornerPieceSize / 2}
              cy={originalPieceCoords.y + cornerPieceSize / 2}
              r={cornerPieceSize / 2}
              className={classNames('original-piece', originalPieceClassName)}
            />
            <Piece
              {...originalPieceCoords}
              width={cornerPieceSize}
              height={cornerPieceSize}
              color={piece.color}
              type={piece.abilities ? piece.type : piece.originalType}
              location={piece.location}
            />
          </React.Fragment>
        )}
      </svg>
    );
  }
}
