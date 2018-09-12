import * as React from 'react';
import { createPortal } from 'react-dom';
import classNames = require('classnames');

import './index.less';

interface OwnProps {
  visible: boolean;
  className?: string;
  onOverlayClick(): void;
}

type Props = OwnProps;

const modalRoot = document.getElementById('modal-root')!;

export default class Modal extends React.Component<Props> {
  modal = document.createElement('div');

  constructor(props: Props) {
    super(props);

    this.modal.className = classNames('modal', props.className);
    this.modal.addEventListener('click', (e) => {
      if (e.target && (e.target as HTMLElement).classList.contains('modal')) {
        props.onOverlayClick();
      }
    }, false);
    this.toggleVisibility();
  }

  componentDidMount() {
    modalRoot.appendChild(this.modal);
  }

  componentWillUnmount() {
    modalRoot.removeChild(this.modal);
  }

  componentDidUpdate() {
    this.toggleVisibility();
  }

  toggleVisibility() {
    this.modal.classList.toggle('hidden', !this.props.visible);
  }

  render() {
    return createPortal(
      this.props.children,
      this.modal,
    );
  }
}
