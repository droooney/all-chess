import React from 'react';

import { GameVariantEnum } from 'shared/types';

import GameVariantLink from 'client/components/GameVariantLink';

interface OwnProps {
  variants: GameVariantEnum[];
}

type Props = OwnProps;

class GameVariantLinks extends React.PureComponent<Props> {
  render() {
    const {
      variants,
    } = this.props;

    return variants.map((variant, index) => (
      <React.Fragment key={variant}>
        {index !== 0 && ', '}

        <GameVariantLink variant={variant} />
      </React.Fragment>
    ));
  }
}

export default GameVariantLinks;
