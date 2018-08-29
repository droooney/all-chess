/// <reference path="../../typings/koa.d.ts" />

import { Context } from 'koa';

export async function helpers(ctx: Context, next: (err?: any) => Promise<void>) {
  ctx.success = (...args: any[]) => {
    ctx.body = {
      success: args.length
        ? !!args[0]
        : true
    };
  };

  await next();
}
