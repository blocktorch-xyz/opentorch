/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { STATE_VARS_TABLE_NAME } from './1702987704616_state-variables';
import { TRANSACTIONS_TABLE_NAME } from './1701790967313_transactions-v2';

export const shorthands: ColumnDefinitions | undefined = undefined;

const changeStateVarsPK = async (pgm: MigrationBuilder): Promise<void> => {
  // set column as required
  pgm.alterColumn(STATE_VARS_TABLE_NAME, 'ordinal', { notNull: true })
  // drop PK
  pgm.dropConstraint(STATE_VARS_TABLE_NAME, `${STATE_VARS_TABLE_NAME}_PK`)
  // create new PK
  pgm.createConstraint(STATE_VARS_TABLE_NAME, `${STATE_VARS_TABLE_NAME}_PK`, { primaryKey: ['chain_id', 'contract', 'variable', 'ordinal', 'timestamp'] })
  // set column as optional
  pgm.alterColumn(STATE_VARS_TABLE_NAME, 'id', { notNull: false })
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  changeStateVarsPK(pgm)

  // drop ineffecient index
  pgm.dropIndex(TRANSACTIONS_TABLE_NAME, [], { name: 'idx_transactions_v2_timestamp_chain_id_to_type' })
  // create same index without timestamp
  pgm.createIndex(TRANSACTIONS_TABLE_NAME, ['chain_id', 'to', 'type', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_transactions_v2_chain_id_to_type_timestamp' })
  // drop index
  pgm.dropIndex(TRANSACTIONS_TABLE_NAME, [], { name: 'idx_transactions_v2_to_timestamp_type' })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint(STATE_VARS_TABLE_NAME, `${STATE_VARS_TABLE_NAME}_PK`)
  pgm.alterColumn(STATE_VARS_TABLE_NAME, 'id', { notNull: true })
  pgm.alterColumn(STATE_VARS_TABLE_NAME, 'ordinal', { notNull: false })
  pgm.createConstraint(STATE_VARS_TABLE_NAME, `${STATE_VARS_TABLE_NAME}_PK`, { primaryKey: ['id', 'timestamp'] })

  pgm.dropIndex(TRANSACTIONS_TABLE_NAME, [], { name: 'idx_transactions_v2_chain_id_to_type_timestamp' })
  pgm.createIndex(TRANSACTIONS_TABLE_NAME, [{ name: 'timestamp', sort: 'DESC' }, 'chain_id', 'to', 'type'], { name: 'idx_transactions_v2_timestamp_chain_id_to_type' })
  pgm.createIndex(TRANSACTIONS_TABLE_NAME, ['to', { name: 'timestamp', sort: 'DESC' }, 'type'], { name: 'idx_transactions_v2_to_timestamp_type' })
}
