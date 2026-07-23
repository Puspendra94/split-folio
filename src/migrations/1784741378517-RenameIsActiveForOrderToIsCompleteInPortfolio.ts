import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameIsActiveForOrderToIsCompleteInPortfolio1784741378517 implements MigrationInterface {
  name = 'RenameIsActiveForOrderToIsCompleteInPortfolio1784741378517';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolios" RENAME COLUMN "is_active_for_order" TO "is_complete"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolios" RENAME COLUMN "is_complete" TO "is_active_for_order"`,
    );
  }
}
