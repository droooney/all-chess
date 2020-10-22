import React from 'react';

interface OwnProps {
  elements: React.ReactNode[];
}

type Props = OwnProps;

class List extends React.PureComponent<Props> {
  render() {
    const {
      elements,
    } = this.props;

    return (
      <ul style={{ paddingLeft: 24 }}>
        {elements.map((child, index) => {
          return (
            <li key={index}>
              {child}
            </li>
          );
        })}
      </ul>
    );
  }
}

export default List;
