/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const EVENTS_TABLE_NAME = 'events'

const RETENTION_LENGTH = '7 days'
const CHUNK_TIME_INTERVAL = '7 days'
const EVENTS_TABLE_COLUMNS: ColumnDefinitions = {
  timestamp: { type: 'TIMESTAMPTZ', notNull: true },
  chain_id: { type: 'TEXT', notNull: true },
  tx_hash: { type: 'TEXT', notNull: true },
  ordinal: { type: 'TEXT', notNull: true },
  emitter: { type: 'TEXT', notNull: true },
  transaction_to: { type: 'TEXT', notNull: true },
  signature: { type: 'TEXT', notNull: true }
}

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(EVENTS_TABLE_NAME, EVENTS_TABLE_COLUMNS, { ifNotExists: true, comment: 'Raw data for events' })

  // create composite primary key
  pgm.createConstraint(EVENTS_TABLE_NAME, `${EVENTS_TABLE_NAME}_PK`, { primaryKey: ['chain_id', 'tx_hash', 'ordinal', 'timestamp'] })

  // create indexes
  pgm.createIndex(EVENTS_TABLE_NAME, [{ name: 'timestamp', sort: 'DESC' }, 'chain_id', 'emitter', 'signature'], { name: 'idx_events_timestamp_chain_id_emitter_signature' })

  // turn the table into a hypertable
  pgm.sql(`SELECT create_hypertable('${EVENTS_TABLE_NAME}', 'timestamp', chunk_time_interval => INTERVAL '${CHUNK_TIME_INTERVAL}')`);

  // set retention policy
  pgm.sql(`SELECT add_retention_policy('${EVENTS_TABLE_NAME}', INTERVAL '${RETENTION_LENGTH}')`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(EVENTS_TABLE_NAME, { cascade: true })
}
