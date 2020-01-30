import * as React from 'react';
import classNames from 'classnames';

import {
  ColorEnum,
  Piece as IPiece,
  PieceLocationEnum,
  PiecePocketLocation,
  PocketPiece,
  RealPieceLocation
} from '../../../types';
import { Game } from '../../helpers';

import Piece from '../Piece';

interface OwnProps {
  game: Game;
  color: ColorEnum;
  pocket: PocketPiece[];
  enableClick: boolean;
  enableDnd: boolean;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
  startDraggingPiece(e: React.MouseEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class PlayerPocket extends React.Component<Props> {
  onPocketPieceClick(location: PiecePocketLocation) {
    const {
      game,
      selectPiece,
      selectedPiece
    } = this.props;

    if (
      selectedPiece
      && selectedPiece.location.pieceType === location.pieceType
    ) {
      selectPiece(null);
    } else {
      selectPiece(game.getPocketPiece(location.pieceType, location.color));
    }
  }

  render() {
    const {
      game,
      color,
      pocket,
      enableClick,
      enableDnd,
      selectedPiece,
      startDraggingPiece
    } = this.props;

    return (
      <div key="pocket" className="pocket">
        {game.pocketPiecesUsed.map((type) => {
          const pieces = pocket.filter(({ type: pieceType }) => pieceType === type);

          return (
            <div
              key={type}
              data-pocket-piece={type}
              className={classNames('piece-container', {
                disabled: !pieces.length
              })}
              onClick={pieces.length && enableClick ? (() => this.onPocketPieceClick(pieces[0].location)) : undefined}
              onMouseDown={pieces.length && enableDnd ? (e) => startDraggingPiece(e, pieces[0].location) : undefined}
            >
              {
                selectedPiece
                && selectedPiece.location.pieceType === type
                && selectedPiece.location.color === color
                && (
                  <div className="selected-square" />
                )
              }

              <Piece
                key={type}
                piece={pieces.length ? pieces[0] : {
                  color,
                  type,
                  location: {
                    type: PieceLocationEnum.POCKET,
                    pieceType: type,
                    color
                  }
                }}
              />

              {!!pieces.length && (
                <span className="count">
                  {pieces.length}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}
