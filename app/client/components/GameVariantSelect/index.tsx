import * as _ from 'lodash';
import * as React from 'react';
import { MenuItem } from '@material-ui/core';

import { Game } from '../../helpers';
import { GameVariantEnum } from '../../../types';
import { GAME_VARIANT_NAMES, GAME_VARIANT_SHORT_NAMES } from '../../../shared/constants';

import Checkbox from '../Checkbox';
import Select from '../Select';

interface OwnProps {
  variants: GameVariantEnum[];
  onVariantsChange(variants: GameVariantEnum[]): void;
}

type Props = OwnProps;

class GameVariantList extends React.Component<Props> {
  onVariantChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const {
      onVariantsChange
    } = this.props;

    onVariantsChange(
      _.filter(GameVariantEnum, (variant) => (e.target.value as GameVariantEnum[]).includes(variant))
    );
  };

  render(): React.ReactNode {
    const {
      variants: selectedVariants
    } = this.props;
    const variants = _.map(GameVariantEnum, (variant) => {
      const enabled = selectedVariants.includes(variant);

      return {
        variant,
        enabled,
        allowed: enabled || Game.validateVariants([...selectedVariants, variant])
      };
    });

    return (
      <Select
        displayEmpty
        multiple
        value={selectedVariants}
        onChange={this.onVariantChange}
        renderValue={() => (
          selectedVariants.length === 0
            ? 'Standard'
            : `${
              selectedVariants.length > 1 ? `(${selectedVariants.length}) ` : ''
            }${
              selectedVariants.map((variant) => GAME_VARIANT_SHORT_NAMES[variant]).join(', ')
            }`
        )}
        MenuProps={{
          disableAutoFocusItem: true,
          getContentAnchorEl: null
        }}
      >
        {variants.map(({ variant, enabled, allowed }) => (
          <MenuItem key={variant} value={variant} disabled={!allowed} tabIndex={-1}>
            <Checkbox checked={enabled} />
            {' '}
            {GAME_VARIANT_NAMES[variant]}
          </MenuItem>
        ))}
      </Select>
    );
  }
}

export default GameVariantList;