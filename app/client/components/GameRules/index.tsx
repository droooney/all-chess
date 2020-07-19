import * as _ from 'lodash';
import * as React from 'react';
import {
  RouteComponentProps
} from 'react-router-dom';

import {
  GAME_VARIANT_NAMES,
  GAME_VARIANT_LINKS
} from '../../../shared/constants';
import {
  GameVariantEnum
} from 'shared/types';

import DocumentTitle from '../DocumentTitle';

import Chess960GameRules from './Chess960';
import AtomicGameRules from './Atomic';

type Props = RouteComponentProps<{ gameLink: string; }>;

export default class GameRules extends React.Component<Props> {
  render() {
    const {
      match: {
        params: {
          gameLink
        }
      }
    } = this.props;
    const gameType = _.findKey(GAME_VARIANT_LINKS, (link) => link === gameLink) as GameVariantEnum;
    const gameName = GAME_VARIANT_NAMES[gameType];
    let Component: React.ComponentType;

    switch (gameType) {
      case GameVariantEnum.CHESS_960: {
        Component = Chess960GameRules;

        break;
      }

      case GameVariantEnum.ATOMIC: {
        Component = AtomicGameRules;

        break;
      }

      default: {
        Component = () => (
          <div>
            The rules section for this variant is not ready yet.
          </div>
        );
      }
    }

    return (
      <React.Fragment>
        <DocumentTitle value={`AllChess - ${gameName} Rules`} />
        <h1 className="game-name-header">
          {gameName}
        </h1>

        <Component />
      </React.Fragment>
    );
  }
}
