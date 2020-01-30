import * as React from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classNames';

import './index.less';

export interface OwnProps {
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

    this.modal.addEventListener('click', (e) => {
      if (e.target && (e.target as HTMLElement).classList.contains('modal')) {
        props.onOverlayClick();
      }
    }, false);
    this.setClassName();
  }

  componentDidMount() {
    modalRoot.appendChild(this.modal);
  }

  componentWillUnmount() {
    modalRoot.removeChild(this.modal);
  }

  componentDidUpdate() {
    this.setClassName();
  }

  setClassName() {
    this.modal.className = classNames('modal', this.props.className, { hidden: !this.props.visible });
  }

  render() {
    return createPortal(
      this.props.children,
      this.modal,
    );
  }
}
