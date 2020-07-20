import sio from 'socket.io';

import server from './server';

const io = sio(server);

export const games = io.of('/games');

export default io;
