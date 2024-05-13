/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { TRANSACTIONS_TABLE_NAME } from './1701790967313_transactions-v2';
import { MAIN_TRANSACTION_TYPE } from './1701863504949_transactions-v2-rollups'

const ROLLUPS = [
  {
    name: 'caller_transactions_1m',
    source: TRANSACTIONS_TABLE_NAME,
    interval: '1 minute',
    startOffset: '1 day',
    endOffset: '2 minutes',
    retention: '2 weeks',
    customSelect: `
      SELECT
        time_bucket(INTERVAL '1 minute', timestamp) AS bucket,
        chain_id as blockchain,
        "from" as caller,
        COUNT(*) as tx_count,
        COUNT(CASE WHEN type = '${MAIN_TRANSACTION_TYPE}' THEN 1 END) as main_tx_count,
        COUNT(CASE WHEN type != '${MAIN_TRANSACTION_TYPE}' THEN 1 END) as internal_tx_count,
        stats_agg(gas_used) as gas_used_agg,
        MIN(gas_used) as gas_used_min,
        MAX(gas_used) as gas_used_max,
        stats_agg(gas_consumed) as gas_consumed_agg,
        MIN(gas_consumed) as gas_consumed_min,
        MAX(gas_consumed) as gas_consumed_max,
        stats_agg(initial_gas) as initial_gas_agg,
        MIN(initial_gas) as initial_gas_min,
        MAX(initial_gas) as initial_gas_max,
        stats_agg(gas_limit) as gas_limit_agg,
        MIN(gas_limit) as gas_limit_min,
        MAX(gas_limit) as gas_limit_max,
        COUNT(CASE WHEN status = 'SUCCEEDED' THEN 1 END) as status_succeeded_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as status_failed_count,
        COUNT(CASE WHEN status = 'REVERTED' THEN 1 END) as status_reverted_count,
        stats_agg("call_index") as call_index_agg,
        MIN("call_index") as call_index_min,
        MAX("call_index") as call_index_max,
        stats_agg("transaction_index") as transaction_index_agg,
        MIN("transaction_index") as transaction_index_min,
        MAX("transaction_index") as transaction_index_max,
        stats_agg("value") as value_agg,
        MIN("value") as value_min,
        MAX("value") as value_max,
        stats_agg(gas_price) as gas_price_agg,
        MIN(gas_price) as gas_price_min,
        MAX(gas_price) as gas_price_max,
        stats_agg(max_fee_per_gas) as max_fee_per_gas_agg,
        MIN(max_fee_per_gas) as max_fee_per_gas_min,
        MAX(max_fee_per_gas) as max_fee_per_gas_max
      FROM ${TRANSACTIONS_TABLE_NAME}
      GROUP BY bucket, blockchain, caller
    `
  },
  {
    name: 'caller_transactions_10m',
    source: 'caller_transactions_1m',
    interval: '10 minutes',
    startOffset: '1 day',
    endOffset: '11 minutes',
    retention: '2 weeks'
  },
  {
    name: 'caller_transactions_1h',
    source: 'caller_transactions_10m',
    interval: '1 hour',
    startOffset: '3 days',
    endOffset: '2 hours',
    retention: '3 weeks'
  },
  {
    name: 'caller_transactions_1d',
    source: 'caller_transactions_1h',
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
        caller,
        SUM(tx_count) as tx_count,
        SUM(main_tx_count) as main_tx_count,
        SUM(internal_tx_count) as internal_tx_count,
        ROLLUP(gas_used_agg) as gas_used_agg,
        MIN(gas_used_min) as gas_used_min,
        MAX(gas_used_max) as gas_used_max,
        ROLLUP(gas_consumed_agg) as gas_consumed_agg,
        MIN(gas_consumed_min) as gas_consumed_min,
        MAX(gas_consumed_max) as gas_consumed_max,
        ROLLUP(initial_gas_agg) as initial_gas_agg,
        MIN(initial_gas_min) as initial_gas_min,
        MAX(initial_gas_max) as initial_gas_max,
        ROLLUP(gas_limit_agg) as gas_limit_agg,
        MIN(gas_limit_min) as gas_limit_min,
        MAX(gas_limit_max) as gas_limit_max,
        SUM(status_succeeded_count) as status_succeeded_count,
        SUM(status_failed_count) as status_failed_count,
        SUM(status_reverted_count) as status_reverted_count,
        ROLLUP(call_index_agg) as call_index_agg,
        MIN(call_index_min) as call_index_min,
        MAX(call_index_max) as call_index_max,
        ROLLUP(transaction_index_agg) as transaction_index_agg,
        MIN(transaction_index_min) as transaction_index_min,
        MAX(transaction_index_max) as transaction_index_max,
        ROLLUP(value_agg) as value_agg,
        MIN(value_min) as value_min,
        MAX(value_max) as value_max,
        ROLLUP(gas_price_agg) as gas_price_agg,
        MIN(gas_price_min) as gas_price_min,
        MAX(gas_price_max) as gas_price_max,
        ROLLUP(max_fee_per_gas_agg) as max_fee_per_gas_agg,
        MIN(max_fee_per_gas_min) as max_fee_per_gas_min,
        MAX(max_fee_per_gas_max) as max_fee_per_gas_max
      FROM ${rollup.source}
      GROUP BY 1, blockchain, caller
    `
    pgm.createMaterializedView(rollup.name, { storageParameters: { 'timescaledb.continuous': true, 'timescaledb.materialized_only': false }, data: false }, select)

    // create indexes
    pgm.createIndex(rollup.name, [{ name: 'bucket', sort: 'DESC' }, 'blockchain', 'caller'])

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
