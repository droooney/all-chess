import * as path from 'path';
import mount = require('koa-mount');
import serve = require('koa-static');
import compose = require('koa-compose');

import app from 'server/app';
import { get } from 'server/helpers';
import { session, sessionRequired } from 'server/controllers/session';
import { render } from 'server/controllers/render';

app.use(mount('/static', serve(path.resolve('./static'))));
app.use(mount('/public', serve(path.resolve('./public'))));

app.use(get(/^\/.*$/s, compose([session, sessionRequired, render])));
