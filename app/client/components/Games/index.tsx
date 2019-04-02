import * as _ from 'lodash';
import * as React from 'react';
import { connect, DispatchProps } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');

import { ReduxState } from '../../store';
import { Game as GameHelper } from '../../helpers';
import {
  CorrespondenceTimeControl,
  GameMinimalData,
  GameVariantEnum,
  TimeControl,
  TimeControlEnum,
  TimerTimeControl
} from '../../../types';
import {
  changeSettings
} from '../../actions';
import {
  POSSIBLE_TIMER_BASES_IN_MINUTES,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_SECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS
} from '../../../shared/constants';

import DocumentTitle from '../DocumentTitle';
import GameVariantLink from '../GameVariantLink';
import Modal from '../Modal';

import './index.less';

interface GameVariant {
  variant: GameVariantEnum;
  enabled: boolean;
  allowed: boolean;
}

type Props = RouteComponentProps<any> & ReturnType<typeof mapStateToProps> & DispatchProps;

interface State {
  createGameModalVisible: boolean;
  games: GameMinimalData[];
  timeControl: TimeControl;
  variants: GameVariant[];
}

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;
const ONE_SECOND = 1000;

class Games extends React.Component<Props, State> {
  static defaultVariants = _.map(GameVariantEnum, (variant) => ({
    variant,
    allowed: true,
    enabled: false
  }));

  socket?: io.Socket;
  state: State = {
    createGameModalVisible: false,
    timeControl: this.props.timeControl,
    variants: Games.defaultVariants,
    games: []
  };

  componentDidMount() {
    const socket = this.socket = io.connect('/games');

    socket.on('gameList', (games) => {
      this.setState({
        games
      });
    });

    socket.on('gameCreated', (game) => {
      this.setState(({ games }) => ({
        games: [
          ...games,
          game
        ]
      }));
    });
  }

  componentWillUnmount() {
    this.socket!.disconnect();
  }

  getSelectedVariants(variants: GameVariant[]): GameVariantEnum[] {
    return variants
      .filter(({ enabled }) => enabled)
      .map(({ variant }) => variant);
  }

  openModal = () => {
    this.setState({
      createGameModalVisible: true
    });
  };

  closeModal = () => {
    this.setState({
      variants: Games.defaultVariants,
      createGameModalVisible: false
    });
  };

  createGame = () => {
    this.closeModal();

    if (this.props.loggedIn) {
      this.socket!.emit('createGame', {
        timeControl: this.state.timeControl,
        variants: this.getSelectedVariants(this.state.variants)
      });
    }
  };

  onTimeControlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const {
      dispatch
    } = this.props;
    const timeControl = e.target.value as TimeControlEnum;
    const newTimeControl: TimeControl = timeControl === TimeControlEnum.NONE
      ? null
      : timeControl === TimeControlEnum.TIMER
        ? { type: TimeControlEnum.TIMER, base: 10 * 60 * 1000, increment: 5 * 1000 }
        : { type: TimeControlEnum.CORRESPONDENCE, base: 2 * 24 * 60 * 60 * 1000 };

    dispatch(changeSettings('timeControl', newTimeControl));

    this.setState({
      timeControl: newTimeControl
    });
  };

  onTimeControlBaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const {
      dispatch
    } = this.props;
    const newBase = +e.target.value;

    this.setState(({ timeControl }) => {
      const newTimeControl = {
        ...timeControl as CorrespondenceTimeControl | TimerTimeControl,
        base: newBase
      };

      dispatch(changeSettings('timeControl', newTimeControl));

      return {
        timeControl: newTimeControl
      };
    });
  };

  onTimeControlIncrementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const {
      dispatch
    } = this.props;
    const newIncrement = +e.target.value;

    this.setState(({ timeControl }) => {
      const newTimeControl = {
        ...timeControl as TimerTimeControl,
        increment: newIncrement
      };

      dispatch(changeSettings('timeControl', newTimeControl));

      return {
        timeControl: {
          ...timeControl as TimerTimeControl,
          increment: newIncrement
        }
      };
    });
  };

  onVariationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const changedVariant = e.target.name as GameVariantEnum;
    const enabled = e.target.checked;

    this.setState(({ variants }) => {
      let newVariants = variants.map((variant) => ({
        ...variant,
        enabled: variant.variant === changedVariant
          ? enabled
          : variant.enabled
      }));
      const selectedVariations = this.getSelectedVariants(newVariants);

      newVariants = newVariants.map((variant) => ({
        ...variant,
        allowed: variant.enabled || GameHelper.validateVariants([...selectedVariations, variant.variant])
      }));

      return {
        variants: newVariants
      };
    });
  };

  enterGame(id: string) {
    const {
      history
    } = this.props;

    history.push(`/games/${id}`);
  }

  render() {
    const {
      createGameModalVisible,
      games,
      timeControl,
      variants
    } = this.state;

    return (
      <div className="route games-route">

        <DocumentTitle value="AllChess - Games" />

        <input
          type="submit"
          value="Create game"
          onClick={this.openModal}
          style={{ margin: 10 }}
          disabled={!this.props.loggedIn}
        />

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
                <td className="time-control">{
                  timeControl
                    ? timeControl.type === TimeControlEnum.CORRESPONDENCE
                      ? `${Math.round(timeControl.base / ONE_DAY)} ${timeControl.base === ONE_DAY ? 'day' : 'days'}`
                      : `${Math.round(timeControl.base / ONE_MINUTE)} + ${Math.round(timeControl.increment / ONE_SECOND)}`
                    : '∞'
                }</td>
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
                <select
                  value={timeControl ? timeControl.type : TimeControlEnum.NONE}
                  onChange={this.onTimeControlChange}
                >
                  <option value={TimeControlEnum.NONE}>
                    None
                  </option>
                  <option value={TimeControlEnum.TIMER}>
                    Real time
                  </option>
                  <option value={TimeControlEnum.CORRESPONDENCE}>
                    Correspondence
                  </option>
                </select>
              </div>

              {timeControl && (
                <div style={{ marginTop: 20 }}>
                  {timeControl.type === TimeControlEnum.TIMER ? 'Minutes per player: ' : 'Days per turn: '}
                  <select
                    value={timeControl.base}
                    onChange={this.onTimeControlBaseChange}
                  >
                    {(
                      timeControl.type === TimeControlEnum.TIMER
                        ? POSSIBLE_TIMER_BASES_IN_MILLISECONDS
                        : POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS
                    ).map((base, ix) => (
                      <option key={ix} value={base}>
                        {(
                          timeControl.type === TimeControlEnum.TIMER
                            ? POSSIBLE_TIMER_BASES_IN_MINUTES
                            : POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS
                        )[ix]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {timeControl && timeControl.type === TimeControlEnum.TIMER && (
                <div style={{ marginTop: 8 }}>
                  Increment in seconds per turn:{' '}
                  <select
                    value={timeControl.increment}
                    onChange={this.onTimeControlIncrementChange}
                  >
                    {POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS.map((increment, ix) => (
                      <option key={ix} value={increment}>
                        {POSSIBLE_TIMER_INCREMENTS_IN_SECONDS[ix]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="variants" style={{ marginTop: 20 }}>
              <h5 style={{ alignSelf: 'center' }}>
                Variants
              </h5>

              {variants.map(({ variant, enabled, allowed }) => (
                <div key={variant} className="variant">
                  <input
                    type="checkbox"
                    name={variant}
                    checked={enabled}
                    disabled={!allowed}
                    onChange={this.onVariationChange}
                  />
                  {' '}
                  <GameVariantLink variant={variant} />
                </div>
              ))}
            </div>

            <input
              type="submit"
              value="Create game"
              onClick={this.createGame}
              style={{ marginTop: 30 }}
            />
          </div>
        </Modal>

      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    loggedIn: !!state.user,
    timeControl: state.gameSettings.timeControl
  };
}

export default connect(mapStateToProps)(Games);
