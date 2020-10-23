import classNames from 'classnames';
import * as React from 'react';
import { createPortal } from 'react-dom';

import './index.less';

export interface OwnProps {
  className?: string;
  style?: React.CSSProperties;
}

type Props = OwnProps;

const fixedElementsRoot = document.getElementById('fixed-elements-root')!;

export default class FixedElement extends React.Component<Props> {
  element = document.createElement('div');

  componentDidMount() {
    fixedElementsRoot.appendChild(this.element);
  }

  componentWillUnmount() {
    fixedElementsRoot.removeChild(this.element);
  }

  render() {
    const {
      className,
      style,
      children,
    } = this.props;

    return createPortal(
      <div
        className={classNames('fixed-element', className)}
        style={style}
      >
        {children}
      </div>,
      this.element,
    );
  }
}
