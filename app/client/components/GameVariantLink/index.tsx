import * as React from 'react';

import { GameVariantEnum } from 'shared/types';
import {
  GAME_VARIANT_NAMES,
  GAME_VARIANT_LINKS
} from '../../../shared/constants';

import Link from '../Link';

interface OwnProps {
  variant: GameVariantEnum;

  className?: string;
}

type Props = OwnProps;

export default class GameVariantLink extends React.Component<Props> {
  render() {
    const {
      variant,
      className
    } = this.props;

    return (
      <Link className={className} to={`/rules/${GAME_VARIANT_LINKS[variant]}`}>
        {GAME_VARIANT_NAMES[variant]}
      </Link>
    );
  }
}
