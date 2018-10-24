import * as React from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';

interface OwnProps extends LinkProps {
  to: string;
}

type Props = OwnProps;

export default class Link extends React.Component<Props> {
  render() {
    const {
      to,
      ...props
    } = this.props;

    return (
      <RouterLink
        {...props}
        to={{
          pathname: to,
          state: { resetScroll: true }
        }}
      />
    );
  }
}
