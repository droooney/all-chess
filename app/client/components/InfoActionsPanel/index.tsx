import * as React from 'react';
import { connect, DispatchProps } from 'react-redux';
import classNames = require('classnames');

import {
  changeSettings
} from '../../actions';
import {
  ColorEnum,
  GamePlayers,
  GameResult,
  PieceTypeEnum,
  Player
} from '../../../types';
import {
  COLOR_NAMES,
  RESULT_REASON_NAMES
} from '../../../shared/constants';
import { Game } from '../../helpers';
import { ReduxState } from '../../store';

import GameVariantLink from '../GameVariantLink';
import Piece from '../Piece';
import Dialog from '../Dialog';

export interface OwnProps {
  game: Game;
  result: GameResult | null;
  players: GamePlayers;
  isThreefoldRepetitionDrawPossible: boolean;
  is50MoveDrawPossible: boolean;
  isBlackBase: boolean;
  drawOffer: ColorEnum | null;
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  player: Player | null;
  flipBoard(): void;
  changeDarkChessMode(): void;
  toggleShowDarkChessHiddenPieces(): void;
}

interface State {
  resignModalVisible: boolean;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps> & DispatchProps;

class InfoActionsPanel extends React.Component<Props, State> {
  state: State = {
    resignModalVisible: false
  };

  offerDraw = () => {
    const {
      game,
      drawOffer
    } = this.props;

    if (!drawOffer) {
      game.offerDraw();
    }
  };

  acceptDraw = () => {
    this.props.game.acceptDraw();
  };

  cancelDraw = () => {
    this.props.game.cancelDraw();
  };

  declineDraw = () => {
    this.props.game.declineDraw();
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
      this.props.game.resign();
    }
  };

  declareThreefoldRepetitionDraw = () => {
    const {
      game,
      isThreefoldRepetitionDrawPossible
    } = this.props;

    if (isThreefoldRepetitionDrawPossible) {
      game.declareThreefoldRepetitionDraw();
    }
  };

  declare50MoveDraw = () => {
    const {
      game,
      is50MoveDrawPossible
    } = this.props;

    if (is50MoveDrawPossible) {
      game.declare50MoveDraw();
    }
  };

  flipBoard = () => {
    this.props.flipBoard();
  };

  toggleShowFantomPieces = () => {
    const {
      dispatch,
      showFantomPieces
    } = this.props;

    dispatch(changeSettings('showFantomPieces', !showFantomPieces));
  };

  changeDarkChessMode = () => {
    this.props.changeDarkChessMode();
  };

  toggleShowDarkChessHiddenPieces = () => {
    const {
      darkChessMode,
      toggleShowDarkChessHiddenPieces
    } = this.props;

    if (darkChessMode) {
      toggleShowDarkChessHiddenPieces();
    }
  };

  render() {
    const {
      game,
      result,
      isThreefoldRepetitionDrawPossible,
      is50MoveDrawPossible,
      isBlackBase,
      drawOffer,
      darkChessMode,
      player,
      showDarkChessHiddenPieces,
      showFantomPieces
    } = this.props;
    const buttons: JSX.Element[] = [];

    if (!result && player) {
      buttons.push(
        <div
          key="resign"
          className="button"
          title="Resign"
          onClick={this.openResignModal}
        >
          <i className="fa fa-flag-o" />
        </div>,
        <div
          key="offer-draw"
          className={classNames('button', { disabled: drawOffer })}
          title="Offer a draw"
          onClick={this.offerDraw}
        >
          <i className="fa fa-handshake-o" />
        </div>
      );

      if (!game.isDarkChess) {
        buttons.push(
          <div
            key="threefold-draw"
            className={classNames('button', { disabled: !isThreefoldRepetitionDrawPossible })}
            title="Declare threefold repetition draw"
            onClick={this.declareThreefoldRepetitionDraw}
          >
            3
          </div>,
          <div
            key="50-move-draw"
            className={classNames('button', { disabled: !is50MoveDrawPossible })}
            title="Declare 50-move draw"
            onClick={this.declare50MoveDraw}
          >
            50
          </div>
        );
      }
    }

    buttons.push(
      <div
        key="flip-board"
        className="button"
        title="Flip the board"
        onClick={this.flipBoard}
      >
        <i className="fa fa-refresh" />
        <div className="piece-container">
          <Piece
            piece={{
              color: isBlackBase ? ColorEnum.BLACK : ColorEnum.WHITE,
              type: PieceTypeEnum.KING,
              location: null!
            }}
          />
        </div>
      </div>
    );

    if (game.isAliceChess) {
      buttons.push(
        <div
          key="show-fantom-pieces"
          className={classNames('button', { enabled: showFantomPieces })}
          title={showFantomPieces ? 'Hide fantom pieces' : 'Show fantom pieces'}
          onClick={this.toggleShowFantomPieces}
        >
          <i className={showFantomPieces ? 'fa fa-eye' : 'fa fa-eye-slash'} />
          {showFantomPieces && (
            <div className="piece-container">
              <Piece
                piece={{
                  color: player ? player.color : ColorEnum.WHITE,
                  type: PieceTypeEnum.KING,
                  location: null!
                }}
                className="fantom"
              />
            </div>
          )}
        </div>
      );
    }

    if (game.isDarkChess && result) {
      buttons.push(
        <div
          key="change-dark-chess-mode"
          className="button"
          title={
            darkChessMode
              ? darkChessMode === ColorEnum.WHITE
                ? `Change perspective to ${COLOR_NAMES[ColorEnum.BLACK]}`
                : 'Remove perspective'
              : `Change perspective to ${COLOR_NAMES[ColorEnum.WHITE]}`
          }
          onClick={this.changeDarkChessMode}
        >
          <i className="fa fa-eye" />
          {darkChessMode && (
            <div className="piece-container">
              <Piece
                piece={{
                  color: darkChessMode,
                  type: PieceTypeEnum.KING,
                  location: null!
                }}
              />
            </div>
          )}
        </div>,
        <div
          key="show-hidden-pieces"
          className={classNames('button', { disabled: !darkChessMode, enabled: showDarkChessHiddenPieces })}
          title={showDarkChessHiddenPieces ? 'Hide hidden pieces' : 'Show hidden pieces'}
          onClick={this.toggleShowDarkChessHiddenPieces}
        >
          <i className={showDarkChessHiddenPieces ? 'fa fa-eye' : 'fa fa-eye-slash'} />
          {showDarkChessHiddenPieces && (
            <div className="piece-container">
              <Piece
                piece={{
                  color: isBlackBase ? ColorEnum.WHITE : ColorEnum.BLACK,
                  type: PieceTypeEnum.KING,
                  location: null!
                }}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <React.Fragment>

        <div className="info-actions-panel">

          {!!game.variants.length && (
            <div className="variants">
              <span className="variants-header">
                Variants include:
              </span>
              {game.variants.map((variant, ix) => (
                <React.Fragment key={variant}>
                  {' '}
                  <GameVariantLink
                    variant={variant}
                    className="variant"
                  />
                  {ix === game.variants.length - 1 ? '' : ','}
                </React.Fragment>
              ))}
            </div>
          )}

          {result && (
            <div className="result">
              {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
              {` (${RESULT_REASON_NAMES[result.reason]})`}
            </div>
          )}

          <div className="actions">
            <div className="buttons">
              {buttons}
            </div>
            {player && drawOffer && !result && (
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

        </div>

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

      </React.Fragment>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    showFantomPieces: state.gameSettings.showFantomPieces
  };
}

export default connect(mapStateToProps)(InfoActionsPanel);
