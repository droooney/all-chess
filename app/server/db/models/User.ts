import * as Sequelize from 'sequelize';
import * as bcrypt from 'bcrypt';

import sequelize from '../';
import { User as UserAttributes } from '../../../types';

export interface UserModel extends Sequelize.Instance<UserModel>, UserAttributes {}

export type UserAddAttributes = Partial<UserAttributes> & Pick<UserAttributes, 'email' | 'password' | 'login'>;

export const User = sequelize.define<UserModel, UserAddAttributes>('users', {
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

const toJSON = ((User as any).prototype as UserModel).toJSON;

((User as any).prototype as UserModel).toJSON = function (...args: any[]) {
  const json: UserModel = toJSON.apply(this, args);

  delete json.password;
  delete json.confirmToken;

  return json;
};
