/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { TRANSACTIONS_TABLE_NAME } from './1701790967313_transactions-v2';
import { STATE_VARS_TABLE_NAME } from './1702987704616_state-variables';
import { EVENTS_TABLE_NAME } from './1701865244048_events';

export const shorthands: ColumnDefinitions | undefined = undefined;

const NEW_CONFIG = [
  {
    table: TRANSACTIONS_TABLE_NAME,
    chunkTimeInterval: '1 day',
    retentionPolicy: '7 days'
  },
  {
    table: STATE_VARS_TABLE_NAME,
    chunkTimeInterval: '1 day',
    retentionPolicy: '7 days'
  },
  {
    table: EVENTS_TABLE_NAME,
    chunkTimeInterval: '1 day',
    retentionPolicy: '7 days'
  },
]

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const config of NEW_CONFIG) {
    // set new chunk time interval
    pgm.sql(`SELECT set_chunk_time_interval('${config.table}', INTERVAL '${config.chunkTimeInterval}')`)

    // remove old retention policy
    pgm.sql(`SELECT remove_retention_policy('${config.table}')`)
    
    // add the new retention policy
    pgm.sql(`SELECT add_retention_policy('${config.table}', INTERVAL '${config.retentionPolicy}')`)
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
}
