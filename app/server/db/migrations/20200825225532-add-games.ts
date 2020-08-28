import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'games';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable(TABLE_NAME, {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    whitePlayer: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    blackPlayer: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    timeControl: {
      type: DataTypes.JSONB,
      field: 'time_control',
      allowNull: true,
    },
    variants: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    rated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    fen: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    chat: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    takebackRequest: {
      type: DataTypes.STRING,
      field: 'takeback_request',
      allowNull: true,
    },
    drawOffer: {
      type: DataTypes.STRING,
      field: 'draw_offer',
      allowNull: true,
    },
    pgnTags: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    lastMoveTimestamp: {
      type: DataTypes.DATE,
      field: 'last_move_timestamp',
      allowNull: false,
    },
    moves: {
      type: DataTypes.JSON,
      allowNull: false,
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
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable(TABLE_NAME);
}
