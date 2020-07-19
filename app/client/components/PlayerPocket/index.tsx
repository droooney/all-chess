import * as React from 'react';
import classNames from 'classnames';

import { pocketPieces } from 'client/constants';

import {
  ColorEnum,
  Piece as IPiece,
  PiecePocketLocation,
  PocketPiece,
  RealPieceLocation,
} from 'shared/types';

import { Game } from 'client/helpers';

import Piece from '../Piece';

interface OwnProps {
  game: Game;
  color: ColorEnum;
  pocket: PocketPiece[];
  enableClick: boolean;
  enableDnd: boolean;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
  startDraggingPiece(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class PlayerPocket extends React.Component<Props> {
  onPocketPieceClick(location: PiecePocketLocation) {
    const {
      game,
      enableDnd,
      selectPiece,
      selectedPiece,
    } = this.props;

    if (
      selectedPiece
      && selectedPiece.location.pieceType === location.pieceType
      && !enableDnd
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
      startDraggingPiece,
    } = this.props;

    return (
      <div key="pocket" className="pocket">
        {game.pocketPiecesUsed.map((pieceType) => {
          const pieces = pocket.filter(({ type }) => pieceType === type);
          const piece = pieces.length ? pieces[0] : pocketPieces[color][pieceType];

          return (
            <div
              key={pieceType}
              data-pocket-piece={pieceType}
              className={classNames('piece-container', {
                disabled: !pieces.length,
              })}
              onClick={pieces.length && enableClick ? (() => this.onPocketPieceClick(piece.location)) : undefined}
              onMouseDown={pieces.length && enableDnd ? (e) => startDraggingPiece(e, piece.location) : undefined}
              onTouchStart={pieces.length && enableDnd ? (e) => startDraggingPiece(e, piece.location) : undefined}
            >
              {
                selectedPiece
                && selectedPiece.location.pieceType === pieceType
                && selectedPiece.location.color === color
                && (
                  <div className="selected-square" />
                )
              }

              <Piece
                key={pieceType}
                color={piece.color}
                type={piece.type}
                location={piece.location}
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
