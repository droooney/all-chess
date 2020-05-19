import * as _ from 'lodash';
import * as React from 'react';
import classNames from 'classnames';

import {
  BoardPiece as IBoardPiece
} from '../../../types';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO, SVG_SQUARE_SIZE } from '../../constants';
import { Game } from '../../helpers';

import GamePiece from '../GamePiece';

interface OwnProps {
  game: Game;
  piece: IBoardPiece;
  isFantom: boolean;
  isFullFantom: boolean;
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
        location: {
          x: pieceX,
          y: pieceY
        }
      },
      isFantom,
      isFullFantom
    } = this.props;
    const pieceSize = game.getPieceSize();
    const pieceClassNames = classNames({
      fantom: isFantom,
      'full-fantom': isFullFantom
    });
    let translateX: string;
    let translateY: string;

    if (game.isCircularChess) {
      const rOuter = game.boardWidth * SVG_SQUARE_SIZE;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
      const r = rOuter - (pieceX + 0.5) * rDiff;
      const angleDiff = 2 * Math.PI / game.boardHeight;
      const angle = (pieceY + 0.5) * angleDiff;

      translateX = `calc(${game.boardCenterX}px - ${r}px * ${
        this.ifBlackBase(Math.sin(angle + Math.PI), Math.sin(angle))
      } - ${pieceSize / 2}px)`;
      translateY = `calc(${game.boardCenterY}px + ${r}px * ${
        this.ifBlackBase(Math.cos(angle + Math.PI), Math.cos(angle))
      } - ${pieceSize / 2}px)`;
    } else if (game.isHexagonalChess) {
      const middleFile = 5;
      const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const width = (game.boardWidth * 3 + 1) * SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const height = game.boardHeight * SVG_SQUARE_SIZE;
      const centerX = (3 * pieceX + 2) * a;
      const centerY = (pieceY + 1 / 2 * (1 + Math.abs(pieceX - middleFile))) * SVG_SQUARE_SIZE;

      translateX = `calc(1px * ${this.ifBlackBase(width - centerX, centerX)} - ${pieceSize / 2}px)`;
      translateY = `calc(1px * ${this.ifBlackBase(centerY, height - centerY)} - ${pieceSize / 2}px)`;
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
          transform: `translate(${translateX}, ${translateY})`
        }}
      >
        <GamePiece
          piece={piece}
          pieceSize={pieceSize}
          className={pieceClassNames}
          originalPieceClassName={pieceClassNames}
        />
      </g>
    );
  }
}
