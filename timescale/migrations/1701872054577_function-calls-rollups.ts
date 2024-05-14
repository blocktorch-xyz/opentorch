/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { TRANSACTIONS_TABLE_NAME } from './1701790967313_transactions-v2';

const ROLLUPS = [
  {
    name: 'contract_function_calls_1m',
    source: TRANSACTIONS_TABLE_NAME,
    interval: '1 minute',
    startOffset: '1 day',
    endOffset: '2 minutes',
    retention: '7 days',
    customSelect: `
      SELECT
        time_bucket(INTERVAL '1 minute', timestamp) AS bucket,
        chain_id as blockchain,
        "to" as contract,
        call_signature as signature,
        COUNT(*) as "count",
        stats_agg(gas_used) as gas_used_agg,
        stats_agg(gas_consumed) as gas_consumed_agg,
        COUNT(CASE WHEN status = 'SUCCEEDED' THEN 1 END) as status_succeeded,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as status_failed,
        COUNT(CASE WHEN status = 'REVERTED' THEN 1 END) as status_reverted
      FROM ${TRANSACTIONS_TABLE_NAME}
      GROUP BY bucket, blockchain, contract, signature
    `
  },
  {
    name: 'contract_function_calls_10m',
    source: 'contract_function_calls_1m',
    interval: '10 minutes',
    startOffset: '1 day',
    endOffset: '11 minutes',
    retention: '7 days'
  },
  {
    name: 'contract_function_calls_1h',
    source: 'contract_function_calls_10m',
    interval: '1 hour',
    startOffset: '3 days',
    endOffset: '2 hours',
    retention: '2 weeks'
  },
  {
    name: 'contract_function_calls_1d',
    source: 'contract_function_calls_1h',
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
        contract,
        "signature",
        SUM("count") as "count",
        ROLLUP(gas_used_agg) as gas_used_agg,
        ROLLUP(gas_consumed_agg) as gas_consumed_agg,
        SUM(status_succeeded) as status_succeeded,
        SUM(status_failed) as status_failed,
        SUM(status_reverted) as status_reverted
      FROM ${rollup.source}
      GROUP BY 1, blockchain, contract, signature
    `
    pgm.createMaterializedView(rollup.name, { storageParameters: { 'timescaledb.continuous': true, 'timescaledb.materialized_only': false }, data: false }, select)

    // create indexes
    pgm.createIndex(rollup.name, [{ name: 'bucket', sort: 'DESC' }, 'blockchain', 'contract', 'signature'])

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
