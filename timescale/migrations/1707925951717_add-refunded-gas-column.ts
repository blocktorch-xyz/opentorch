/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { TRANSACTIONS_TABLE_NAME } from './1701790967313_transactions-v2';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
	const newColumns = {
    refunded_gas: { type: 'DECIMAL(30, 10)' }
  }
  pgm.addColumns(TRANSACTIONS_TABLE_NAME, newColumns, { ifNotExists: true })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn(TRANSACTIONS_TABLE_NAME, ['refunded_gas'])
}
