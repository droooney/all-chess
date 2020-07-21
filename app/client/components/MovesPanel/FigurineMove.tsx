import * as React from 'react';

import { ColorEnum } from 'shared/types';

import { Game } from 'shared/helpers';

import Piece from 'client/components/Piece';

interface OwnProps {
  color: ColorEnum;
  moveString: string;
}

type Props = OwnProps;

const upperCased = /[A-Z]/;

class FigurineMove extends React.PureComponent<Props> {
  render() {
    const {
      color,
      moveString,
    } = this.props;

    if (moveString.includes('O-O')) {
      return moveString;
    }

    return moveString.split(/([A-Z])/).map((text, index) => {
      if (!upperCased.test(text)) {
        return text;
      }

      const piece = Game.getPieceFromLiteral(text);

      if (!piece) {
        return;
      }

      return (
        <Piece
          key={index}
          color={color}
          type={piece.type}
          location={null}
        />
      );
    });
  }
}

export default FigurineMove;
