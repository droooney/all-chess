import * as path from 'path';
import mount from 'koa-mount';
import serve from 'koa-static';
import compose from 'koa-compose';

import { get } from 'server/helpers';

import { session, sessionRequired } from 'server/controllers/session';
import { render } from 'server/controllers/render';
import { refreshUser } from 'server/controllers/auth';

import app from 'server/app';

app.use(mount('/static', serve(path.resolve('./static'))));
app.use(mount('/public', serve(path.resolve('./public'))));

app.use(get(/^\/.*$/s, compose([session, sessionRequired, refreshUser, render])));
