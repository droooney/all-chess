import * as util from 'util';
import { IncomingMessage, ServerResponse } from 'http';
import expressSession = require('express-session');
import redis = require('connect-redis');
import { Context } from 'koa';

import { createClient } from '../helpers';
import config from '../config';

const Store = redis(expressSession);
const sessionMiddleware = util.promisify(expressSession({
  name: config.cookieName,
  store: new Store({
    client: createClient(),
    host: config.redis.host,
    port: config.redis.port
  }),
  secret: config.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: config.sessionExpires
  }
})) as (req: IncomingMessage, res: ServerResponse) => any;

declare global {
  namespace Express {
    interface Session {
      asyncSave(): Promise<void>;
      asyncDestroy(): Promise<void>;
    }
  }
}

const sessionPrototype: Express.Session = (expressSession as any).Session.prototype;

sessionPrototype.asyncSave = util.promisify(sessionPrototype.save) as () => Promise<void>;
sessionPrototype.asyncDestroy = util.promisify(sessionPrototype.destroy) as () => Promise<void>;

export async function session(ctx: Context, next: (err?: any) => Promise<any>) {
  await sessionMiddleware(ctx.req, ctx.res);

  ctx.session = (ctx.req as any).session;

  await next();
}

export async function sessionRequired(ctx: Context, next: (err?: any) => Promise<any>) {
  if (!ctx.session) {
    ctx.throw(500, 'No session found');
  }

  await next();
}
