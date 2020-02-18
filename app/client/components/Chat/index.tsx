import * as _ from 'lodash';
import * as React from 'react';
import classNames from 'classnames';

import { ChatMessage } from '../../../types';

import Input from '../Input';

interface OwnProps {
  chat: ChatMessage[];
  sendMessage(message: string): void;
}

type Props = OwnProps;

interface State {
  message: string;
}

export default class Chat extends React.PureComponent<Props, State> {
  chatRef = React.createRef<HTMLDivElement>();
  messageRef = React.createRef<HTMLInputElement>();
  messagesRef = React.createRef<HTMLDivElement>();
  state: State = {
    message: ''
  };

  componentDidMount() {
    const messages = this.messagesRef.current!;
    const boards = document.querySelector('.board');

    messages.scrollTop = messages.scrollHeight - messages.clientHeight;

    if (boards) {
      this.chatRef.current!.style.maxHeight = `${boards.clientHeight - 180}px`;
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.chat.length > prevProps.chat.length) {
      const messages = this.messagesRef.current!;
      const lastMessage = _.last(messages.children)!;
      const maxScroll = messages.scrollHeight - messages.clientHeight;

      if (maxScroll - messages.scrollTop - 10 <= lastMessage.clientHeight) {
        messages.scrollTop = maxScroll;
      }
    }
  }

  onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const message = this.state.message.trim();

      if (message) {
        this.props.sendMessage(message);

        this.setState({
          message: ''
        });
      }
    }
  };

  onMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      message: e.target.value
    });
  };

  render() {
    const {
      chat
    } = this.props;

    return (
      <div ref={this.chatRef} className="chat">
        <div className="header">
          Chat
        </div>
        <div className="messages" ref={this.messagesRef}>
          {chat.map(({ login, message }, index) => {
            const isSystem = login === null;

            return (
              <div key={index} className={classNames('message', { system: isSystem })}>
                <span className="login">
                  {isSystem ? 'System' : login}
                </span>
                <span className="content">
                  {message}
                </span>
              </div>
            );
          })}
        </div>
        <Input
          className="new-message-input"
          placeholder="Type a message"
          disableUnderline
          value={this.state.message}
          onChange={this.onMessageChange}
          onKeyDown={this.onKeyDown}
        />
      </div>
    );
  }
}
