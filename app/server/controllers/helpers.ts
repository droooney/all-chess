/// <reference path="../../typings/koa.d.ts" />

import { CustomContext } from '../types';

export async function helpers(ctx: CustomContext, next: (err?: any) => Promise<void>) {
  ctx.state.success = (...args: any[]) => {
    ctx.body = {
      success: args.length
        ? !!args[0]
        : true
    };
  };

  await next();
}
