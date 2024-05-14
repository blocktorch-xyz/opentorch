/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions, PgLiteral } from 'node-pg-migrate';

export const STATE_VARS_TABLE_NAME = 'state_variables';

const RETENTION_LENGTH = '10 days'
const CHUNK_TIME_INTERVAL = '10 days'
const STATE_VARS_TABLE_COLUMNS: ColumnDefinitions = {
  id: { type: 'UUID', default: new PgLiteral('gen_random_uuid()') },
  timestamp: { type: 'TIMESTAMPTZ', notNull: true },
  chain_id: { type: 'VARCHAR(36)', notNull: true },
  block_number: { type: 'BIGINT', notNull: true },
  contract: { type: 'VARCHAR(42)', notNull: true },
  variable: { type: 'TEXT', notNull: true },
  value: { type: 'DECIMAL(90, 10)' }
}

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true })
  pgm.createTable(STATE_VARS_TABLE_NAME, STATE_VARS_TABLE_COLUMNS, { ifNotExists: true, comment: 'Raw data for state variables' })

  // create composite primary key
  pgm.createConstraint(STATE_VARS_TABLE_NAME, `${STATE_VARS_TABLE_NAME}_PK`, { primaryKey: ['id', 'timestamp'], ifExists: false })

  // create indexes
  // CREATE INDEX idx_state_vars_chain_id_block_number_timestamp ON state_variables(chain_id, block_number DESC, timestamp DESC);
  pgm.createIndex(STATE_VARS_TABLE_NAME, ['chain_id', 'contract', 'variable', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_state_vars_chain_id_contract_variable_timestamp', ifNotExists: true })
  pgm.createIndex(STATE_VARS_TABLE_NAME, ['chain_id', { name: 'block_number', sort: 'DESC' }, { name: 'timestamp', sort: 'DESC' }], { name: 'idx_state_vars_chain_id_block_number_timestamp', ifNotExists: true })

  // turn the table into a hypertable
  pgm.sql(`SELECT create_hypertable('${STATE_VARS_TABLE_NAME}', 'timestamp', chunk_time_interval => INTERVAL '${CHUNK_TIME_INTERVAL}')`);

  // set retention policy
  pgm.sql(`SELECT add_retention_policy('${STATE_VARS_TABLE_NAME}', INTERVAL '${RETENTION_LENGTH}')`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(STATE_VARS_TABLE_NAME, { cascade: true })
}
