import * as path from 'path';
import mount = require('koa-mount');
import serve = require('koa-static');
import compose = require('koa-compose');

import app from '../app';
import { get } from '../helpers';
import { session, sessionRequired } from '../controllers/session';
import { render } from '../controllers/render';

app.use(mount('/static', serve(path.resolve('./static'))));
app.use(mount('/public', serve(path.resolve('./public'))));

app.use(get(/^\/.*$/s, compose([session, sessionRequired, render])));
