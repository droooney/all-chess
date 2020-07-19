import { Sequelize } from 'sequelize';

import config = require('server/db/config');

export default new Sequelize(config.development);

export * from './models';
