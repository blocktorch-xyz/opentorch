/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { EVENTS_TABLE_NAME } from './1701865244048_events';

const ROLLUPS = [
  {
    name: 'contract_events_1m',
    source: EVENTS_TABLE_NAME,
    interval: '1 minute',
    startOffset: '1 day',
    endOffset: '2 minutes',
    retention: '7 days',
    customSelect: `
      SELECT
        time_bucket(INTERVAL '1 minute', timestamp) AS bucket,
        chain_id as blockchain,
        emitter,
        signature,
        COUNT(*) as "count"
      FROM ${EVENTS_TABLE_NAME}
      GROUP BY bucket, blockchain, emitter, signature
    `
  },
  {
    name: 'contract_events_10m',
    source: 'contract_events_1m',
    interval: '10 minutes',
    startOffset: '1 day',
    endOffset: '11 minutes',
    retention: '7 days'
  },
  {
    name: 'contract_events_1h',
    source: 'contract_events_10m',
    interval: '1 hour',
    startOffset: '3 days',
    endOffset: '2 hours',
    retention: '2 weeks'
  },
  {
    name: 'contract_events_1d',
    source: 'contract_events_1h',
    interval: '1 day',
    startOffset: '6 days',
    endOffset: '1 day',
    retention: '30 days'
  }
]

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const rollup of ROLLUPS) {
    const select = rollup?.customSelect || `
      SELECT
        time_bucket(INTERVAL '${rollup.interval}', bucket) AS bucket,
        blockchain,
        emitter,
        "signature",
        SUM("count") as "count"
      FROM ${rollup.source}
      GROUP BY 1, blockchain, emitter, signature
    `
    pgm.createMaterializedView(rollup.name, { storageParameters: { 'timescaledb.continuous': true, 'timescaledb.materialized_only': false }, data: false }, select)

    // create indexes
    pgm.createIndex(rollup.name, [{ name: 'bucket', sort: 'DESC' }, 'blockchain', 'emitter', 'signature'])

    // refresh policy
    pgm.sql(`SELECT add_continuous_aggregate_policy('${rollup.name}',
      start_offset => INTERVAL '${rollup.startOffset}',
      end_offset => INTERVAL '${rollup.endOffset}',
      schedule_interval => INTERVAL '${rollup.interval}'
    )`)

    // retention policy
    pgm.sql(`SELECT add_retention_policy('${rollup.name}', INTERVAL '${rollup.retention}')`)
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const rollup of ROLLUPS.reverse()) {
    pgm.dropMaterializedView(rollup.name, { cascade: true })
  }
}
