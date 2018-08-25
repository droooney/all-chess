import * as http from 'http';

import app from './app';

import './routes';

export default http.createServer(app.callback());
