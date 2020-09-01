import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import Tooltip from '@material-ui/core/Tooltip';

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
      game,
      isBlackBase,
      boardsShiftX,
      setBoardsShiftX,
    } = this.props;

    setBoardsShiftX((boardsShiftX + (isBlackBase ? -incrementX : incrementX) + game.boardWidth) % game.boardWidth);
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
        <Tooltip key="resign" title="Resign">
          <div
            className="button"
            onClick={this.openResignModal}
          >
            <i className="fa fa-flag-o" />
          </div>
        </Tooltip>,
        <Tooltip
          key="offer-draw"
          title={
            drawOffer === player.color
              ? 'Cancel draw offer'
              : drawOffer === Game.getOppositeColor(player.color)
                ? 'Accept draw offer'
                : 'Offer draw'
          }
        >
          <div
            className={classNames('button', {
              'offering-draw': drawOffer === player.color,
              'offered-draw': drawOffer === Game.getOppositeColor(player.color),
            })}
            onClick={this.onDrawOfferClick}
          >
            <i className="fa fa-handshake-o" />
          </div>
        </Tooltip>,
        <Tooltip
          key="request-takeback"
          title={
            takebackRequest?.player === player.color
              ? 'Cancel takeback'
              : takebackRequest?.player === Game.getOppositeColor(player.color)
                ? 'Accept takeback'
                : 'Request takeback'
          }
        >
          <div
            className={classNames('button', {
              disabled: !takebackRequest && takebackMoveIndex === null,
              'requesting-takeback': takebackRequest?.player === player.color,
              'requested-takeback': takebackRequest?.player === Game.getOppositeColor(player.color),
            })}
            onClick={this.onTakebackRequestClick}
          >
            <i className="fa fa-reply" />
          </div>
        </Tooltip>,
      );
    } else if (player && status === GameStatusEnum.FINISHED) {
      buttons.push(
        <Tooltip
          key="offer-rematch"
          title={
            rematchOffer === player.color
              ? 'Cancel rematch offer'
              : rematchOffer === Game.getOppositeColor(player.color)
                ? 'Accept rematch offer'
                : 'Offer rematch'
          }
        >
          <div
            className={classNames('button', {
              disabled: !rematchAllowed,
              'offering-rematch': rematchOffer === player.color,
              'offered-rematch': rematchOffer === Game.getOppositeColor(player.color),
            })}
            onClick={this.onRematchOfferClick}
          >
            <i className="fa fa-refresh" />
          </div>
        </Tooltip>,
      );
    }

    buttons.push(
      <Tooltip key="flip-board" title={`Flip the ${boardsString}`}>
        <div
          className={classNames('button', {
            enabled: !player || player.color === ColorEnum.WHITE
              ? isBlackBase
              : !isBlackBase,
          })}
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
      </Tooltip>,
    );

    if (game.isAliceChess && boardToShow !== 'all') {
      buttons.push(
        <Tooltip
          key="switch-board"
          title={`Switch to board ${game.getNextBoard(boardToShow) + 1}`}
        >
          <div
            className="button"
            onClick={this.switchBoard}
          >
            {boardToShow + 1}
          </div>
        </Tooltip>,
      );
    }

    if (game.isCylinderChess) {
      buttons.push(
        <Tooltip
          key="shift-board-left"
          title={`Shift the ${boardsString} to the left`}
        >
          <div
            className="button"
            onClick={() => this.shiftBoard(1)}
          >
            <i className="fa fa-arrow-left" />
          </div>
        </Tooltip>,
        <Tooltip
          key="shift-board-right"
          title={`Shift the ${boardsString} to the right`}
        >
          <div
            className="button"
            onClick={() => this.shiftBoard(-1)}
          >
            <i className="fa fa-arrow-right" />
          </div>
        </Tooltip>,
      );
    }

    if (game.isAliceChess) {
      buttons.push(
        <Tooltip
          key="show-fantom-pieces"
          title={showFantomPieces ? 'Hide fantom pieces' : 'Show fantom pieces'}
        >
          <div
            className={classNames('button', { enabled: showFantomPieces })}
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
        </Tooltip>,
      );
    }

    if (game.isDarkChess && result) {
      buttons.push(
        <Tooltip
          key="show-hidden-pieces"
          title={showDarkChessHiddenPieces ? 'Hide hidden pieces' : 'Show hidden pieces'}
        >
          <div
            className={classNames('button', { disabled: !darkChessMode, enabled: showDarkChessHiddenPieces })}
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
        </Tooltip>,
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
