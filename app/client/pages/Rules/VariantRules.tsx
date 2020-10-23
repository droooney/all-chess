import * as React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import findKey from 'lodash/findKey';

import {
  GAME_VARIANT_NAMES,
  GAME_VARIANT_LINKS,
} from 'shared/constants';

import { EachVariant, GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import DocumentTitle from '../../components/DocumentTitle';

import Chess960Rules from './VariantRules/Chess960Rules';
import AtomicRules from './VariantRules/AtomicRules';
import KOTHRules from './VariantRules/KOTHRules';
import BenedictRules from './VariantRules/BenedictRules';
import ThreeCheckRules from './VariantRules/ThreeCheckRules';
import RetreatRules from './VariantRules/RetreatRules';
import CirceRules from './VariantRules/CirceRules';
import CapablancaRules from './VariantRules/CapablancaRules';
import AntichessRules from './VariantRules/AntichessRules';
import CylinderRules from './VariantRules/CylinderRules';
import CircularRules from './VariantRules/CircularRules';
import TwoFamiliesRules from './VariantRules/TwoFamiliesRules';
import HexagonalRules from './VariantRules/HexagonalRules';
import CrazyhouseRules from './VariantRules/CrazyhouseRules';
import MadrasiRules from './VariantRules/MadrasiRules';

type Props = RouteComponentProps<{ gameLink: string; }>;

const EXAMPLE_BOARDS_ON_SCREEN_THRESHOLD = 0.9;

// TODO: medium: patrol
// TODO: hard: alice, dark, absorb, frankfurt, comp

const VARIANT_RULES: Partial<EachVariant<React.ComponentType<{ gameRef(game: Game): void; }>>> = {
  [GameVariantEnum.CHESS_960]: Chess960Rules,
  [GameVariantEnum.ATOMIC]: AtomicRules,
  [GameVariantEnum.KING_OF_THE_HILL]: KOTHRules,
  [GameVariantEnum.BENEDICT_CHESS]: BenedictRules,
  [GameVariantEnum.THREE_CHECK]: ThreeCheckRules,
  [GameVariantEnum.RETREAT_CHESS]: RetreatRules,
  [GameVariantEnum.CIRCE]: CirceRules,
  [GameVariantEnum.CAPABLANCA]: CapablancaRules,
  [GameVariantEnum.ANTICHESS]: AntichessRules,
  [GameVariantEnum.CYLINDER_CHESS]: CylinderRules,
  [GameVariantEnum.CIRCULAR_CHESS]: CircularRules,
  [GameVariantEnum.TWO_FAMILIES]: TwoFamiliesRules,
  [GameVariantEnum.HEXAGONAL_CHESS]: HexagonalRules,
  [GameVariantEnum.CRAZYHOUSE]: CrazyhouseRules,
  [GameVariantEnum.MADRASI]: MadrasiRules,
};

export default class VariantRules extends React.Component<Props> {
  examples: Map<GameVariantEnum, Map<string, Game>> = new Map();

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  getChosenVariant(): GameVariantEnum | undefined {
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
    const chosenVariant = this.getChosenVariant();

    if (chosenVariant) {
      const variantExamples = this.examples.get(chosenVariant) || new Map<string, Game>();

      variantExamples.set(game.id, game);

      this.examples.set(chosenVariant, variantExamples);
    }
  };

  onKeyDown = (e: KeyboardEvent) => {
    const chosenVariant = this.getChosenVariant();

    if (!chosenVariant) {
      return;
    }

    const variantExamples = this.examples.get(chosenVariant);

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
    const chosenVariant = this.getChosenVariant();

    if (!chosenVariant) {
      return (
        <Redirect to="/rules" />
      );
    }

    const gameName = GAME_VARIANT_NAMES[chosenVariant];
    const Component = VARIANT_RULES[chosenVariant] || (
      () => (
        <div>
          The rules section for this variant is not ready yet.
        </div>
      )
    );

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
