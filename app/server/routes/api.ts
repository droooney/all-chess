import Application = require('koa');
import mount = require('koa-mount');
import BodyParser = require('koa-bodyparser');
import compose = require('koa-compose');

import app from '../app';
import { helpers } from '../controllers/helpers';
import { login, logout, register } from '../controllers/auth';
import { get, post } from '../helpers';

const bodyParser = BodyParser();

const apiApp = new Application();
const authApp = new Application();

authApp.use(post('/login', compose([bodyParser, login])));
authApp.use(get('/logout', logout));
authApp.use(post('/register', compose([bodyParser, register])));

apiApp.use(helpers);
apiApp.use(mount('/auth', authApp));

app.use(mount('/api', apiApp));
