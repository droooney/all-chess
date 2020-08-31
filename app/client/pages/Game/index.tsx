import * as React from 'react';
import { connect } from 'react-redux';
import io from 'socket.io-client';
import { RouteComponentProps } from 'react-router-dom';
import find from 'lodash/find';
import omit from 'lodash/omit';

import {
  ALICE_CHESS_BOARDS_MARGIN,
  GAME_GRID_GAP,
  MAX_LEFT_DESKTOP_PANEL_WIDTH,
  MAX_RIGHT_DESKTOP_PANEL_WIDTH,
  MAX_TABLET_PANEL_WIDTH,
  MIN_LEFT_DESKTOP_PANEL_WIDTH,
  MIN_RIGHT_DESKTOP_PANEL_WIDTH,
  MIN_TABLET_PANEL_WIDTH,
} from 'client/constants';
import { GAME_VARIANT_NAMES } from 'shared/constants';

import {
  DarkChessGameInitialData,
  GameInitialData,
  Player,
} from 'shared/types';

import { fetch, Game as GameHelper } from 'client/helpers';

import { ReduxState } from 'client/store';

import DocumentTitle from 'client/components/DocumentTitle';
import Game from 'client/components/Game';

import './index.less';

interface OwnProps {

}

type Props = (
  OwnProps
  & ReturnType<typeof mapStateToProps>
  & RouteComponentProps<{ gameId: string }, any, { rematch?: boolean; } | undefined>
);

interface State {
  game: GameHelper | null;
  player: Player | null;
  boardsWidth: number;
  gridMode: 'desktop' | 'tablet' | 'mobile';
  leftDesktopPanelWidth: number;
  rightDesktopPanelWidth: number;
  tabletPanelWidth: number;
}

class GamePage extends React.PureComponent<Props, State> {
  socket?: io.Socket;
  state: State = {
    game: null,
    player: null,
    boardsWidth: 0,
    gridMode: 'desktop',
    leftDesktopPanelWidth: 0,
    rightDesktopPanelWidth: 0,
    tabletPanelWidth: 0,
  };

  componentDidMount() {
    this.loadGame();

    window.addEventListener('resize', this.onWindowResize);
  }

  componentDidUpdate(prevProps: Props) {
    const {
      history,
      location,
    } = this.props;

    if (this.getGameId() !== this.getGameId(prevProps)) {
      this.state.game?.destroy();

      const isRematch = location.state?.rematch;

      if (isRematch) {
        history.replace({
          ...location,
          state: omit(location.state, 'rematch'),
        });

        this.setupSocket();
      } else {
        this.loadGame();
      }
    }
  }

  componentWillUnmount() {
    this.state.game?.destroy();

    window.removeEventListener('resize', this.onWindowResize);
  }

  getGameId(props: Props = this.props): string {
    return props.match.params.gameId;
  }

  async loadGame() {
    const {
      history,
      user,
    } = this.props;
    const gameId = this.getGameId();
    const {
      success,
      game,
    } = await fetch({
      url: '/api/game/{gameId}',
      method: 'get',
      urlParams: { gameId },
    });

    if (!success) {
      return;
    }

    if (!game) {
      // TODO: show "game not found"

      history.push('/');

      return;
    }

    if (game === 'active') {
      this.setupSocket();
    } else {
      const player = find(game.players, { id: user?.id }) || null;

      this.setState({
        game: new GameHelper({
          game,
          player,
        }),
        player,
      });
    }

    this.updateGridLayout();
  }

  setupSocket() {
    const socket = this.socket = io.connect(`/game/${this.getGameId()}`);

    socket.on('initialGameData', this.onGameData);
    socket.on('initialDarkChessGameData', this.onGameData);
  }

  updateGridLayout() {
    const {
      game,
    } = this.state;

    if (!game) {
      return;
    }

    const {
      scrollSize,
    } = this.props;
    const {
      boardCount,
      boardSidesRenderedRatio,
      boardToShow: currentBoardToShow,
    } = game;
    const availableDesktopWidth = window.innerWidth - 2 * GAME_GRID_GAP - scrollSize;
    const availableTabletWidth = window.innerWidth - 2 * GAME_GRID_GAP - scrollSize;
    const availableMobileWidth = window.innerWidth - scrollSize;
    const availableDesktopHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    const availableTabletHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    // const availableMobileHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    const maxAvailableDesktopWidth = (
      availableDesktopWidth
      - MIN_LEFT_DESKTOP_PANEL_WIDTH
      - MIN_RIGHT_DESKTOP_PANEL_WIDTH
      - 2 * GAME_GRID_GAP
    );
    const maxDesktopBoardWidth = availableDesktopHeight * boardSidesRenderedRatio;
    const maxDesktopBoardsWidth = maxDesktopBoardWidth * boardCount + ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1);
    const numberBoardToShow = currentBoardToShow !== 'all' && currentBoardToShow;
    let gridMode: 'desktop' | 'tablet' | 'mobile';
    let boardsWidth: number;
    let boardToShow: 'all' | number;
    let leftDesktopPanelWidth: number;
    let rightDesktopPanelWidth: number;
    let tabletPanelWidth: number;

    if (maxDesktopBoardsWidth <= maxAvailableDesktopWidth) {
      gridMode = 'desktop';
      boardsWidth = maxDesktopBoardsWidth;
      boardToShow = 'all';
      leftDesktopPanelWidth = Math.min(
        MAX_LEFT_DESKTOP_PANEL_WIDTH,
        MIN_LEFT_DESKTOP_PANEL_WIDTH + (maxAvailableDesktopWidth - maxDesktopBoardsWidth)
        * MAX_LEFT_DESKTOP_PANEL_WIDTH / (MAX_LEFT_DESKTOP_PANEL_WIDTH + MAX_RIGHT_DESKTOP_PANEL_WIDTH),
      );
      rightDesktopPanelWidth = Math.min(
        MAX_LEFT_DESKTOP_PANEL_WIDTH,
        MIN_LEFT_DESKTOP_PANEL_WIDTH + (maxAvailableDesktopWidth - maxDesktopBoardsWidth)
        * MAX_LEFT_DESKTOP_PANEL_WIDTH / (MAX_LEFT_DESKTOP_PANEL_WIDTH + MAX_RIGHT_DESKTOP_PANEL_WIDTH),
      );
      tabletPanelWidth = 0;
    } else {
      const maxHeight = (maxAvailableDesktopWidth - ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1)) / boardCount / boardSidesRenderedRatio;

      if (maxHeight >= availableDesktopHeight * 0.8) {
        gridMode = 'desktop';
        boardsWidth = maxAvailableDesktopWidth;
        boardToShow = 'all';
        leftDesktopPanelWidth = MIN_LEFT_DESKTOP_PANEL_WIDTH;
        rightDesktopPanelWidth = MIN_RIGHT_DESKTOP_PANEL_WIDTH;
        tabletPanelWidth = 0;
      } else {
        const maxAvailableTabletWidth = (
          availableTabletWidth
          - MIN_TABLET_PANEL_WIDTH
          - GAME_GRID_GAP
        );
        const maxTabletBoardWidth = availableTabletHeight * boardSidesRenderedRatio;
        const maxTabletBoardsWidth = maxDesktopBoardWidth * boardCount + ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1);

        if (maxTabletBoardsWidth <= maxAvailableTabletWidth) {
          gridMode = 'tablet';
          boardsWidth = maxTabletBoardsWidth;
          boardToShow = 'all';
          leftDesktopPanelWidth = 0;
          rightDesktopPanelWidth = 0;
          tabletPanelWidth = Math.min(
            MAX_TABLET_PANEL_WIDTH,
            MIN_TABLET_PANEL_WIDTH + (maxAvailableTabletWidth - maxTabletBoardsWidth),
          );
        } else {
          const maxHeight = (maxAvailableTabletWidth - ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1)) / boardCount / boardSidesRenderedRatio;

          if (maxHeight >= availableTabletHeight * 0.8) {
            gridMode = 'tablet';
            boardsWidth = maxAvailableTabletWidth;
            boardToShow = 'all';
            leftDesktopPanelWidth = 0;
            rightDesktopPanelWidth = 0;
            tabletPanelWidth = MIN_TABLET_PANEL_WIDTH;
          } else if (maxTabletBoardWidth <= maxAvailableTabletWidth) {
            gridMode = 'tablet';
            boardsWidth = maxTabletBoardWidth;
            boardToShow = numberBoardToShow || 0;
            leftDesktopPanelWidth = 0;
            rightDesktopPanelWidth = 0;
            tabletPanelWidth = Math.min(
              MAX_TABLET_PANEL_WIDTH,
              MIN_TABLET_PANEL_WIDTH + (maxAvailableTabletWidth - maxTabletBoardWidth),
            );
          } else {
            const maxHeight = maxAvailableTabletWidth / boardSidesRenderedRatio;

            if (maxHeight >= availableTabletHeight * 0.8) {
              gridMode = 'tablet';
              boardsWidth = maxAvailableTabletWidth;
              boardToShow = numberBoardToShow || 0;
              leftDesktopPanelWidth = 0;
              rightDesktopPanelWidth = 0;
              tabletPanelWidth = MIN_TABLET_PANEL_WIDTH;
            } else {
              gridMode = 'mobile';
              boardsWidth = availableMobileWidth;
              boardToShow = numberBoardToShow || 0;
              leftDesktopPanelWidth = 0;
              rightDesktopPanelWidth = 0;
              tabletPanelWidth = 0;
            }
          }
        }
      }
    }

    game.setBoardToShow(boardToShow);

    this.setState({
      boardsWidth,
      gridMode,
      leftDesktopPanelWidth,
      rightDesktopPanelWidth,
      tabletPanelWidth,
    });
  }

  onWindowResize = () => {
    this.updateGridLayout();
  };

  onGameData = (gameInitialData: GameInitialData | DarkChessGameInitialData) => {
    const {
      timestamp,
      player,
      game: gameData,
    } = gameInitialData;

    this.state.game?.removeListeners();

    const game = new GameHelper({
      game: gameData,
      socket: this.socket,
      player,
      currentMoveIndex: this.state.game ? this.state.game.currentMoveIndex : undefined,
      timestamp,
    });

    this.setState({
      game,
      player,
    });
    this.updateGridLayout();

    console.log(game);
  };

  render() {
    const {
      game,
      boardsWidth,
      gridMode,
      leftDesktopPanelWidth,
      rightDesktopPanelWidth,
      tabletPanelWidth,
    } = this.state;
    let content: React.ReactNode;
    let title: string | null;

    if (game) {
      const {
        variants,
      } = game;

      title = `AllChess - ${variants.length > 1 ? 'Mixed' : variants.length ? GAME_VARIANT_NAMES[variants[0]] : 'Standard'} Game`;

      content = (
        <Game
          game={game}
          showBoard
          showPlayers
          showMovesPanel
          showChat
          showActions
          showInfo
          boardsWidth={boardsWidth}
        />
      );
    } else {
      content = (
        <div className="spinner">
          Loading game...
        </div>
      );
      title = null;
    }

    return (
      <div
        className={`route game-route grid-${gridMode}-style`}
        style={{
          '--boards-width': `${boardsWidth}px`,
          '--grid-gap': `${GAME_GRID_GAP}px`,
          '--left-desktop-panel-width': `${leftDesktopPanelWidth}px`,
          '--right-desktop-panel-width': `${rightDesktopPanelWidth}px`,
          '--tablet-panel-width': `${tabletPanelWidth}px`,
        } as React.CSSProperties}
      >
        <DocumentTitle value={title} />
        {content}
      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    scrollSize: state.common.scrollSize,
    user: state.user,
  };
}

export default connect(mapStateToProps)(GamePage);
