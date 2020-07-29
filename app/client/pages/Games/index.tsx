import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import io from 'socket.io-client';
import MenuItem from '@material-ui/core/MenuItem';
import classNames from 'classnames';

import {
  TIME_CONTROL_NAMES,
  POSSIBLE_TIMER_BASES_IN_MINUTES,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_SECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS,
} from 'shared/constants';

import {
  CorrespondenceTimeControl,
  GameMinimalData,
  GameVariantEnum,
  TimeControl,
  TimeControlEnum,
  TimerTimeControl,
} from 'shared/types';

import { Game } from 'client/helpers';

import { DispatchProps, ReduxState } from 'client/store';
import {
  changeSettings,
} from 'client/actions';

import Button from '../../components/Button';
import DocumentTitle from '../../components/DocumentTitle';
import GameVariantLink from '../../components/GameVariantLink';
import GameVariantSelect from '../../components/GameVariantSelect';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import GameVariantStar from 'client/components/GameVariantStar';

import './index.less';

type Props = RouteComponentProps<any> & ReturnType<typeof mapStateToProps> & DispatchProps;

interface State {
  createGameModalVisible: boolean;
  games: GameMinimalData[];
  timeControl: TimeControl;
  variants: GameVariantEnum[];
}

class Games extends React.Component<Props, State> {
  socket?: io.Socket;
  state: State = {
    createGameModalVisible: false,
    timeControl: this.props.timeControl,
    variants: [],
    games: [],
  };

  componentDidMount() {
    const socket = this.socket = io.connect('/games');

    socket.on('gameList', (games) => {
      this.setState({
        games,
      });
    });

    socket.on('gameCreated', (game) => {
      this.setState(({ games }) => ({
        games: [
          ...games,
          game,
        ],
      }));
    });
  }

  componentWillUnmount() {
    this.socket!.disconnect();
  }

  openModal = () => {
    this.setState({
      variants: this.props.lastPlayedVariants,
      createGameModalVisible: true,
    });
  };

  closeModal = () => {
    this.setState({
      createGameModalVisible: false,
    });
  };

  createGame = () => {
    const {
      dispatch,
      loggedIn,
    } = this.props;
    const {
      variants,
      timeControl,
    } = this.state;

    this.closeModal();

    dispatch(changeSettings('lastPlayedVariants', variants));

    if (loggedIn) {
      this.socket!.emit('createGame', {
        timeControl,
        variants,
      });
    }
  };

  onTimeControlChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const {
      dispatch,
    } = this.props;
    const timeControl = e.target.value as TimeControlEnum;
    const newTimeControl: TimeControl = timeControl === TimeControlEnum.NONE
      ? null
      : timeControl === TimeControlEnum.TIMER
        ? { type: TimeControlEnum.TIMER, base: 10 * 60 * 1000, increment: 5 * 1000 }
        : { type: TimeControlEnum.CORRESPONDENCE, base: 2 * 24 * 60 * 60 * 1000 };

    dispatch(changeSettings('timeControl', newTimeControl));

    this.setState({
      timeControl: newTimeControl,
    });
  };

  onTimeControlBaseChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const {
      dispatch,
    } = this.props;
    const newBase = +(e.target.value as string);

    this.setState(({ timeControl }) => {
      const newTimeControl = {
        ...timeControl as CorrespondenceTimeControl | TimerTimeControl,
        base: newBase,
      };

      dispatch(changeSettings('timeControl', newTimeControl));

      return {
        timeControl: newTimeControl,
      };
    });
  };

  onTimeControlIncrementChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const {
      dispatch,
    } = this.props;
    const newIncrement = +(e.target.value as string);

    this.setState(({ timeControl }) => {
      const newTimeControl = {
        ...timeControl as TimerTimeControl,
        increment: newIncrement,
      };

      dispatch(changeSettings('timeControl', newTimeControl));

      return {
        timeControl: {
          ...timeControl as TimerTimeControl,
          increment: newIncrement,
        },
      };
    });
  };

  onVariantsChange = (variants: GameVariantEnum[]) => {
    this.setState({
      variants,
    });
  };

  enterGame(id: string) {
    const {
      history,
    } = this.props;

    history.push(`/games/${id}`);
  }

  render() {
    const {
      createGameModalVisible,
      games,
      timeControl,
      variants,
    } = this.state;
    const disabledVariants = timeControl?.type === TimeControlEnum.TIMER
      ? []
      : [GameVariantEnum.COMPENSATION_CHESS];

    return (
      <div className="route games-route">

        <DocumentTitle value="AllChess - Games" />

        <Button
          onClick={this.openModal}
          style={{ margin: 10 }}
          disabled={!this.props.loggedIn}
        >
          Create game
        </Button>

        <table className="games">
          <thead>
            <tr>
              <th className="time-control">Time control</th>
              <th className="variants">Variants</th>
            </tr>
          </thead>
          <tbody>
            {games.map(({ id, timeControl, variants }) => (
              <tr
                key={id}
                className="game"
                onClick={() => this.enterGame(id)}
              >
                <td className="time-control">{Game.getTimeControlString(timeControl)}</td>
                <td className="variants">{variants.length ? variants.map((variant, ix) => (
                  <React.Fragment key={variant}>
                    {' '}
                    <GameVariantLink
                      variant={variant}
                      className="variant"
                    />
                    {ix === variants.length - 1 ? '' : ','}
                  </React.Fragment>
                )) : 'Standard'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Modal
          visible={createGameModalVisible}
          onOverlayClick={this.closeModal}
          className="game-create-settings-modal"
        >
          <div className="modal-content">
            <h4>
              Game settings
            </h4>

            <div className="time-control">
              <div>
                Time control:{' '}
                <Select
                  value={timeControl ? timeControl.type : TimeControlEnum.NONE}
                  onChange={this.onTimeControlChange}
                  renderValue={() => TIME_CONTROL_NAMES[timeControl ? timeControl.type : TimeControlEnum.NONE]}
                >
                  <MenuItem value={TimeControlEnum.NONE}>
                    {TIME_CONTROL_NAMES[TimeControlEnum.NONE]}
                  </MenuItem>
                  <MenuItem value={TimeControlEnum.TIMER}>
                    {TIME_CONTROL_NAMES[TimeControlEnum.TIMER]}
                  </MenuItem>
                  <MenuItem value={TimeControlEnum.CORRESPONDENCE}>
                    {TIME_CONTROL_NAMES[TimeControlEnum.CORRESPONDENCE]}
                  </MenuItem>
                </Select>
              </div>

              {timeControl && (
                <div style={{ marginTop: 15 }}>
                  {timeControl.type === TimeControlEnum.TIMER ? 'Minutes per player: ' : 'Days per turn: '}
                  <Select
                    value={timeControl.base}
                    onChange={this.onTimeControlBaseChange}
                  >
                    {(
                      timeControl.type === TimeControlEnum.TIMER
                        ? POSSIBLE_TIMER_BASES_IN_MILLISECONDS
                        : POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS
                    ).map((base, ix) => (
                      <MenuItem key={ix} value={base}>
                        {(
                          timeControl.type === TimeControlEnum.TIMER
                            ? POSSIBLE_TIMER_BASES_IN_MINUTES
                            : POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS
                        )[ix]}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              )}

              {timeControl?.type === TimeControlEnum.TIMER && (
                <div>
                  Increment in seconds per turn:{' '}
                  <Select
                    value={timeControl.increment}
                    onChange={this.onTimeControlIncrementChange}
                  >
                    {POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS.map((increment, ix) => (
                      <MenuItem key={ix} value={increment}>
                        {POSSIBLE_TIMER_INCREMENTS_IN_SECONDS[ix]}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div
              className={classNames('variants', { standard: variants.length === 0 })}
              style={{ marginTop: 20 }}
            >
              Variants:{' '}
              <GameVariantSelect
                selectedVariants={variants}
                disabledVariants={disabledVariants}
                onVariantsChange={this.onVariantsChange}
              />

              <GameVariantStar variants={variants} />
            </div>

            <Button
              onClick={this.createGame}
              style={{ marginTop: 30 }}
              disabled={disabledVariants.some((variant) => variants.includes(variant))}
            >
              Create game
            </Button>
          </div>
        </Modal>

      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    loggedIn: !!state.user,
    timeControl: state.gameSettings.timeControl,
    lastPlayedVariants: state.gameSettings.lastPlayedVariants,
  };
}

export default connect(mapStateToProps)(Games);
