import MuiDivider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import styled from '@material-ui/core/styles/styled';
import * as React from 'react';
import { connect } from 'react-redux';

import { ALL_VARIANTS } from 'client/constants';
import { GAME_VARIANT_NAMES, GAME_VARIANT_SHORT_NAMES } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import { ReduxState } from 'client/store';

import Checkbox from '../Checkbox';
import GameVariantStar from '../GameVariantStar';
import Select from '../Select';

import './index.less';

interface OwnProps {
  selectedVariants: GameVariantEnum[];
  disabledVariants: GameVariantEnum[];
  onVariantsChange(variants: GameVariantEnum[]): void;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps>;

interface State {
  favouriteCombinations: GameVariantEnum[][];
  favouriteVariants: GameVariantEnum[];
}

interface VariantInfo {
  variant: GameVariantEnum;
  enabled: boolean;
  allowed: boolean;
}

const Divider = styled(MuiDivider)({
  height: 3,
  backgroundColor: 'rgba(0,0,0,0.3)',
});

class GameVariantSelect extends React.Component<Props, State> {
  static defaultProps = {
    disabledVariants: [],
  };

  state: State = {
    favouriteCombinations: this.getFavouriteCombinations(),
    favouriteVariants: this.getFavouriteVariants(),
  };

  componentDidMount() {
    this.saveFavouriteVariants();
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      !Game.areSameVariants(this.props.selectedVariants, nextProps.selectedVariants)
      || !Game.areSameVariants(this.props.disabledVariants, nextProps.disabledVariants)
      || !Game.areSameVariants(this.state.favouriteVariants, nextState.favouriteVariants)
      || this.state.favouriteCombinations.length !== nextState.favouriteCombinations.length
    );
  }

  getFavouriteCombinations(): GameVariantEnum[][] {
    const {
      favouriteVariants,
    } = this.props;

    return favouriteVariants.filter((variants) => variants.length !== 1);
  }

  getFavouriteVariants(): GameVariantEnum[] {
    const {
      favouriteVariants,
    } = this.props;

    return favouriteVariants
      .filter((variants) => variants.length === 1)
      .map((variants) => variants[0]);
  }

  isVariantsCombination(variants: GameVariantEnum[]): boolean {
    const {
      selectedVariants,
    } = this.props;

    return Game.areSameVariants(selectedVariants, variants);
  }

  onVariantChange = (e: React.ChangeEvent<{ value: unknown; }>) => {
    const {
      onVariantsChange,
    } = this.props;
    const variantsCombination = (e.target.value as (GameVariantEnum | GameVariantEnum[])[]).find(Array.isArray);
    let newVariants: GameVariantEnum[];

    if (variantsCombination) {
      if (this.isVariantsCombination(variantsCombination)) {
        newVariants = [];
      } else {
        newVariants = variantsCombination;
      }
    } else {
      newVariants = ALL_VARIANTS.filter((variant) => (e.target.value as GameVariantEnum[]).includes(variant));
    }

    onVariantsChange(newVariants);
  };

  saveFavouriteVariants = () => {
    this.setState({
      favouriteCombinations: this.getFavouriteCombinations(),
      favouriteVariants: this.getFavouriteVariants(),
    });
  };

  render() {
    const {
      selectedVariants,
      disabledVariants,
    } = this.props;
    const {
      favouriteCombinations,
      favouriteVariants,
    } = this.state;
    const favouriteCombinationsGroup = favouriteCombinations.map((variants) => {
      const enabled = this.isVariantsCombination(variants);

      return {
        variants,
        enabled,
        allowed: (
          enabled
          || disabledVariants.every((variant) => !variants.includes(variant))
        ),
      };
    });

    const getVariantInfo = (variant: GameVariantEnum): VariantInfo => {
      const enabled = selectedVariants.includes(variant);

      return {
        variant,
        enabled,
        allowed: enabled || (
          !disabledVariants.includes(variant)
          && Game.validateVariants([...selectedVariants, variant])
        ),
      };
    };

    const favouriteVariantsGroup = ALL_VARIANTS
      .filter((variant) => favouriteVariants.includes(variant))
      .map(getVariantInfo);
    const restVariantsGroup = ALL_VARIANTS
      .filter((variant) => !favouriteVariants.includes(variant))
      .map(getVariantInfo);

    const renderVariant = ({ variant, enabled, allowed }: VariantInfo) => (
      <MenuItem key={variant} value={variant} disabled={!allowed} tabIndex={-1}>
        <Checkbox checked={enabled} />

        <Tooltip title={GAME_VARIANT_NAMES[variant]}>
          <ListItemText>
            {GAME_VARIANT_NAMES[variant]}
          </ListItemText>
        </Tooltip>

        <GameVariantStar variants={variant} />
      </MenuItem>
    );

    const selectedVariantsString = selectedVariants.length === 0
      ? 'Standard'
      : `${
        selectedVariants.length > 1 ? `(${selectedVariants.length}) ` : ''
      }${
        selectedVariants.map((variant) => GAME_VARIANT_SHORT_NAMES[variant]).join(' + ')
      }`;

    return (
      <Select
        displayEmpty
        multiple
        value={selectedVariants}
        onChange={this.onVariantChange}
        renderValue={() => (
          <Tooltip title={selectedVariantsString}>
            <span>{selectedVariantsString}</span>
          </Tooltip>
        )}
        MenuProps={{
          MenuListProps: {
            classes: {
              root: 'game-variant-select',
            },
          },
          disableAutoFocusItem: true,
          getContentAnchorEl: null,
        }}
        onOpen={this.saveFavouriteVariants}
      >
        {favouriteCombinationsGroup.map(({ variants, enabled, allowed }) => {
          const variantsString = variants
            .map((variant) => GAME_VARIANT_SHORT_NAMES[variant])
            .join(' + ') || 'Standard';

          return (
            <MenuItem key={variants.join(',')} value={variants} tabIndex={-1} disabled={!allowed}>
              <Checkbox checked={enabled} />

              <Tooltip title={variantsString}>
                <ListItemText>
                  {variantsString}
                </ListItemText>
              </Tooltip>

              <GameVariantStar variants={variants} />
            </MenuItem>
          );
        })}

        {favouriteCombinationsGroup.length !== 0 && <Divider />}

        {favouriteVariantsGroup.map(renderVariant)}

        {
          favouriteVariantsGroup.length !== 0
          && restVariantsGroup.length !== 0
          && <Divider />
        }

        {restVariantsGroup.map(renderVariant)}
      </Select>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    favouriteVariants: state.gameSettings.favouriteVariants,
  };
}

export default connect(mapStateToProps)(GameVariantSelect);
