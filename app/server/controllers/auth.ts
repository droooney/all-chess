import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as pug from 'pug';
import uuid from 'uuid/v1';

import { CustomContext } from 'server/types';

import { buildURL, sendEmail } from 'server/helpers';

import { User } from 'server/db/models';

const registerHTML = pug.compile(fs.readFileSync(
  path.resolve('./app/server/emails/register.pug'),
  'utf8',
));

export async function confirmRegister(ctx: CustomContext) {
  const {
    query: {
      email,
      token,
    },
  } = ctx;
  const user = await User.findOne({
    where: {
      email,
      confirmToken: token,
    },
  });

  if (!user) {
    ctx.throw(400, 'Wrong email or token');
  }

  await user.update({
    confirmed: true,
    confirmToken: null,
  });

  ctx.redirect('/');
}

export async function login(ctx: CustomContext) {
  const {
    request: {
      body,
    },
  } = ctx;

  if (!body) {
    ctx.throw(400);
  }

  const {
    login,
    password,
  } = body;

  if (typeof login !== 'string' || typeof password !== 'string') {
    ctx.throw(400);
  }

  const session = ctx.state.session!;
  const user = await User.findOne({
    where: {
      login,
    },
  });

  if (!user) {
    return ctx.state.success(false);
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return ctx.state.success(false);
  }

  session.user = user;

  await session.asyncSave();

  ctx.body = {
    success: true,
    user,
  };
}

export async function logout(ctx: CustomContext) {
  delete ctx.state.session?.user;

  await ctx.state.session?.asyncSave();

  ctx.state.success();
}

export async function refreshUser(ctx: CustomContext, next: (err?: any) => Promise<any>) {
  if (!ctx.state.session) {
    ctx.throw(500, 'No session found');
  }

  if (ctx.state.session?.user) {
    ctx.state.session.user = await User.findByPk(ctx.state.session.user.id);
  }

  await next();
}

export async function register(ctx: CustomContext) {
  const {
    request: {
      body,
    },
  } = ctx;

  if (!body) {
    ctx.throw(400);
  }

  const {
    email,
    login,
    password,
  } = body;

  if (typeof email !== 'string' || typeof login !== 'string' || typeof password !== 'string') {
    ctx.throw(400);
  }

  let user: User;

  try {
    user = await User.create({
      email,
      login,
      password,
      confirmToken: uuid(),
    });
  } catch (err) {
    ctx.body = {
      success: false,
      errors: {
        login: !!err.fields && 'login' in err.fields,
        email: !!err.fields && 'email' in err.fields,
      },
    };

    return;
  }

  sendConfirmationEmail(ctx, user);

  ctx.body = {
    success: true,
    user,
  };
}

async function sendConfirmationEmail(ctx: CustomContext, user: User) {
  try {
    await sendEmail({
      to: user.email,
      subject: 'Confirm registration',
      html: registerHTML({
        login: user.login,
        confirmLink: buildURL({
          protocol: ctx.protocol,
          host: ctx.get('host'),
          path: '/api/auth/confirm_register',
          query: {
            email: user.email,
            token: user.confirmToken!,
          },
        }),
      }),
    });
  } catch {}
}
