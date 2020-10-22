import * as React from 'react';
import classNames from 'classnames';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

import {
  BoardPiece as IBoardPiece,
} from 'shared/types';

import { Game } from 'client/helpers';

import GamePiece from '../Game/GamePiece';

interface OwnProps {
  game: Game;
  piece: IBoardPiece;
  isFantom: boolean;
}

type Props = OwnProps;

export default class BoardPiece extends React.Component<Props> {
  prevPiece = cloneDeep(this.props.piece);

  ifBlackBase = (value: number | string, alternate: number | string): string => {
    return `(var(--is-black-base, 0) * (${value}) + (1 - var(--is-black-base, 0)) * (${alternate}))`;
  };

  shouldComponentUpdate(nextProps: Props): boolean {
    return (
      !isEqual(this.prevPiece, nextProps.piece)
      || this.props.game !== nextProps.game
      || this.props.isFantom !== nextProps.isFantom
    );
  }

  componentDidUpdate() {
    this.prevPiece = cloneDeep(this.props.piece);
  }

  render() {
    const {
      game,
      piece,
      piece: {
        location,
      },
      isFantom,
    } = this.props;
    const pieceSize = game.getPieceSize();
    const pieceClassNames = classNames({
      fantom: isFantom,
    });
    const squareCenter = game.getSquareCenter(location);
    const translateX = `calc(${
      this.ifBlackBase(
        `100% - ${squareCenter.x}px - var(--file-${location.x}-transform)`,
        `${squareCenter.x}px + var(--file-${location.x}-transform)`,
      )
    } - ${pieceSize / 2}px)`;
    const translateY = `calc(${
      this.ifBlackBase(`100% - ${squareCenter.y}px`, `${squareCenter.y}px`)
    } - ${pieceSize / 2}px)`;

    return (
      <g
        className="piece-container"
        id={`piece-${piece.id}`}
        style={{
          transform: `translate(${translateX}, ${translateY})`,
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
