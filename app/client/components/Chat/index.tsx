import * as _ from 'lodash';
import * as React from 'react';

import { ChatMessage } from '../../../types';

interface OwnProps {
  chat: ChatMessage[];
  sendMessage(message: string): void;
}

type Props = OwnProps;

export default class Chat extends React.Component<Props> {
  messageRef = React.createRef<HTMLInputElement>();
  messagesRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    const messages = this.messagesRef.current!;

    messages.scrollTop = messages.scrollHeight - messages.clientHeight;
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
      this.props.sendMessage(this.messageRef.current!.value);

      this.messageRef.current!.value = '';
    }
  };

  render() {
    const {
      chat
    } = this.props;

    return (
      <div className="chat">
        <div className="header">
          Chat
        </div>
        <div className="messages" ref={this.messagesRef}>
          {chat.map(({ login, message }, index) => (
            <div key={index} className="message">
              <span className="login">
                {login}
              </span>
              <span className="content">
                {message}
              </span>
            </div>
          ))}
        </div>
        <input
          ref={this.messageRef}
          placeholder="Send message"
          onKeyDown={this.onKeyDown}
          className="new-message-input"
        />
      </div>
    );
  }
}
