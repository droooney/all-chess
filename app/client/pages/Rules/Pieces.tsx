import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class Pieces extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="pieces">
          Pieces
        </h2>

        {children}
      </section>
    );
  }
}

export default Pieces;
