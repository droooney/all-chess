import 'koa';

import { UserModel } from '../server/db';

declare module 'koa' {
  interface Context {
    urlIndexGroups: string[];
    urlKeyGroups?: {
      [key: string]: string;
    };
    session?: Express.Session;
    user?: UserModel;
    success(value?: any): void;
  }

  interface Request {
    body: any;
  }
}
