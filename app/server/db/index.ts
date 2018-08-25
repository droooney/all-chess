import Sequelize = require('sequelize');

import config = require('./config');

export default new Sequelize(config.development);
