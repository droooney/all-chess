import * as React from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';
import { LocationDescriptorObject } from 'history';

interface OwnProps extends LinkProps {
  to: string | LocationDescriptorObject<any>;
}

type Props = OwnProps;

export default class Link extends React.Component<Props> {
  onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const {
      onClick,
    } = this.props;

    e.stopPropagation();

    if (onClick) {
      onClick(e);
    }
  };

  render() {
    const {
      to,
      ...props
    } = this.props;

    return (
      <RouterLink
        {...props}
        to={{
          ...(
            typeof to === 'string'
              ? { pathname: to }
              : to
          ),
          state: {
            resetScroll: true,
            ...(typeof to === 'object' && to.state ? to.state : {}),
          },
        }}
        onClick={this.onClick}
      />
    );
  }
}
