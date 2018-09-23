import * as React from 'react';
import classNames = require('classnames');

import InfoActionsChatPanel, { OwnProps as InfoActionsChatPanelProps } from '../InfoActionsChatPanel';
import Boards, { OwnProps as BoardsProps } from '../Boards';

type Props = InfoActionsChatPanelProps & BoardsProps;

export default class LeftPanel extends React.Component<Props> {
  render() {
    return (
      <div className={classNames('left-panel', { 'is-board-at-top': this.props.isAliceChess })}>
        <InfoActionsChatPanel {...this.props} />
        <Boards {...this.props} />
      </div>
    );
  }
}
