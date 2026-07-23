import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from '../snake-naming.strategy';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: +(process.env.POSTGRES_PORT || 5432),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
  schema: process.env.POSTGRES_SCHEMA || 'split_folio',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  namingStrategy: new SnakeNamingStrategy(),
});

export default dataSource;
