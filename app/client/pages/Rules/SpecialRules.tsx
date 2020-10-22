import React from 'react';

interface OwnProps {
  children: React.ReactNode;
}

type Props = OwnProps;

class SpecialRules extends React.PureComponent<Props> {
  render() {
    const {
      children,
    } = this.props;

    return (
      <section>
        <h2 id="special-rules">
          Special rules
        </h2>

        {children}
      </section>
    );
  }
}

export default SpecialRules;
