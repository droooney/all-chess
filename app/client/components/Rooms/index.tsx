import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');

import { Room } from '../../../types';

import './index.less';

type Props = RouteComponentProps<any>;

interface State {
  rooms: Room[];
}

export default class Rooms extends React.Component<Props, State> {
  socket?: io.Socket;
  state = {
    rooms: [] as Room[]
  };

  componentDidMount() {
    const socket = this.socket = io.connect('/rooms');

    socket.on('roomList', (rooms) => {
      this.setState({
        rooms
      });
    });

    socket.on('roomCreated', (room) => {
      this.setState(({ rooms }) => ({
        rooms: [
          ...rooms,
          room
        ]
      }));
    });
  }

  componentWillUnmount() {
    this.socket!.disconnect();
  }

  createRoom = () => {
    this.socket!.emit('createRoom');
  };

  enterRoom(id: string) {
    const {
      history
    } = this.props;

    history.push(`/rooms/${id}`);
  }

  render() {
    return (
      <div className="route rooms-route">

        <input
          type="submit"
          value="Create room"
          onClick={this.createRoom}
          style={{ margin: 10 }}
        />

        <table className="rooms">

          <thead>
            <tr>
              <th>Room ID</th>
            </tr>
          </thead>

          <tbody>
            {this.state.rooms.map(({ id }) => (
              <tr
                key={id}
                className="room"
                onClick={() => this.enterRoom(id)}
              >
                <td>{id}</td>
              </tr>
            ))}
          </tbody>

        </table>

      </div>
    );
  }
}
