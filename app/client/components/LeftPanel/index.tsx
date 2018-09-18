import * as React from 'react';

import {
  ChatMessage,
  GamePlayers,
  GameResult,
  GameVariantEnum
} from '../../../types';
import {
  GAME_VARIANT_NAMES
} from '../../../shared/constants';
import Chat from '../Chat';

interface OwnProps {
  result: GameResult | null;
  variants: GameVariantEnum[];
  players: GamePlayers;
  chat: ChatMessage[];
  sendMessage(message: string): void;
}

type Props = OwnProps;

export default class LeftPanel extends React.Component<Props> {
  offerDraw = () => {

  };

  openResignModal = () => {

  };

  render() {
    const {
      chat,
      variants,
      sendMessage
    } = this.props;

    return (
      <div className="left-panel">
        <div className="top-left-panel">
          {!!variants.length && (
            <div className="variants">
              <span className="variants-header">
                Variants include:
              </span>
              {variants.map((variant, ix) => (
                ` ${GAME_VARIANT_NAMES[variant]}${ix === variants.length - 1 ? '' : ','}`
              ))}
            </div>
          )}
          <div className="buttons">
            <div className="button" title="Resign" onClick={this.openResignModal}>
              <i className="fa fa-flag-o" />
            </div>
            <div className="button" title="Offer a draw" onClick={this.offerDraw}>
              <i className="fa fa-handshake-o" />
            </div>
          </div>
        </div>
        <Chat
          chat={chat}
          sendMessage={sendMessage}
        />
      </div>
    );
  }
}
