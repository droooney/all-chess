import IconButton from '@material-ui/core/IconButton';
import StarIcon from '@material-ui/icons/Star';
import StarBorderIcon from '@material-ui/icons/StarBorder';
import * as React from 'react';
import { connect } from 'react-redux';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import { changeSettings } from 'client/actions';
import { DispatchProps, ReduxState } from 'client/store';

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

  stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  render() {
    return (
      <IconButton
        style={{ padding: 6 }}
        onClick={this.onClick}
        onMouseDown={this.stopPropagation}
        onTouchStart={this.stopPropagation}
      >
        {
          this.isFavourite()
            ? <StarIcon color="secondary" />
            : <StarBorderIcon color="secondary" className="star-outlined" />
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
