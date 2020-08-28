import { DataTypes, Model } from 'sequelize';
import { hash } from 'bcryptjs';
import pick from 'lodash/pick';

import { PublicUser, User as UserAttributes } from 'shared/types';

import sequelize from 'server/db';

export type UserAddAttributes = Partial<UserAttributes> & Pick<UserAttributes, 'email' | 'password' | 'login'>;

export interface User extends UserAttributes {}

export class User extends Model<UserAttributes, UserAddAttributes> {
  toJSON(): PublicUser {
    const user = super.toJSON() as UserAttributes;

    return pick(user, ['id', 'login', 'ratings', 'createdAt']);
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  login: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^[a-z0-9-_]+$/i,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  confirmToken: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  ratings: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: () => ({}),
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'users',
  hooks: {
    async beforeCreate(user) {
      user.password = await hash(user.password, 5);
    },
    async beforeBulkCreate(users) {
      await Promise.all(
        users.map(async (user) => {
          user.password = await hash(user.password, 5);
        }),
      );
    },
  },
});
