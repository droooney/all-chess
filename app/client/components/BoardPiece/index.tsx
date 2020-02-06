import * as _ from 'lodash';
import * as React from 'react';
import classNames from 'classnames';

import {
  BoardPiece as IBoardPiece,
  PieceBoardLocation,
  RealPieceLocation
} from '../../../types';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO, SVG_SQUARE_SIZE } from '../../constants';
import { Game } from '../../helpers';

import GamePiece from '../GamePiece';

interface OwnProps {
  game: Game;
  piece: IBoardPiece;
  isBlackBase: boolean;
  isFantom: boolean;
  isFullFantom: boolean;

  onClick?(location: PieceBoardLocation): void;
  onDragStart?(e: React.MouseEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class BoardPiece extends React.Component<Props> {
  prevPiece = _.cloneDeep(this.props.piece);

  ifBlackBase = (value: number | string, alternate: number | string): string => {
    return `(var(--is-black-base, 0) * (${value}) + (1 - var(--is-black-base, 0)) * (${alternate}))`;
  };

  shouldComponentUpdate(nextProps: Props): boolean {
    return (
      !_.isEqual(this.prevPiece, nextProps.piece)
      || this.props.game !== nextProps.game
      || this.props.isBlackBase !== nextProps.isBlackBase
      || this.props.isFantom !== nextProps.isFantom
      || this.props.isFullFantom !== nextProps.isFullFantom
    );
  }

  componentDidUpdate() {
    this.prevPiece = _.cloneDeep(this.props.piece);
  }

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
      onClick,
      onDragStart
    } = this.props;
    const pieceSize = game.getPieceSize();
    const pieceClassNames = classNames({
      fantom: isFantom,
      'full-fantom': isFullFantom
    });
    let translateX: number | string;
    let translateY: number | string;

    if (game.isCircularChess) {
      const maximumSize = Math.max(game.boardOrthodoxWidth, game.boardOrthodoxHeight);
      const adjustedFileX = pieceY > game.boardOrthodoxHeight
        ? game.boardOrthodoxWidth - pieceX
        : pieceX;
      const half = maximumSize * SVG_SQUARE_SIZE / 2;
      const rOuter = game.boardWidth * SVG_SQUARE_SIZE;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
      const right = pieceY > game.boardOrthodoxHeight ? 1 : 0;
      const r = rOuter - ((right ? game.boardOrthodoxWidth - adjustedFileX : adjustedFileX) + 0.5) * rDiff;
      const angleDiff = 2 * Math.PI / game.boardHeight;
      const angle = (pieceY + 0.5) * angleDiff + (isBlackBase ? Math.PI : 0);

      translateX = half - r * Math.sin(angle) - pieceSize / 2;
      translateY = half + r * Math.cos(angle) - pieceSize / 2;
    } else if (game.isHexagonalChess) {
      const middleFile = 5;
      const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const width = (game.boardWidth * 3 + 1) * SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const height = game.boardHeight * SVG_SQUARE_SIZE;
      const centerX = (3 * pieceX + 2) * a;
      const centerY = (pieceY + 1 / 2 * (1 + Math.abs(pieceX - middleFile))) * SVG_SQUARE_SIZE;

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
      translateX = `calc(${SVG_SQUARE_SIZE}px * ${this.ifBlackBase(
        `${game.boardWidth - 1} - var(--rendered-file-${pieceX}, ${pieceX})`,
        `var(--rendered-file-${pieceX}, ${pieceX})`
      )})`;
      translateY = `calc(${SVG_SQUARE_SIZE}px * ${this.ifBlackBase(pieceY, game.boardHeight - 1 - pieceY)})`;
    }

    return (
      <g
        className="piece-container"
        style={{
          transform: `translate(${
            typeof translateX === 'number' ? `${translateX}px` : translateX}, ${
            typeof translateY === 'number' ? `${translateY}px` : translateY
          })`
        }}
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
