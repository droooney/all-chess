import React from 'react';

interface OwnProps {
  id: string;
}

type Props = OwnProps;

class RulesExampleLink extends React.PureComponent<Props> {
  render() {
    const {
      id,
    } = this.props;

    return (
      <a href={`#game-${id}`}>
        example {id}
      </a>
    );
  }
}

export default RulesExampleLink;
