/// <reference path="../../typings/koa.d.ts" />

import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { Context } from 'koa';
import * as pug from 'pug';
import uuid = require('uuid/v1');

import { User, UserModel } from '../db';
import { buildURL, sendEmail } from '../helpers';

const registerHTML = pug.compile(fs.readFileSync(path.resolve('./app/server/emails/register.pug'), 'utf8'));

export async function confirmRegister(ctx: Context) {
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

export async function login(ctx: Context) {
  const {
    request: {
      body: {
        login = '',
        password = ''
      }
    }
  } = ctx;
  const session = ctx.session!;
  const user = await User.findOne({
    where: {
      login
    }
  });

  if (!user) {
    return ctx.body = {
      success: false
    };
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return ctx.body = {
      success: false
    };
  }

  session.user = user;

  await session.asyncSave();

  ctx.body = {
    success: true,
    user
  };
}

export async function logout(ctx: Context) {
  await ctx.session!.asyncDestroy();

  ctx.success();
}

export async function register(ctx: Context) {
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
    ctx.success(false);

    return;
  }

  await sendConfirmationEmail(ctx, user);

  ctx.body = {
    success: true,
    user
  };
}

async function sendConfirmationEmail(ctx: Context, user: UserModel) {
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
}
