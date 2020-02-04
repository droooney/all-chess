import * as React from 'react';
import classNames from 'classnames';

import { Game } from '../../helpers';
import { ColorEnum, PiecePocketLocation, PieceTypeEnum } from '../../../types';
import { pocketPieces } from '../../constants';

import Modal, { ModalProps } from '../Modal';
import Piece from '../Piece';

interface OwnProps {
  game: Game;
  promoteToPiece(pieceType: PieceTypeEnum): void;
}

type Props = OwnProps & ModalProps;

export default class PromotionModal extends React.PureComponent<Props> {
  promoteToPiece = (location: PiecePocketLocation) => {
    const {
      promoteToPiece
    } = this.props;

    promoteToPiece(location.pieceType);
  };

  render() {
    const {
      game,
      promoteToPiece,
      ...modalProps
    } = this.props;
    const color = game.player ? game.player.color : ColorEnum.WHITE;

    return (
      <Modal {...modalProps} className={classNames('promotion-modal', modalProps.className)}>
        <div className="modal-content">
          {game.validPromotions.map((pieceType) => (
            <Piece
              key={pieceType}
              color={color}
              type={pieceType}
              location={pocketPieces[color][pieceType].location}
              onClick={this.promoteToPiece}
            />
          ))}
        </div>
      </Modal>
    );
  }
}
