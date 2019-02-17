import * as React from 'react';
import classNames = require('classnames');

import {
  BoardPiece as IBoardPiece,
  PieceBoardLocation
} from '../../../types';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO } from '../../constants';
import { Game } from '../../helpers';

import Piece from '../Piece';

interface OwnProps {
  game: Game;
  piece: IBoardPiece;
  isBlackBase: boolean;
  isFantom: boolean;
  isFullFantom: boolean;
  boardsShiftX: number;
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
          x: pieceX,
          y: pieceY
        }
      },
      isBlackBase,
      isFantom,
      isFullFantom,
      squareSize,
      boardsShiftX,
      onClick
    } = this.props;
    const pieceSize = game.isCircularChess
      ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * squareSize * 0.9
      : squareSize;
    const cornerPieceSize = pieceSize * 2 / 7;
    const pieceClassNames = {
      fantom: isFantom,
      'full-fantom': isFullFantom
    };
    const originalPieceCoords = {
      x: pieceSize - cornerPieceSize,
      y: pieceSize - cornerPieceSize
    };
    let translateX = game.adjustFileX(
      boardsShiftX + (
        isBlackBase
          ? game.boardWidth - 1 - pieceX
          : pieceX
      )
    ) * squareSize;
    let translateY = (
      isBlackBase
        ? pieceY
        : game.boardHeight - 1 - pieceY
    ) * squareSize;

    if (game.isCircularChess) {
      const maximumSize = Math.max(game.boardOrthodoxWidth, game.boardOrthodoxHeight);
      const adjustedFileX = pieceY > game.boardOrthodoxHeight
        ? game.boardOrthodoxWidth - pieceX
        : pieceX;
      const half = maximumSize * squareSize / 2;
      const rOuter = game.boardWidth * squareSize;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * squareSize;
      const right = pieceY > game.boardOrthodoxHeight ? 1 : 0;
      const r = rOuter - ((right ? game.boardOrthodoxWidth - adjustedFileX : adjustedFileX) + 0.5) * rDiff;
      const angleDiff = 2 * Math.PI / game.boardHeight;
      const angle = (pieceY + 0.5) * angleDiff + (isBlackBase ? Math.PI : 0);

      translateX = half - r * Math.sin(angle) - pieceSize / 2;
      translateY = half + r * Math.cos(angle) - pieceSize / 2;
    }

    return (
      <g
        className="piece-container"
        transform={`translate(${translateX}, ${translateY})`}
      >
        <Piece
          width={pieceSize}
          height={pieceSize}
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
