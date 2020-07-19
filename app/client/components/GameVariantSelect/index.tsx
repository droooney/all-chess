import * as _ from 'lodash';
import * as React from 'react';
import { MenuItem } from '@material-ui/core';

import { GAME_VARIANT_NAMES, GAME_VARIANT_SHORT_NAMES } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import Checkbox from '../Checkbox';
import Select from '../Select';

interface OwnProps {
  variants: GameVariantEnum[];
  disabledVariants: GameVariantEnum[];
  onVariantsChange(variants: GameVariantEnum[]): void;
}

type Props = OwnProps;

class GameVariantSelect extends React.Component<Props> {
  static defaultProps = {
    disabledVariants: [],
  };

  onVariantChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const {
      onVariantsChange,
    } = this.props;

    onVariantsChange(
      _.filter(GameVariantEnum, (variant) => (e.target.value as GameVariantEnum[]).includes(variant)),
    );
  };

  render() {
    const {
      variants: selectedVariants,
      disabledVariants,
    } = this.props;
    const variants = _.map(GameVariantEnum, (variant) => {
      const enabled = selectedVariants.includes(variant);

      return {
        variant,
        enabled,
        allowed: (
          !disabledVariants.includes(variant)
          && (enabled || Game.validateVariants([...selectedVariants, variant]))
        ),
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
          getContentAnchorEl: null,
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

export default GameVariantSelect;
