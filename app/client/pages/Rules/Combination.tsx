import React from 'react';

import { GAME_VARIANT_LINKS } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import GameVariantLink from 'client/components/GameVariantLink';

interface OwnProps {
  variant: GameVariantEnum;
  children: React.ReactNode;
}

type Props = OwnProps;

class Combination extends React.PureComponent<Props> {
  render() {
    const {
      variant,
      children,
    } = this.props;

    return (
      <section>
        <h3 id={`combination-${GAME_VARIANT_LINKS[variant]}`}>
          <GameVariantLink variant={variant} />
        </h3>

        {children}
      </section>
    );
  }
}

export default Combination;
