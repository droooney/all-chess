import Application from 'koa';
import mount from 'koa-mount';
import BodyParser from 'koa-bodyparser';
import compose from 'koa-compose';

import { CustomState, CustomContext } from 'server/types';

import { get, post } from 'server/helpers';

import {
  confirmRegister,
  login,
  logout,
  register,
} from 'server/controllers/auth';
import { state } from 'server/controllers/state';
import {
  session,
  sessionRequired,
} from 'server/controllers/session';

import app from '../app';

const bodyParser = BodyParser();

const apiApp = new Application<CustomState, CustomContext>();
const authApp = new Application<CustomState, CustomContext>();

authApp.use(get('/confirm_register', confirmRegister));
authApp.use(post('/login', compose([bodyParser, login])));
authApp.use(get('/logout', logout));
authApp.use(post('/register', compose([bodyParser, register])));

apiApp.use(session);
apiApp.use(sessionRequired);
apiApp.use(state);
apiApp.use(mount('/auth', authApp));

app.use(mount('/api', apiApp));
