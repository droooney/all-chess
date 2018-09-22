import * as React from 'react';
import classNames = require('classnames');

import Modal, { OwnProps as ModalProps } from '../Modal';

import './index.less';

interface Choice {
  key: string;
  text: React.ReactNode;
  className?: string;
}

interface OwnProps extends ModalProps {
  question: React.ReactNode;
  choices: Choice[];
  onChoose(key: string): void;
}

type Props = OwnProps;

export default class Dialog extends React.Component<Props> {
  render() {
    const {
      visible,
      question,
      choices,
      onChoose,
      onOverlayClick
    } = this.props;

    return (
      <Modal
        visible={visible}
        onOverlayClick={onOverlayClick}
        className="dialog-modal"
      >
        <div className="modal-content">
          <h4 className="dialog-question">
            {question}
          </h4>
          <div className="dialog-choices">
            {choices.map(({ key, text, className }) => (
              <div
                key={key}
                className={classNames('dialog-choice', className)}
                onClick={() => {
                  onOverlayClick();
                  onChoose(key);
                }}
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  }
}
