import * as React from 'react';
import classNames = require('classnames');

import {
  ChatMessage,
  ColorEnum,
  GamePlayers,
  GameResult,
  GameVariantEnum,
  Player
} from '../../../types';
import {
  COLOR_NAMES,
  RESULT_REASON_NAMES,
  GAME_VARIANT_NAMES
} from '../../../shared/constants';

import Chat from '../Chat';
import Dialog from '../Dialog';

export interface OwnProps {
  result: GameResult | null;
  variants: GameVariantEnum[];
  players: GamePlayers;
  chat: ChatMessage[];
  isThreefoldRepetitionDrawPossible: boolean;
  is50MoveDrawPossible: boolean;
  isAliceChess: boolean;
  drawOffer: ColorEnum | null;
  player: Player | null;
  offerDraw(): void;
  acceptDraw(): void;
  cancelDraw(): void;
  declineDraw(): void;
  resign(): void;
  declareThreefoldRepetitionDraw(): void;
  declare50MoveDraw(): void;
  sendMessage(message: string): void;
}

interface State {
  resignModalVisible: boolean;
}

type Props = OwnProps;

export default class InfoActionsChatPanel extends React.Component<Props, State> {
  state: State = {
    resignModalVisible: false
  };

  offerDraw = () => {
    const {
      drawOffer,
      offerDraw
    } = this.props;

    if (!drawOffer) {
      offerDraw();
    }
  };

  acceptDraw = () => {
    this.props.acceptDraw();
  };

  cancelDraw = () => {
    this.props.cancelDraw();
  };

  declineDraw = () => {
    this.props.declineDraw();
  };

  openResignModal = () => {
    this.setState({
      resignModalVisible: true
    });
  };

  closeResignModal = () => {
    this.setState({
      resignModalVisible: false
    });
  };

  resign = (choice: string) => {
    if (choice === 'yes') {
      this.props.resign();
    }
  };

  declareThreefoldRepetitionDraw = () => {
    const {
      isThreefoldRepetitionDrawPossible,
      declareThreefoldRepetitionDraw
    } = this.props;

    if (isThreefoldRepetitionDrawPossible) {
      declareThreefoldRepetitionDraw();
    }
  };

  declare50MoveDraw = () => {
    const {
      is50MoveDrawPossible,
      declare50MoveDraw
    } = this.props;

    if (is50MoveDrawPossible) {
      declare50MoveDraw();
    }
  };

  render() {
    const {
      chat,
      variants,
      result,
      isThreefoldRepetitionDrawPossible,
      is50MoveDrawPossible,
      isAliceChess,
      drawOffer,
      player,
      sendMessage
    } = this.props;

    return (
      <div className={classNames('info-actions-chat-panel', { 'is-bottom': isAliceChess })}>

        <div className="info-action-panel">

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

          {result ? (
            <div className="result">
              {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
              {` (${RESULT_REASON_NAMES[result.reason]})`}
            </div>
          ) : player && (
            <div className="actions">
              <div className="buttons">
                <div
                  className="button"
                  title="Resign"
                  onClick={this.openResignModal}
                >
                  <i className="fa fa-flag-o" />
                </div>
                <div
                  className={classNames('button', { disabled: drawOffer })}
                  title="Offer a draw"
                  onClick={this.offerDraw}
                >
                  <i className="fa fa-handshake-o" />
                </div>
                <div
                  className={classNames('button', { disabled: !isThreefoldRepetitionDrawPossible })}
                  title="Declare threefold repetition draw"
                  onClick={this.declareThreefoldRepetitionDraw}>
                  3
                </div>
                <div
                  className={classNames('button', { disabled: !is50MoveDrawPossible })}
                  title="Declare 50-move draw"
                  onClick={this.declare50MoveDraw}
                >
                  50
                </div>
              </div>
              {drawOffer && (
                <div className="action">
                  {
                    player.color === drawOffer ? (
                      <React.Fragment>
                        You offered a draw
                        <i
                          className="fa fa-times"
                          title="Cancel"
                          onClick={this.cancelDraw}
                        />
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        {COLOR_NAMES[drawOffer]} offered a draw
                        <i
                          className="fa fa-check"
                          title="Accept"
                          onClick={this.acceptDraw}
                        />
                        <i
                          className="fa fa-times"
                          title="Decline"
                          onClick={this.declineDraw}
                        />
                      </React.Fragment>
                    )
                  }
                </div>
              )}
            </div>
          )}

        </div>

        <Chat
          chat={chat}
          sendMessage={sendMessage}
        />

        <Dialog
          visible={this.state.resignModalVisible}
          onOverlayClick={this.closeResignModal}
          question="Are you sure you want to resign?"
          choices={[
            { key: 'yes', text: 'Yes', className: 'ok' },
            { key: 'no', text: 'Cancel', className: 'cancel' }
          ]}
          onChoose={this.resign}
        />

      </div>
    );
  }
}
