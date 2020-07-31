import { Middleware, ParameterizedContext } from 'koa';

import { Dictionary } from 'shared/types';

import { User } from '../db/models';

export interface CustomState {
  urlIndexGroups: string[];
  urlKeyGroups?: Dictionary<string>;
  session?: Express.Session;
  user?: User;
  success(): void;
  success(success: boolean): void;
}

export type CustomContext = ParameterizedContext<CustomState, {}>;

export type CustomMiddleware = Middleware<CustomState, CustomContext>;
