import { Middleware, ParameterizedContext } from 'koa';

import { User } from '../db/models';

export interface CustomState {
  urlIndexGroups: string[];
  urlKeyGroups?: Record<string, string>;
  session?: Express.Session;
  user?: User;
  success(value?: any): void;
}

export type CustomContext = ParameterizedContext<CustomState, {}>;

export type CustomMiddleware = Middleware<CustomState, CustomContext>;
