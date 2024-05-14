/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const TRANSACTIONS_TABLE_NAME = 'transactions_v2'

const RETENTION_LENGTH = '14 days'
const CHUNK_TIME_INTERVAL = '7 days'
const TRANSACTION_TABLE_COLUMNS: ColumnDefinitions = {
  timestamp: { type: 'TIMESTAMPTZ', notNull: true },
  chain_id: { type: 'TEXT', notNull: true },
  tx_hash: { type: 'TEXT', notNull: true },
  type: { type: 'TEXT', notNull: true },
  call_index: { type: 'SMALLINT', notNull: true },
  block_number: { type: 'BIGINT', notNull: true },
  transaction_index: { type: 'SMALLINT', notNull: true },
  to: { type: 'TEXT', notNull: true },
  from: { type: 'TEXT', notNull: true },
  status: { type: 'TEXT', notNull: true },
  gas_used: { type: 'DECIMAL(30, 10)' },
  gas_consumed: { type: 'DECIMAL(30, 10)' },
  gas_limit: { type: 'DECIMAL(30, 10)' },
  initial_gas: { type: 'DECIMAL(30, 10)' },
  value: { type: 'DECIMAL(40, 10)' },
  gas_price: { type: 'BIGINT' },
  max_fee_per_gas: { type: 'BIGINT' },
  call_signature: { type: 'TEXT' }
}

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(TRANSACTIONS_TABLE_NAME, TRANSACTION_TABLE_COLUMNS, { ifNotExists: true, comment: 'Raw data for transactions & internal transactions' })

  // create composite primary key
  pgm.createConstraint(TRANSACTIONS_TABLE_NAME, `${TRANSACTIONS_TABLE_NAME}_PK`, { primaryKey: ['chain_id', 'tx_hash', 'call_index', 'timestamp'] })

  // create indexes
  pgm.createIndex(TRANSACTIONS_TABLE_NAME, [{ name: 'timestamp', sort: 'DESC' }, 'chain_id', 'to', 'type'], { name: 'idx_transactions_v2_timestamp_chain_id_to_type' })
  pgm.createIndex(TRANSACTIONS_TABLE_NAME, ['to', { name: 'timestamp', sort: 'DESC' }, 'type'], { name: 'idx_transactions_v2_to_timestamp_type' })

  // turn the table into a hypertable
  pgm.sql(`SELECT create_hypertable('${TRANSACTIONS_TABLE_NAME}', 'timestamp', chunk_time_interval => INTERVAL '${CHUNK_TIME_INTERVAL}')`);

  // set retention policy
  pgm.sql(`SELECT add_retention_policy('${TRANSACTIONS_TABLE_NAME}', INTERVAL '${RETENTION_LENGTH}')`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(TRANSACTIONS_TABLE_NAME, { cascade: true })
}
