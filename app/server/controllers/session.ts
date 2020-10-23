import redis from 'connect-redis';
import { Request, Response } from 'express';
import expressSession from 'express-session';
import * as util from 'util';

import { CustomContext } from 'server/types';

import { createClient } from 'server/helpers';

import config from 'server/config';

const Store = redis(expressSession);

export const sessionMiddleware = util.promisify(expressSession({
  name: config.cookieName,
  store: new Store({
    client: createClient(),
    host: config.redis.host,
    port: config.redis.port,
  }),
  secret: config.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: new Date(Date.UTC(2038, 0)),
  },
}));

declare global {
  namespace Express {
    interface Session {
      asyncSave(): Promise<void>;
      asyncDestroy(): Promise<void>;
    }
  }
}

const sessionPrototype: Express.Session = (expressSession as any).Session.prototype;

sessionPrototype.asyncSave = util.promisify(sessionPrototype.save);
sessionPrototype.asyncDestroy = util.promisify(sessionPrototype.destroy);

export async function session(ctx: CustomContext, next: (err?: any) => Promise<any>) {
  await sessionMiddleware(ctx.req as Request, ctx.res as Response);

  ctx.state.session = (ctx.req as any).session;

  await next();
}

export async function sessionRequired(ctx: CustomContext, next: (err?: any) => Promise<any>) {
  if (!ctx.state.session) {
    ctx.throw(500, 'No session found');
  }

  await next();
}
