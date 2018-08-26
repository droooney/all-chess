import { Context } from 'koa';

export async function helpers(ctx: Context, next: (err?: any) => Promise<void>) {
  ctx.success = (...args) => {
    ctx.body = {
      success: args.length
        ? !!args[0]
        : true
    };
  };

  await next();
}
