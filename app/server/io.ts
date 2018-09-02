import sio = require('socket.io');

import server from './server';

const io = sio(server);

export const rooms = io.of('/rooms');

export default io;
