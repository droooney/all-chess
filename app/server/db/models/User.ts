import * as _ from 'lodash';
import * as Sequelize from 'sequelize';
import * as bcrypt from 'bcryptjs';

import sequelize from '../';
import { PublicUser, User as UserAttributes } from '../../../shared/types';

export type UserAddAttributes = Partial<UserAttributes> & Pick<UserAttributes, 'email' | 'password' | 'login'>;

export interface User extends UserAttributes {}

export class User extends Sequelize.Model<UserAttributes, UserAddAttributes> {
  toJSON(): PublicUser {
    const user = super.toJSON() as UserAttributes;

    return _.pick(user, ['id', 'login', 'createdAt']);
  }
}

User.init({
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  login: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: Sequelize.STRING
  },
  confirmToken: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: ''
  },
  confirmed: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  createdAt: {
    type: Sequelize.DATE,
    field: 'created_at',
    allowNull: false
  },
  updatedAt: {
    type: Sequelize.DATE,
    field: 'updated_at',
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'users',
  hooks: {
    async beforeCreate(user) {
      user.password = await bcrypt.hash(user.password, 5);
    },
    async beforeBulkCreate(users) {
      await Promise.all(
        users.map(async (user) => {
          user.password = await bcrypt.hash(user.password, 5);
        })
      );
    }
  }
});
