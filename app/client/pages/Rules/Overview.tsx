import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class Overview extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="overview">
          Overview
        </h2>

        {children}
      </section>
    );
  }
}

export default Overview;
