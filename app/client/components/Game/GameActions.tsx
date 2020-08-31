import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import {
  ColorEnum,
  GamePlayers,
  GameResult,
  GameStatusEnum,
  PieceTypeEnum,
  Player,
  TakebackRequest,
} from 'shared/types';

import { Game } from 'client/helpers';

import { changeSettings } from 'client/actions';
import { DispatchProps, ReduxState } from 'client/store';

import Piece from '../Piece';
import Dialog from '../Dialog';

export interface OwnProps {
  game: Game;
  result: GameResult | null;
  status: GameStatusEnum;
  players: GamePlayers;
  isBlackBase: boolean;
  boardToShow: number | 'all';
  drawOffer: ColorEnum | null;
  takebackRequest: TakebackRequest | null;
  rematchOffer: ColorEnum | null;
  rematchAllowed: boolean;
  takebackMoveIndex: number | null;
  darkChessMode: ColorEnum | null;
  showDarkChessHiddenPieces: boolean;
  player: Player | null;
  boardsShiftX: number;
  flipBoard(): void;
  switchBoard(boardToShow: number): void;
  toggleShowDarkChessHiddenPieces(): void;
  setBoardsShiftX(boardsShiftX: number): void;
}

interface State {
  resignModalVisible: boolean;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps> & DispatchProps;

class GameActions extends React.Component<Props, State> {
  state: State = {
    resignModalVisible: false,
  };

  onDrawOfferClick = () => {
    const {
      game,
      drawOffer,
      player,
    } = this.props;

    if (player) {
      if (drawOffer === player.color) {
        game.cancelDraw();
      } else if (drawOffer === Game.getOppositeColor(player.color)) {
        game.acceptDraw();
      } else {
        game.offerDraw();
      }
    }
  };

  onTakebackRequestClick = () => {
    const {
      game,
      takebackRequest,
      player,
    } = this.props;

    if (player) {
      if (takebackRequest?.player === player.color) {
        game.cancelTakeback();
      } else if (takebackRequest?.player === Game.getOppositeColor(player.color)) {
        game.acceptTakeback();
      } else {
        game.requestTakeback();
      }
    }
  };

  onRematchOfferClick = () => {
    const {
      game,
      rematchOffer,
      player,
    } = this.props;

    if (player) {
      if (rematchOffer === player.color) {
        game.cancelRematch();
      } else if (rematchOffer === Game.getOppositeColor(player.color)) {
        game.acceptRematch();
      } else {
        game.offerRematch();
      }
    }
  };

  openResignModal = () => {
    this.setState({
      resignModalVisible: true,
    });
  };

  closeResignModal = () => {
    this.setState({
      resignModalVisible: false,
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
      switchBoard,
    } = this.props;

    if (boardToShow !== 'all') {
      switchBoard(game.getNextBoard(boardToShow));
    }
  };

  toggleShowFantomPieces = () => {
    const {
      dispatch,
      showFantomPieces,
    } = this.props;

    dispatch(changeSettings('showFantomPieces', !showFantomPieces));
  };

  toggleShowDarkChessHiddenPieces = () => {
    const {
      darkChessMode,
      toggleShowDarkChessHiddenPieces,
    } = this.props;

    if (darkChessMode) {
      toggleShowDarkChessHiddenPieces();
    }
  };

  shiftBoard = (incrementX: number) => {
    const {
      isBlackBase,
      boardsShiftX,
      setBoardsShiftX,
    } = this.props;

    setBoardsShiftX(boardsShiftX + (isBlackBase ? -incrementX : incrementX));
  };

  render() {
    const {
      game,
      result,
      status,
      isBlackBase,
      takebackMoveIndex,
      boardToShow,
      drawOffer,
      takebackRequest,
      rematchOffer,
      rematchAllowed,
      darkChessMode,
      player,
      showDarkChessHiddenPieces,
      showFantomPieces,
    } = this.props;
    const boardsString = game.isAliceChess
      ? 'boards'
      : 'board';
    const buttons: JSX.Element[] = [];

    if (player && status === GameStatusEnum.ONGOING) {
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
          className={classNames('button', {
            'offering-draw': drawOffer === player.color,
            'offered-draw': drawOffer === Game.getOppositeColor(player.color),
          })}
          title={
            drawOffer === player.color
              ? 'Cancel draw offer'
              : drawOffer === Game.getOppositeColor(player.color)
                ? 'Accept draw offer'
                : 'Offer draw'
          }
          onClick={this.onDrawOfferClick}
        >
          <i className="fa fa-handshake-o" />
        </div>,
        <div
          key="request-takeback"
          className={classNames('button', {
            disabled: !takebackRequest && takebackMoveIndex === null,
            'requesting-takeback': takebackRequest?.player === player.color,
            'requested-takeback': takebackRequest?.player === Game.getOppositeColor(player.color),
          })}
          title={
            takebackRequest?.player === player.color
              ? 'Cancel takeback'
              : takebackRequest?.player === Game.getOppositeColor(player.color)
                ? 'Accept takeback'
                : 'Request takeback'
          }
          onClick={this.onTakebackRequestClick}
        >
          <i className="fa fa-reply" />
        </div>,
      );
    } else if (player && status === GameStatusEnum.FINISHED) {
      buttons.push(
        <div
          key="offer-rematch"
          className={classNames('button', {
            disabled: !rematchAllowed,
            'offering-rematch': rematchOffer === player.color,
            'offered-rematch': rematchOffer === Game.getOppositeColor(player.color),
          })}
          title={
            rematchOffer === player.color
              ? 'Cancel rematch offer'
              : rematchOffer === Game.getOppositeColor(player.color)
                ? 'Accept rematch offer'
                : 'Offer rematch'
          }
          onClick={this.onRematchOfferClick}
        >
          <i className="fa fa-refresh" />
        </div>,
      );
    }

    buttons.push(
      <div
        key="flip-board"
        className={classNames('button', {
          enabled: !player || player.color === ColorEnum.WHITE
            ? isBlackBase
            : !isBlackBase,
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
      </div>,
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
        </div>,
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
          key="shift-board-right"
          className="button"
          title={`Shift the ${boardsString} to the right`}
          onClick={() => this.shiftBoard(-1)}
        >
          <i className="fa fa-arrow-right" />
        </div>,
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
        </div>,
      );
    }

    if (game.isDarkChess && result) {
      buttons.push(
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
        </div>,
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
        </div>

        <Dialog
          visible={this.state.resignModalVisible}
          onOverlayClick={this.closeResignModal}
          question="Are you sure you want to resign?"
          choices={[
            { key: 'yes', text: 'Yes', className: 'ok' },
            { key: 'no', text: 'Cancel', className: 'cancel' },
          ]}
          onChoose={this.resign}
        />
      </React.Fragment>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    showFantomPieces: state.gameSettings.showFantomPieces,
  };
}

export default connect(mapStateToProps)(GameActions);
