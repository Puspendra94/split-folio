import dataSource from './cli-rdbms';

async function createSchema() {
  const schemaName = process.env.POSTGRES_SCHEMA || 'split_folio';
  console.log(`Verifying/creating PostgreSQL schema: "${schemaName}"...`);

  await dataSource.initialize();
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
  console.log(`Schema "${schemaName}" is ready.`);
  await dataSource.destroy();
}

createSchema().catch((err) => {
  console.error('Failed to create/verify schema:', err);
  process.exit(1);
});
