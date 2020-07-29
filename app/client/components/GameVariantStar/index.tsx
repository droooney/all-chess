import * as React from 'react';
import { connect } from 'react-redux';
import IconButton from '@material-ui/core/IconButton';
import Star from '@material-ui/icons/Star';
import StarBorder from '@material-ui/icons/StarBorder';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import { DispatchProps, ReduxState } from 'client/store';
import { changeSettings } from 'client/actions';

interface OwnProps {
  variants: GameVariantEnum | GameVariantEnum[];
}

type Props = OwnProps & DispatchProps & ReturnType<typeof mapStateToProps>;

class GameVariantStar extends React.PureComponent<Props> {
  getVariants(): GameVariantEnum[] {
    const {
      variants,
    } = this.props;

    return Array.isArray(variants)
      ? variants
      : [variants];
  }

  isFavourite(): boolean {
    const {
      favouriteVariants,
    } = this.props;
    const variants = this.getVariants();

    return favouriteVariants.some((favouriteVariants) => (
      Game.areSameVariants(favouriteVariants, variants)
    ));
  }

  onClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    const {
      dispatch,
      favouriteVariants,
    } = this.props;
    const variants = this.getVariants();

    dispatch(changeSettings(
      'favouriteVariants',
      this.isFavourite()
        ? favouriteVariants.filter((favouriteVariants) => (
          !Game.areSameVariants(favouriteVariants, variants)
        ))
        : [...favouriteVariants, variants],
    ));
  };

  onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  render() {
    return (
      <IconButton
        style={{ padding: 6 }}
        onClick={this.onClick}
        onMouseDown={this.onMouseDown}
      >
        {
          this.isFavourite()
            ? <Star color="secondary" />
            : <StarBorder color="secondary" className="star-outlined" />
        }
      </IconButton>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    favouriteVariants: state.gameSettings.favouriteVariants,
  };
}

export default connect(mapStateToProps)(GameVariantStar);
