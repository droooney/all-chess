import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class GameEnd extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="game-end">
          Game end
        </h2>

        {children}
      </section>
    );
  }
}

export default GameEnd;
