import { Sequelize, type Dialect } from 'sequelize';

const dbName = process.env.DB_NAME ?? '';
const dbUser = process.env.DB_USER ?? '';
const dbPassword = process.env.DB_PASSWORD ?? '';
const dbHost = process.env.DB_HOST ?? 'localhost';
const dbPort = Number(process.env.DB_PORT) || 5432;

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres' satisfies Dialect,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    freezeTableName: true,
    timestamps: true,
  },
});
