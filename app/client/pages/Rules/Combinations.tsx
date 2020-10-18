import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class Combinations extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="combinations">
          Combinations
        </h2>

        {children}
      </section>
    );
  }
}

export default Combinations;
