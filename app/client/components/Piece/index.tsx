import * as React from 'react';

import {
  Piece as IPiece,
  PieceEnum
} from '../../../types';
import King from './King';

interface OwnProps {
  piece: IPiece;
}

type Props = OwnProps;

export default class Piece extends React.Component<Props> {
  render() {
    const {
      piece
    } = this.props;

    return (
      <svg
        className="piece"
        viewBox="0 0 44 44"
      >
        {piece.type === PieceEnum.KING ? (
          <King color={piece.color} />
        ) : null}
      </svg>
    );
  }
}
