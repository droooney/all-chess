import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class Moves extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="moves">
          Moves
        </h2>

        {children}
      </section>
    );
  }
}

export default Moves;
