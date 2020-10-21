import sio from 'socket.io';

import server from './server';

const io = sio(server, { cookie: false });

export const games = io.of('/game');

export default io;
