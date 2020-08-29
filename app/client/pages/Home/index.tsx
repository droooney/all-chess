import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import io from 'socket.io-client';
import MenuItem from '@material-ui/core/MenuItem';
import map from 'lodash/map';
import omit from 'lodash/omit';

import {
  COLOR_NAMES,
  SPEED_TYPE_NAMES,
  TIME_CONTROL_NAMES,
  POSSIBLE_TIMER_BASES_IN_MINUTES,
  POSSIBLE_TIMER_BASES_IN_MILLISECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_SECONDS,
  POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_DAYS,
  POSSIBLE_CORRESPONDENCE_BASES_IN_MILLISECONDS,
} from 'shared/constants';

import {
  Challenge,
  ColorEnum,
  CorrespondenceTimeControl,
  Dictionary,
  GameVariantEnum,
  TimeControl,
  TimeControlEnum,
  TimerTimeControl,
} from 'shared/types';

import { Game } from 'client/helpers';

import { DispatchProps, ReduxState } from 'client/store';
import { changeSettings } from 'client/actions';

import Button from '../../components/Button';
import Checkbox from '../../components/Checkbox';
import DocumentTitle from '../../components/DocumentTitle';
import GameVariantLink from '../../components/GameVariantLink';
import GameVariantSelect from '../../components/GameVariantSelect';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import GameVariantStar from 'client/components/GameVariantStar';

import './index.less';

type Props = RouteComponentProps<any> & ReturnType<typeof mapStateToProps> & DispatchProps;

interface CreateChallengeValues {
  rated: boolean;
  playForColor: ColorEnum | null;
  timeControl: TimeControl;
  variants: GameVariantEnum[];
}

interface State extends CreateChallengeValues {
  createChallengeModalVisible: boolean;
  challenges: Dictionary<Challenge>;
}

class Games extends React.Component<Props, State> {
  socket?: io.Socket;
  state: State = {
    ...this.getDefaultValues(),
    createChallengeModalVisible: false,
    challenges: {},
  };

  componentDidMount() {
    const {
      history,
      user,
    } = this.props;
    const socket = this.socket = io.connect('/game');

    socket.on('challengeList', (challenges) => {
      this.setState({
        challenges,
      });
    });

    socket.on('newChallenge', (challenge) => {
      this.setState(({ challenges }) => ({
        challenges: {
          ...challenges,
          [challenge.id]: challenge,
        },
      }));
    });

    socket.on('challengeAccepted', ({ challengeId, gameId, acceptingUserId }) => {
      this.setState(({ challenges }) => {
        const challenge = challenges[challengeId];

        if (!challenge) {
          return null;
        }

        if (challenge.challenger.id === user?.id || acceptingUserId === user?.id) {
          history.push(`/game/${gameId}`);

          return null;
        }

        return {
          challenges: omit(challenges, challengeId),
        };
      });
    });

    socket.on('challengesCanceled', (challengeIds) => {
      this.setState(({ challenges }) => ({
        challenges: omit(challenges, challengeIds),
      }));
    });
  }

  componentWillUnmount() {
    this.socket?.disconnect();
  }

  getDefaultValues(): CreateChallengeValues {
    const {
      lastPlayedRated,
      lastPlayedTimeControl,
      lastPlayedVariants,
    } = this.props;

    return {
      rated: lastPlayedRated,
      playForColor: null,
      timeControl: lastPlayedTimeControl,
      variants: lastPlayedVariants,
    };
  }

  openModal = () => {
    this.setState({
      ...this.getDefaultValues(),
      createChallengeModalVisible: true,
    });
  };

  closeModal = () => {
    this.setState({
      createChallengeModalVisible: false,
    });
  };

  createChallenge = () => {
    const {
      dispatch,
      user,
    } = this.props;
    const {
      rated,
      playForColor,
      variants,
      timeControl,
    } = this.state;

    this.closeModal();

    dispatch(changeSettings('lastPlayedVariants', variants));
    dispatch(changeSettings('lastPlayedTimeControl', timeControl));
    dispatch(changeSettings('lastPlayedRated', rated));

    if (user) {
      this.socket?.emit('createChallenge', {
        rated,
        timeControl,
        variants,
        startingFen: null,
        color: playForColor,
      });
    }
  };

  onTimeControlChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const timeControl = e.target.value as TimeControlEnum;
    const newTimeControl: TimeControl = timeControl === TimeControlEnum.NONE
      ? null
      : timeControl === TimeControlEnum.TIMER
        ? { type: TimeControlEnum.TIMER, base: 10 * 60 * 1000, increment: 5 * 1000 }
        : { type: TimeControlEnum.CORRESPONDENCE, base: 2 * 24 * 60 * 60 * 1000 };

    this.setState(({ timeControl, rated }) => {
      if (timeControl?.type === newTimeControl?.type) {
        return null;
      }

      return {
        timeControl: newTimeControl,
        rated: newTimeControl !== null && rated,
      };
    });
  };

  onTimeControlBaseChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const newBase = +(e.target.value as string);

    this.setState(({ timeControl }) => ({
      timeControl: {
        ...timeControl as CorrespondenceTimeControl | TimerTimeControl,
        base: newBase,
      },
    }));
  };

  onTimeControlIncrementChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const newIncrement = +(e.target.value as string);

    this.setState(({ timeControl }) => ({
      timeControl: {
        ...timeControl as TimerTimeControl,
        increment: newIncrement,
      },
    }));
  };

  onVariantsChange = (variants: GameVariantEnum[]) => {
    this.setState({
      variants,
    });
  };

  onRatedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ rated: e.target.checked });
  };

  onColorChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    this.setState({
      playForColor: e.target.value === ColorEnum.WHITE
        ? ColorEnum.WHITE
        : e.target.value === ColorEnum.BLACK
          ? ColorEnum.BLACK
          : null,
    });
  };

  onChallengeClick(challengeId: string) {
    const {
      user,
    } = this.props;
    const challenge = this.state.challenges[challengeId];

    if (!challenge || !user || !this.socket) {
      // TODO: if no user, show modal to log in/register

      return;
    }

    if (challenge.challenger.id === user.id) {
      this.socket.emit('cancelChallenge', challengeId);
    } else {
      this.socket.emit('acceptChallenge', challengeId);
    }
  }

  render() {
    const {
      createChallengeModalVisible,
      challenges,
      rated,
      playForColor,
      timeControl,
      variants,
    } = this.state;
    const disabledVariants = timeControl?.type === TimeControlEnum.TIMER
      ? []
      : [GameVariantEnum.COMPENSATION_CHESS];
    const ratedAllowed = timeControl !== null;
    const canCreateGame = (
      Game.validateVariants(variants)
      && (ratedAllowed || !rated)
      && !disabledVariants.some((variant) => variants.includes(variant))
    );

    return (
      <div className="route home-route">

        <DocumentTitle value="AllChess - Home" />

        <Button
          onClick={this.openModal}
          style={{ margin: 10 }}
          disabled={!this.props.user}
        >
          Create challenge
        </Button>

        <table className="games">
          <thead>
            <tr>
              <th className="player">Player</th>
              <th className="type">Type</th>
              <th className="variants">Variants</th>
            </tr>
          </thead>
          <tbody>
            {map(challenges, (challenge) => {
              if (!challenge) {
                return;
              }

              const {
                id,
                challenger: {
                  login,
                  rating,
                  color,
                },
                rated,
                timeControl,
                variants,
              } = challenge;

              return (
                <tr
                  key={id}
                  className="game"
                  onClick={() => this.onChallengeClick(id)}
                >
                  <td className="player">
                    {login}, {Math.floor(rating)} ({color === null ? 'Random' : COLOR_NAMES[color]})
                  </td>
                  <td className="type">
                    {rated ? 'Rated' : 'Unrated'} {SPEED_TYPE_NAMES[Game.getSpeedType(timeControl)]}
                    {' - '}{Game.getTimeControlString(timeControl)}
                  </td>
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
              );
            })}
          </tbody>
        </table>

        <Modal
          visible={createChallengeModalVisible}
          onOverlayClick={this.closeModal}
          className="game-create-settings-modal"
        >
          <div className="modal-content">
            <h4>
              Game settings
            </h4>

            <table>
              <tbody>
                <tr>
                  <td>Rated</td>
                  <td>
                    <Checkbox checked={rated} disabled={!ratedAllowed} onChange={this.onRatedChange} />
                  </td>
                </tr>

                <tr>
                  <td>Color</td>
                  <td>
                    <Select
                      value={playForColor || 'random'}
                      onChange={this.onColorChange}
                      renderValue={() => playForColor ? COLOR_NAMES[playForColor] : 'Random'}
                    >
                      <MenuItem value="random">
                        Random
                      </MenuItem>
                      <MenuItem value={ColorEnum.WHITE}>
                        {COLOR_NAMES[ColorEnum.WHITE]}
                      </MenuItem>
                      <MenuItem value={ColorEnum.BLACK}>
                        {COLOR_NAMES[ColorEnum.BLACK]}
                      </MenuItem>
                    </Select>
                  </td>
                </tr>

                <tr>
                  <td>Time control</td>
                  <td>
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
                  </td>
                </tr>

                {timeControl && (
                  <tr style={{ marginTop: 15 }}>
                    <td />
                    <td>
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

                      {' '}{timeControl.type === TimeControlEnum.TIMER ? 'min' : 'days'}

                      {timeControl?.type === TimeControlEnum.TIMER && (
                        <React.Fragment>
                          <span style={{ margin: '0 12px' }}>+</span>

                          <Select
                            value={timeControl.increment}
                            onChange={this.onTimeControlIncrementChange}
                            style={{ marginLeft: 0 }}
                          >
                            {POSSIBLE_TIMER_INCREMENTS_IN_MILLISECONDS.map((increment, ix) => (
                              <MenuItem key={ix} value={increment}>
                                {POSSIBLE_TIMER_INCREMENTS_IN_SECONDS[ix]}
                              </MenuItem>
                            ))}
                          </Select>

                          {' sec'}
                        </React.Fragment>
                      )}
                    </td>
                  </tr>
                )}

                <tr className="variants">
                  <td>Variants</td>
                  <td>
                    <GameVariantSelect
                      selectedVariants={variants}
                      disabledVariants={disabledVariants}
                      onVariantsChange={this.onVariantsChange}
                    />

                    <GameVariantStar variants={variants} />
                  </td>
                </tr>
              </tbody>
            </table>

            <Button
              onClick={this.createChallenge}
              style={{ marginTop: 30 }}
              disabled={!canCreateGame}
            >
              Create challenge
            </Button>
          </div>
        </Modal>

      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    user: state.user,
    lastPlayedTimeControl: state.gameSettings.lastPlayedTimeControl,
    lastPlayedVariants: state.gameSettings.lastPlayedVariants,
    lastPlayedRated: state.gameSettings.lastPlayedRated,
  };
}

export default connect(mapStateToProps)(Games);
