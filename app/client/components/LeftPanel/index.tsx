import * as React from 'react';
import classNames = require('classnames');

import {
  ChatMessage,
  GamePlayers,
  GameResult,
  GameVariantEnum
} from '../../../types';
import {
  COLOR_NAMES,
  RESULT_REASON_NAMES,
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
      result,
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
                <React.Fragment key={variant}>
                  {' '}
                  <span className="variant">
                    {GAME_VARIANT_NAMES[variant]}
                  </span>
                  {ix === variants.length - 1 ? '' : ','}
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="buttons">
            <div
              className="button"
              title="Resign"
              onClick={this.openResignModal}
            >
              <i className="fa fa-flag-o" />
            </div>
            <div
              className="button"
              title="Offer a draw"
              onClick={this.offerDraw}
            >
              <i className="fa fa-handshake-o" />
            </div>
            <div
              className={classNames('button', { disabled: true })}
              title="Declare threefold repetition draw"
              onClick={this.offerDraw}>
              3
            </div>
            <div
              className={classNames('button', { disabled: true })}
              title="Declare 50-move draw"
              onClick={this.offerDraw}
            >
              50
            </div>
          </div>
          {result && (
            <div className="result">
              {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
              {` (${RESULT_REASON_NAMES[result.reason]})`}
            </div>
          )}
        </div>
        <Chat
          chat={chat}
          sendMessage={sendMessage}
        />
      </div>
    );
  }
}
