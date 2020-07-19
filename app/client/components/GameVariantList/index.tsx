import * as _ from 'lodash';
import * as React from 'react';

import { Game } from 'client/helpers';
import {
  GameVariantEnum
} from '../../../shared/types';

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

    onVariantsChange(
      _.filter(GameVariantEnum, (variant) => (
        variant === changedVariant
          ? enabled
          : variants.includes(variant)
      ))
    );
  };

  render() {
    const variants = _.map(GameVariantEnum, (variant) => {
      const enabled = this.props.variants.includes(variant);

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
