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

interface OwnProps {
  result: GameResult | null;
  variants: GameVariantEnum[];
  players: GamePlayers;
  chat: ChatMessage[];
  isThreefoldRepetitionDrawPossible: boolean;
  is50MoveDrawPossible: boolean;
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

export default class LeftPanel extends React.Component<Props, State> {
  state: State = {
    resignModalVisible: false
  };

  offerDraw = () => {
    this.props.offerDraw();
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
    this.props.declareThreefoldRepetitionDraw();
  };

  declare50MoveDraw = () => {
    this.props.declare50MoveDraw();
  };

  render() {
    const {
      chat,
      variants,
      result,
      isThreefoldRepetitionDrawPossible,
      is50MoveDrawPossible,
      drawOffer,
      player,
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

          {result ? (
            <div className="result">
              {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
              {` (${RESULT_REASON_NAMES[result.reason]})`}
            </div>
          ) : (
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
                  className={classNames('button', { disabled: player && player.color === drawOffer })}
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
              {drawOffer && player && (
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
