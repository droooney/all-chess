import * as React from 'react';
import classNames from 'classnames';

import {
  PieceBoardLocation,
  RealPiece,
  RealPieceLocation
} from '../../../types';

import Piece from '../Piece';

interface OwnProps {
  piece: RealPiece;
  pieceSize: number;

  className?: string;
  originalPieceClassName?: string;
  onClick?(location: PieceBoardLocation): void;
  onDragStart?(e: React.MouseEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class GamePiece extends React.Component<Props> {
  render() {
    const {
      piece,
      pieceSize,
      className,
      originalPieceClassName,
      onClick,
      onDragStart
    } = this.props;
    const cornerPieceSize = pieceSize * 2 / 7;
    const originalPieceCoords = {
      x: pieceSize - cornerPieceSize,
      y: pieceSize - cornerPieceSize
    };

    return (
      <svg>
        <Piece
          width={pieceSize}
          height={pieceSize}
          color={piece.color}
          type={piece.abilities || piece.type}
          location={piece.location}
          onClick={onClick}
          onDragStart={onDragStart}
          className={className}
        />

        {(piece.abilities || piece.type !== piece.originalType) && (
          <React.Fragment>
            <rect
              {...originalPieceCoords}
              width={cornerPieceSize}
              height={cornerPieceSize}
              className={classNames('original-piece', originalPieceClassName)}
            />
            <Piece
              {...originalPieceCoords}
              width={cornerPieceSize}
              height={cornerPieceSize}
              color={piece.color}
              type={piece.abilities ? piece.type : piece.originalType}
              location={piece.location}
              onClick={onClick}
              onDragStart={onDragStart}
            />
          </React.Fragment>
        )}
      </svg>
    );
  }
}
