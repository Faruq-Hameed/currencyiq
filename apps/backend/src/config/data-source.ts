import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'secret',
  database: process.env.DB_NAME || 'currencyiq',
  entities: [join(__dirname, '../modules/**/entities/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../migrations/*.{ts,js}')],
  synchronize: false,
});
