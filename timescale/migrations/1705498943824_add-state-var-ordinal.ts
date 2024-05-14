/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
import { STATE_VARS_TABLE_NAME } from './1702987704616_state-variables';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  const newColumns = {
    ordinal: { type: 'TEXT' }
  }
  pgm.addColumns(STATE_VARS_TABLE_NAME, newColumns, { ifNotExists: true })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn(STATE_VARS_TABLE_NAME, ['ordinal'])
}
