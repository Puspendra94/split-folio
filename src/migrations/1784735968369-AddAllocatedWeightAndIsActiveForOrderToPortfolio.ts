import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllocatedWeightAndIsActiveForOrderToPortfolio1784735968369 implements MigrationInterface {
  name = 'AddAllocatedWeightAndIsActiveForOrderToPortfolio1784735968369';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolios" ADD "allocated_weight" numeric(5,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolios" ADD "is_active_for_order" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolios" DROP COLUMN "is_active_for_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolios" DROP COLUMN "allocated_weight"`,
    );
  }
}
