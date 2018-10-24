import * as React from 'react';

interface OwnProps {
  value: string | null | false;
}

type Props = OwnProps;

export default class DocumentTitle extends React.Component<Props> {
  render() {
    const {
      value
    } = this.props;

    document.title = typeof value === 'string' ? value : 'Loading...';

    return null;
  }
}
