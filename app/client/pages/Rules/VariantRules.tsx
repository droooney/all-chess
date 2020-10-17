import * as React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import findKey from 'lodash/findKey';

import {
  GAME_VARIANT_NAMES,
  GAME_VARIANT_LINKS,
} from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import DocumentTitle from '../../components/DocumentTitle';

import Chess960Rules from './Chess960';
import AtomicRules from './Atomic';

type Props = RouteComponentProps<{ gameLink: string; }>;

const EXAMPLE_BOARDS_ON_SCREEN_THRESHOLD = 0.9;

export default class VariantRules extends React.Component<Props> {
  examples: Map<GameVariantEnum, Map<string, Game>> = new Map();

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  getVariant(): GameVariantEnum | undefined {
    const {
      match: {
        params: {
          gameLink,
        },
      },
    } = this.props;

    return findKey(GAME_VARIANT_LINKS, (link) => link === gameLink) as GameVariantEnum | undefined;
  }

  gameRef = (game: Game) => {
    const gameType = this.getVariant();

    if (gameType) {
      const variantExamples = this.examples.get(gameType) || new Map<string, Game>();

      variantExamples.set(game.id, game);

      this.examples.set(gameType, variantExamples);
    }
  };

  onKeyDown = (e: KeyboardEvent) => {
    const variant = this.getVariant();

    if (!variant) {
      return;
    }

    const variantExamples = this.examples.get(variant);

    if (!variantExamples) {
      return;
    }

    let gameToApplyKeyPress: Game | null = null;
    let minDistanceToScreenCenter = Infinity;

    for (const example of variantExamples.values()) {
      const element = document.getElementById(`boards-${example.id}`);

      if (!element) {
        continue;
      }

      const box = element.getBoundingClientRect();
      const gameCenter = box.top + box.height / 2;
      const distanceToScreenCenter = Math.abs(window.innerHeight / 2 - gameCenter);
      const gameOnScreenHeight = (
        Math.min(window.innerHeight, box.top + box.height)
        - Math.max(0, box.top)
      ) / box.height;

      if (
        distanceToScreenCenter < minDistanceToScreenCenter
        && gameOnScreenHeight >= EXAMPLE_BOARDS_ON_SCREEN_THRESHOLD
      ) {
        minDistanceToScreenCenter = distanceToScreenCenter;
        gameToApplyKeyPress = example;
      }
    }

    gameToApplyKeyPress?.handleKeyPress(e);
  };

  render() {
    const variant = this.getVariant();

    if (!variant) {
      return (
        <Redirect to="/rules" />
      );
    }

    const gameName = GAME_VARIANT_NAMES[variant];
    let Component: React.ComponentType<{ gameRef(game: Game): void; }>;

    switch (variant) {
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

        <Component gameRef={this.gameRef} />
      </React.Fragment>
    );
  }
}
