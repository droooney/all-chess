import { Namespace } from 'socket.io';

import io from 'server/io';

export function deleteNamespace(namespace: Namespace) {
  for (const socketId in namespace.sockets) {
    if ({}.hasOwnProperty.call(namespace.sockets, socketId)) {
      namespace.sockets[socketId].disconnect();
    }
  }

  namespace.removeAllListeners();

  delete io.nsps[namespace.name];
}
