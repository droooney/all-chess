import { Sequelize } from 'sequelize';

import config = require('./config');

export default new Sequelize(config.development);

export * from './models';
