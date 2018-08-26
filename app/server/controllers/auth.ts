import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { Context } from 'koa';
import * as pug from 'pug';
import uuid = require('uuid/v1');

import { User, UserModel } from '../db';
import { buildURL, sendEmail } from '../helpers';

const registerHTML = pug.compile(fs.readFileSync(path.resolve('./app/server/emails/register.pug'), 'utf8'));

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

  const match = bcrypt.compare(password, user.password);

  if (!match) {
    return ctx.body = {
      success: false
    };
  }

  session.user = user;

  await session.asyncSave();

  ctx.body = {
    success: true
  };
}

export async function logout(ctx: Context) {
  await ctx.session!.asyncDestroy();
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
  const user = await User.create({
    email,
    login,
    password,
    confirmToken: uuid()
  });

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
      login,
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
