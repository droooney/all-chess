import * as React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import findKey from 'lodash/findKey';

import {
  GAME_VARIANT_NAMES,
  GAME_VARIANT_LINKS,
} from 'shared/constants';

import {
  GameVariantEnum,
} from 'shared/types';

import DocumentTitle from '../../components/DocumentTitle';

import Chess960Rules from './Chess960';
import AtomicRules from './Atomic';

type Props = RouteComponentProps<{ gameLink: string; }>;

export default class VariantRules extends React.Component<Props> {
  render() {
    const {
      match: {
        params: {
          gameLink,
        },
      },
    } = this.props;
    const gameType = findKey(GAME_VARIANT_LINKS, (link) => link === gameLink) as GameVariantEnum | undefined;

    if (!gameType) {
      return (
        <Redirect to="/rules" />
      );
    }

    const gameName = GAME_VARIANT_NAMES[gameType];
    let Component: React.ComponentType;

    switch (gameType) {
      case GameVariantEnum.CHESS_960: {
        Component = Chess960Rules;

        break;
      }

      case GameVariantEnum.ATOMIC: {
        Component = AtomicRules;

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
