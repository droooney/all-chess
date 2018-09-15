import * as _ from 'lodash';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');

import { Game as GameHelper } from '../../helpers';
import {
  CorrespondenceTimeControl,
  Game,
  GameVariantEnum,
  TimeControl,
  TimeControlEnum,
  TimerTimeControl
} from '../../../types';
import {
  GAME_VARIANT_NAMES,
  POSSIBLE_TIMER_BASES_IN_MINUTES,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_SECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS
} from '../../../shared/constants';

import Modal from '../Modal';

import './index.less';

interface GameVariant {
  variant: GameVariantEnum;
  enabled: boolean;
  allowed: boolean;
}

type Props = RouteComponentProps<any>;

interface State {
  createGameModalVisible: boolean;
  games: Game[];
  timeControl: TimeControl;
  variants: GameVariant[];
}

export default class Games extends React.Component<Props, State> {
  socket?: io.Socket;
  state: State = {
    createGameModalVisible: false,
    timeControl: null,
    variants: _.map(GameVariantEnum, (variant) => ({
      variant,
      allowed: true,
      enabled: false
    })),
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
      createGameModalVisible: false
    });
  };

  createGame = () => {
    this.closeModal();

    this.socket!.emit('createGame', {
      timeControl: this.state.timeControl,
      variants: this.getSelectedVariants(this.state.variants)
    });
  };

  onTimeControlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timeControl = e.target.value as TimeControlEnum;

    if (timeControl === TimeControlEnum.NONE) {
      this.setState({
        timeControl: null
      });
    } else {
      this.setState({
        timeControl: timeControl === TimeControlEnum.TIMER
          ? { type: TimeControlEnum.TIMER, base: 10 * 60 * 1000, increment: 5 * 1000 }
          : { type: TimeControlEnum.CORRESPONDENCE, base: 2 * 24 * 60 * 60 * 1000 }
      });
    }
  };

  onTimeControlBaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBase = +e.target.value;

    this.setState(({ timeControl }) => ({
      timeControl: {
        ...timeControl as CorrespondenceTimeControl | TimerTimeControl,
        base: newBase
      }
    }));
  };

  onTimeControlIncrementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIncrement = +e.target.value;

    this.setState(({ timeControl }) => ({
      timeControl: {
        ...timeControl as TimerTimeControl,
        increment: newIncrement
      }
    }));
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

        <input
          type="submit"
          value="Create game"
          onClick={this.openModal}
          style={{ margin: 10 }}
        />

        <table className="games">
          <tbody>
            {games.map(({ id }) => (
              <tr
                key={id}
                className="game"
                onClick={() => this.enterGame(id)}
              >
                <td>{id}</td>
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
                  {` ${GAME_VARIANT_NAMES[variant]}`}
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
