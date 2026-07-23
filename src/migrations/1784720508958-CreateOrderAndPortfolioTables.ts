import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderAndPortfolioTables1784720508958 implements MigrationInterface {
  name = 'CreateOrderAndPortfolioTables1784720508958';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "split_folio"."portfolios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100), CONSTRAINT "PK_488aa6e9b219d1d9087126871ae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "split_folio"."portfolio_stocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticker" character varying(20) NOT NULL, "allocation_percentage" numeric(5,2) NOT NULL, "custom_market_price" numeric(12,4), "portfolio_id" uuid, CONSTRAINT "PK_d8b5eece766e5843d05955f50eb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "split_folio"."order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticker" character varying(20) NOT NULL, "allocation_percentage" numeric(5,2) NOT NULL, "price_per_share" numeric(12,4) NOT NULL, "allocated_amount" numeric(14,4) NOT NULL, "share_quantity" numeric(18,7) NOT NULL, "order_id" uuid, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "split_folio"."orders_order_type_enum" AS ENUM('BUY', 'SELL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "split_folio"."orders_status_enum" AS ENUM('SCHEDULED', 'EXECUTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "split_folio"."orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_type" "split_folio"."orders_order_type_enum" NOT NULL, "total_amount" numeric(14,2) NOT NULL, "scheduled_execution_date" TIMESTAMP NOT NULL, "status" "split_folio"."orders_status_enum" NOT NULL DEFAULT 'SCHEDULED', CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolio_stocks" ADD CONSTRAINT "FK_7fbe08bfd9cd55e71e4381ead04" FOREIGN KEY ("portfolio_id") REFERENCES "split_folio"."portfolios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "split_folio"."order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "split_folio"."orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "split_folio"."order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "split_folio"."portfolio_stocks" DROP CONSTRAINT "FK_7fbe08bfd9cd55e71e4381ead04"`,
    );
    await queryRunner.query(`DROP TABLE "split_folio"."orders"`);
    await queryRunner.query(`DROP TYPE "split_folio"."orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "split_folio"."orders_order_type_enum"`);
    await queryRunner.query(`DROP TABLE "split_folio"."order_items"`);
    await queryRunner.query(`DROP TABLE "split_folio"."portfolio_stocks"`);
    await queryRunner.query(`DROP TABLE "split_folio"."portfolios"`);
  }
}
