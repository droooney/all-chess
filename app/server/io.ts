import sio = require('socket.io');

import server from './server';

export default sio(server);
