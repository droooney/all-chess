import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import {
  changeSettings
} from '../../actions';
import {
  ColorEnum,
  GamePlayers,
  GameResult,
  PieceTypeEnum,
  Player,
  TakebackRequest
} from '../../../types';
import {
  COLOR_NAMES
} from '../../../shared/constants';
import { Game } from '../../helpers';
import { DispatchProps, ReduxState } from '../../store';

import Piece from '../Piece';
import Dialog from '../Dialog';

export interface OwnProps {
  game: Game;
  result: GameResult | null;
  players: GamePlayers;
  isBlackBase: boolean;
  isNoMovesMade: boolean;
  isCurrentMoveLast: boolean;
  boardToShow: number | 'all';
  drawOffer: ColorEnum | null;
  takebackRequest: TakebackRequest | null;
  isBasicTakeback: boolean;
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  player: Player | null;
  boardsShiftX: number;
  flipBoard(): void;
  switchBoard(boardToShow: number): void;
  changeDarkChessMode(): void;
  toggleShowDarkChessHiddenPieces(): void;
  setBoardsShiftX(boardsShiftX: number): void;
}

interface State {
  resignModalVisible: boolean;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps> & DispatchProps;

class GameActions extends React.Component<Props, State> {
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

  navigateToTakebackRequestMove = () => {
    const {
      game,
      takebackRequest
    } = this.props;

    if (takebackRequest) {
      game.navigateToMove(takebackRequest.moveIndex);
    }
  };

  requestTakeback = () => {
    const {
      game,
      isNoMovesMade,
      takebackRequest
    } = this.props;

    if (!isNoMovesMade && !takebackRequest) {
      game.requestTakeback();
    }
  };

  requestTakebackUpToCurrentMove = () => {
    const {
      game,
      isNoMovesMade,
      isCurrentMoveLast,
      takebackRequest
    } = this.props;

    if (!isNoMovesMade && !isCurrentMoveLast && !takebackRequest) {
      game.requestTakebackUpToCurrentMove();
    }
  };

  acceptTakeback = () => {
    this.props.game.acceptTakeback();
  };

  cancelTakeback = () => {
    this.props.game.cancelTakeback();
  };

  declineTakeback = () => {
    this.props.game.declineTakeback();
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

  flipBoard = () => {
    this.props.flipBoard();
  };

  switchBoard = () => {
    const {
      game,
      boardToShow,
      switchBoard
    } = this.props;

    if (boardToShow !== 'all') {
      switchBoard(game.getNextBoard(boardToShow));
    }
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

  shiftBoard = (incrementX: number) => {
    const {
      boardsShiftX,
      setBoardsShiftX
    } = this.props;

    setBoardsShiftX(boardsShiftX + incrementX);
  };

  normalizeBoardsShift = () => {
    this.props.setBoardsShiftX(0);
  };

  render() {
    const {
      game,
      result,
      isBasicTakeback,
      isBlackBase,
      isNoMovesMade,
      isCurrentMoveLast,
      boardToShow,
      drawOffer,
      takebackRequest,
      darkChessMode,
      player,
      showDarkChessHiddenPieces,
      showFantomPieces
    } = this.props;
    const boardsString = game.isAliceChess
      ? 'boards'
      : 'board';
    const buttons: JSX.Element[] = [];
    const takebackMoveLink = !!takebackRequest && (
      isBasicTakeback
        ? ''
        : takebackRequest.moveIndex === -1
          ? ' up to the start of the game'
          : (
            <React.Fragment>
              {' '}up to move <span className="takeback-move-link" onClick={this.navigateToTakebackRequestMove}>
                {game.getUsedMoves()[takebackRequest.moveIndex].figurine}
              </span>
            </React.Fragment>
          )
    );

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
        </div>,
        <div
          key="request-takeback"
          className={classNames('button', { disabled: isNoMovesMade || takebackRequest })}
          title="Request a takeback"
          onClick={this.requestTakeback}
        >
          <i className="fa fa-reply" />
        </div>,
        <div
          key="request-takeback-up-to-move"
          className={classNames('button', { disabled: isNoMovesMade || isCurrentMoveLast || takebackRequest })}
          title="Request a takeback up to the current position"
          onClick={this.requestTakebackUpToCurrentMove}
        >
          <i className="fa fa-reply-all" />
        </div>
      );
    }

    buttons.push(
      <div
        key="flip-board"
        className={classNames('button', {
          enabled: !player || player.color === ColorEnum.WHITE
            ? isBlackBase
            : !isBlackBase
        })}
        title={`Flip the ${boardsString}`}
        onClick={this.flipBoard}
      >
        <i className="fa fa-retweet" />
        <div className="piece-container">
          <Piece
            color={isBlackBase ? ColorEnum.BLACK : ColorEnum.WHITE}
            type={PieceTypeEnum.KING}
            location={null}
          />
        </div>
      </div>
    );

    if (game.isAliceChess && boardToShow !== 'all') {
      buttons.push(
        <div
          key="switch-board"
          className="button"
          title={`Switch to board ${game.getNextBoard(boardToShow) + 1}`}
          onClick={this.switchBoard}
        >
          {boardToShow + 1}
        </div>
      );
    }

    if (game.isCylinderChess) {
      buttons.push(
        <div
          key="shift-board-left"
          className="button"
          title={`Shift the ${boardsString} to the left`}
          onClick={() => this.shiftBoard(1)}
        >
          <i className="fa fa-arrow-left" />
        </div>,
        <div
          key="normalize-board-shift"
          className="button"
          title={`Normalize the ${boardsString}`}
          onClick={this.normalizeBoardsShift}
        >
          <i className="fa fa-balance-scale" />
        </div>,
        <div
          key="shift-board-right"
          className="button"
          title={`Shift the ${boardsString} to the right`}
          onClick={() => this.shiftBoard(-1)}
        >
          <i className="fa fa-arrow-right" />
        </div>
      );
    }

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
                color={player ? player.color : ColorEnum.WHITE}
                type={PieceTypeEnum.KING}
                location={null}
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
                color={darkChessMode}
                type={PieceTypeEnum.KING}
                location={null}
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
                color={isBlackBase ? ColorEnum.WHITE : ColorEnum.BLACK}
                type={PieceTypeEnum.KING}
                location={null}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <React.Fragment>
        <div className="game-actions">
          {!!buttons.length && (
            <div className="buttons">
              {buttons}
            </div>
          )}
          {player && takebackRequest && !result && (
            <div className="action">
              {
                player.color === takebackRequest.player ? (
                  <React.Fragment>
                    <span>
                      You requested a takeback{takebackMoveLink}
                    </span>
                    <i
                      className="fa fa-times"
                      title="Cancel"
                      onClick={this.cancelTakeback}
                    />
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <span>
                      {COLOR_NAMES[takebackRequest.player]} requested a takeback{takebackMoveLink}
                    </span>
                    <i
                      className="fa fa-check"
                      title="Accept"
                      onClick={this.acceptTakeback}
                    />
                    <i
                      className="fa fa-times"
                      title="Decline"
                      onClick={this.declineTakeback}
                    />
                  </React.Fragment>
                )
              }
            </div>
          )}
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

export default connect(mapStateToProps)(GameActions);
