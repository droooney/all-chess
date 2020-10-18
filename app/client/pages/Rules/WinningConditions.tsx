import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class WinningConditions extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="winning-conditions">
          Winning conditions
        </h2>

        {children}
      </section>
    );
  }
}

export default WinningConditions;
