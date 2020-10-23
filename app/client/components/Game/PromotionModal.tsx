import classNames from 'classnames';
import * as React from 'react';

import { pocketPieces } from 'client/constants';

import { ColorEnum, PiecePocketLocation, PieceTypeEnum, Square } from 'shared/types';

import { Game } from 'client/helpers';

import Modal, { ModalProps } from '../Modal';
import Piece from '../Piece';

interface OwnProps {
  game: Game;
  square: Square | null;
  pieceSize: number;
  isBlackBase: boolean;
  validPromotions: readonly PieceTypeEnum[];
  promoteToPiece(pieceType: PieceTypeEnum): void;
}

type Props = OwnProps & ModalProps;

export default class PromotionModal extends React.PureComponent<Props> {
  componentDidMount() {
    window.addEventListener('resize', this.onWindowResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
  }

  onWindowResize = () => {
    this.forceUpdate();
  };

  promoteToPiece = (location: PiecePocketLocation) => {
    const {
      promoteToPiece,
    } = this.props;

    promoteToPiece(location.pieceType);
  };

  render() {
    const {
      game,
      square,
      pieceSize,
      isBlackBase,
      validPromotions,
      promoteToPiece,
      ...modalProps
    } = this.props;
    const color = game.player ? game.player.color : ColorEnum.WHITE;
    const reverse = !!square && (color === ColorEnum.WHITE ? isBlackBase : !isBlackBase);
    let style: React.CSSProperties;
    let squareElement: HTMLElement | null = null;

    if (square) {
      squareElement = document.querySelector(`[data-board="${square.board}"][data-file-x="${square.x}"][data-rank-y="${square.y}"]`);
    }

    if (squareElement) {
      const box = squareElement.getBoundingClientRect();

      if (reverse) {
        style = {
          left: box.left,
          bottom: window.innerHeight - box.bottom,
        };
      } else {
        style = {
          left: box.left,
          top: box.top,
        };
      }
    } else {
      style = {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    return (
      <Modal {...modalProps} className={classNames('promotion-modal', modalProps.className)}>
        <div className="modal-content" style={style}>
          <div
            className="promotion-pieces"
            style={{
              flexDirection: reverse ? 'column-reverse' : 'column',
            }}
          >
            {validPromotions.map((pieceType) => (
              <Piece
                key={pieceType}
                width={pieceSize}
                height={pieceSize}
                color={color}
                type={pieceType}
                location={pocketPieces[color][pieceType].location}
                onClick={this.promoteToPiece}
              />
            ))}
          </div>
        </div>
      </Modal>
    );
  }
}
