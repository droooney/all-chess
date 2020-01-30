import * as React from 'react';
import classNames from 'classnames';

import {
  BoardPiece as IBoardPiece,
  PieceBoardLocation,
  RealPieceLocation
} from '../../../types';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO } from '../../constants';
import { Game } from '../../helpers';

import GamePiece from '../GamePiece';

interface OwnProps {
  game: Game;
  piece: IBoardPiece;
  isBlackBase: boolean;
  isFantom: boolean;
  isFullFantom: boolean;
  boardsShiftX: number;
  squareSize: number;

  onClick?(location: PieceBoardLocation): void;
  onDragStart?(e: React.MouseEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class BoardPiece extends React.Component<Props> {
  render() {
    const {
      game,
      piece,
      piece: {
        location,
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
      onClick,
      onDragStart
    } = this.props;
    const pieceSize = game.getPieceSize(squareSize);
    const pieceClassNames = classNames({
      fantom: isFantom,
      'full-fantom': isFullFantom
    });
    let translateX: number;
    let translateY: number;

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
    } else if (game.isHexagonalChess) {
      const middleFile = 5;
      const a = squareSize / 2 / Math.sqrt(3);
      const width = (game.boardWidth * 3 + 1) * squareSize / 2 / Math.sqrt(3);
      const height = game.boardHeight * squareSize;
      const centerX = (3 * pieceX + 2) * a;
      const centerY = (pieceY + 1 / 2 * (1 + Math.abs(pieceX - middleFile))) * squareSize;

      translateX = (
        isBlackBase
          ? width - centerX
          : centerX
      ) - pieceSize / 2;
      translateY = (
        isBlackBase
          ? centerY
          : height - centerY
      ) - pieceSize / 2;
    } else {
      translateX = game.adjustFileX(
        boardsShiftX + (
          isBlackBase
            ? game.boardWidth - 1 - pieceX
            : pieceX
        )
      ) * squareSize;
      translateY = (
        isBlackBase
          ? pieceY
          : game.boardHeight - 1 - pieceY
      ) * squareSize;
    }

    return (
      <g
        className="piece-container"
        transform={`translate(${translateX}, ${translateY})`}
        data-square={JSON.stringify(location)}
      >
        <GamePiece
          piece={piece}
          pieceSize={pieceSize}
          className={pieceClassNames}
          originalPieceClassName={pieceClassNames}
          onClick={onClick}
          onDragStart={onDragStart}
        />
      </g>
    );
  }
}
