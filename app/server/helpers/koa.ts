import { Middleware } from 'koa';

type Method = 'get' | 'post' | 'put' | 'delete';
type Url = string | RegExp;

export function url(
  url: Url,
  middleware: Middleware,
  exact = true
): Middleware {
  return async (ctx, next) => {
    if (typeof url === 'string') {
      if (ctx.path.indexOf(url) !== 0) {
        return next();
      }

      if (exact && ctx.path.length !== url.length) {
        return next();
      }

      const newPath = ctx.path.slice(url.length) || '/';

      if (newPath[0] !== '/') {
        return next();
      }
    } else {
      const match = ctx.path.match(url);

      if (!match) {
        return next();
      }

      if (exact && ctx.path.length !== match[0].length) {
        return next();
      }

      ctx.urlIndexGroups = match.slice(1);
      ctx.urlKeyGroups = match.groups;
    }

    await middleware(ctx, next);
  };
}

export function method(
  method: Method,
  middleware: Middleware
): Middleware {
  const upperCaseMethod = method.toUpperCase();

  return async (ctx, next) => {
    if (ctx.method === upperCaseMethod) {
      return middleware(ctx, next);
    }

    await next();
  };
}

interface RouteOptions {
  url: Url;
  method: Method;
}

export function route(
  middleware: Middleware,
  options: RouteOptions
): Middleware {
  return url(options.url, method(options.method, middleware));
}

export function get(url: Url, middleware: Middleware): Middleware {
  return route(middleware, { url, method: 'get' });
}

export function post(url: Url, middleware: Middleware): Middleware {
  return route(middleware, { url, method: 'post' });
}

export function put(url: Url, middleware: Middleware): Middleware {
  return route(middleware, { url, method: 'put' });
}

export function Delete(url: Url, middleware: Middleware): Middleware {
  return route(middleware, { url, method: 'delete' });
}
