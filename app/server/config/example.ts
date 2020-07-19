import { Config } from '../../shared/types';

const config: Config = {
  cookieName: 'cookie_name',
  email: {
    auth: {
      user: 'username',
      pass: 'password'
    },
    from: {
      name: 'AllChess',
      email: 'all-chess.org'
    }
  },
  port: process.env.PORT
    ? +process.env.PORT
    : 3000,
  redis: {
    host: 'localhost',
    port: 6379
  },
  secret: process.env.SECRET || 'secret string',
  sessionExpires: 14 * 24 * 60 * 60 * 1000
};

export default config;
