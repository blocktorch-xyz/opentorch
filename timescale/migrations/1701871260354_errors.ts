/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const ERRORS_TABLE_NAME = 'errors'

const RETENTION_LENGTH = '7 days'
const CHUNK_TIME_INTERVAL = '7 days'
const ERRORS_TABLE_COLUMNS: ColumnDefinitions = {
  timestamp: { type: 'TIMESTAMPTZ', notNull: true },
  chain_id: { type: 'TEXT', notNull: true },
  tx_hash: { type: 'TEXT', notNull: true },
  contract: { type: 'TEXT', notNull: true },
  transaction_to: { type: 'TEXT' },
  signature: { type: 'TEXT' }
}

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(ERRORS_TABLE_NAME, ERRORS_TABLE_COLUMNS, { ifNotExists: true, comment: 'Raw data for errors' })

  // create composite primary key
  pgm.createConstraint(ERRORS_TABLE_NAME, `${ERRORS_TABLE_NAME}_PK`, { primaryKey: ['chain_id', 'tx_hash', 'contract', 'signature', 'timestamp'] })

  // create indexes
  pgm.createIndex(ERRORS_TABLE_NAME, [{ name: 'timestamp', sort: 'DESC' }, 'chain_id', 'contract', 'signature'], { name: 'idx_errors_timestamp_chain_id_contract_signature' })

  // turn the table into a hypertable
  pgm.sql(`SELECT create_hypertable('${ERRORS_TABLE_NAME}', 'timestamp', chunk_time_interval => INTERVAL '${CHUNK_TIME_INTERVAL}')`);

  // set retention policy
  pgm.sql(`SELECT add_retention_policy('${ERRORS_TABLE_NAME}', INTERVAL '${RETENTION_LENGTH}')`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(ERRORS_TABLE_NAME, { cascade: true })
}
