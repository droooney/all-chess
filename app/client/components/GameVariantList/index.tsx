import * as _ from 'lodash';
import * as React from 'react';

import { Game } from '../../helpers';
import {
  GameVariantEnum
} from '../../../types';

import GameVariantLink from '../GameVariantLink';

interface OwnProps {
  variants: GameVariantEnum[];
  onVariantsChange(variants: GameVariantEnum[]): void;
}

type Props = OwnProps;

class GameVariantList extends React.Component<Props> {
  onVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      variants,
      onVariantsChange
    } = this.props;
    const changedVariant = e.target.name as GameVariantEnum;
    const enabled = e.target.checked;

    if (enabled) {
      onVariantsChange([
        ...variants,
        changedVariant
      ]);
    } else {
      const existingVariantIndex = variants.indexOf(changedVariant);

      if (existingVariantIndex !== -1) {
        onVariantsChange([
          ...variants.slice(0, existingVariantIndex),
          ...variants.slice(existingVariantIndex + 1)
        ]);
      }
    }
  };

  render(): React.ReactNode {
    const variants = _.map(GameVariantEnum, (variant) => {
      const enabled = _.includes(this.props.variants, variant);

      return {
        variant,
        enabled,
        allowed: enabled || Game.validateVariants([...this.props.variants, variant])
      };
    });

    return variants.map(({ variant, enabled, allowed }) => (
      <div key={variant} className="variant">
        <input
          type="checkbox"
          name={variant}
          checked={enabled}
          disabled={!allowed}
          onChange={this.onVariantChange}
        />
        {' '}
        <GameVariantLink variant={variant} />
      </div>
    ));
  }
}

export default GameVariantList;
