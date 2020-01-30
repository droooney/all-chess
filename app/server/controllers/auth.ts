/// <reference path="../../typings/koa.d.ts" />

import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';
import * as pug from 'pug';
import uuid = require('uuid/v1');

import { User, UserModel } from '../db';
import { buildURL, sendEmail } from '../helpers';
import { CustomContext } from '../types';

const registerHTML = pug.compile(fs.readFileSync(path.resolve('./app/server/emails/register.pug'), 'utf8'));

export async function confirmRegister(ctx: CustomContext) {
  const {
    query: {
      email,
      token
    }
  } = ctx;
  const user = await User.findOne({
    where: {
      email,
      confirmToken: token
    }
  });

  if (!user) {
    ctx.status = 400;
    ctx.body = 'Wrong email or token';

    return;
  }

  await user.update({
    confirmed: true,
    confirmToken: null
  });

  ctx.redirect('/');
}

export async function login(ctx: CustomContext) {
  const {
    request: {
      body: {
        login = '',
        password = ''
      }
    }
  } = ctx;
  const session = ctx.state.session!;
  const user = await User.findOne({
    where: {
      login
    }
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
    user
  };
}

export async function logout(ctx: CustomContext) {
  await ctx.state.session!.asyncDestroy();

  ctx.state.success();
}

export async function register(ctx: CustomContext) {
  const {
    request: {
      body: {
        email = '',
        login = '',
        password = ''
      }
    }
  } = ctx;
  let user: UserModel;

  try {
    user = await User.create({
      email,
      login,
      password,
      confirmToken: uuid()
    });
  } catch (err) {
    ctx.body = {
      success: false,
      errors: {
        login: !!err.fields && 'login' in err.fields,
        email: !!err.fields && 'email' in err.fields
      }
    };

    return;
  }

  sendConfirmationEmail(ctx, user);

  ctx.body = {
    success: true,
    user
  };
}

async function sendConfirmationEmail(ctx: CustomContext, user: UserModel) {
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
            token: user.confirmToken!
          }
        })
      })
    });
  } catch (err) {
    /* empty */
  }
}
