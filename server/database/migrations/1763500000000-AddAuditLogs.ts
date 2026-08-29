import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogs1763500000000 implements MigrationInterface {
  name = "AddAuditLogs1763500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "actorUserId" integer,
        "facilityId" integer,
        "action" character varying(64) NOT NULL,
        "resource" character varying(64) NOT NULL,
        "resourceId" character varying(128),
        "method" character varying(16) NOT NULL,
        "path" character varying(512) NOT NULL,
        "statusCode" integer NOT NULL,
        "success" boolean NOT NULL DEFAULT true,
        "ipAddress" character varying(64),
        "userAgent" character varying(256),
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_actorUserId" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "audit_logs_actor_created" ON "audit_logs" ("actorUserId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "audit_logs_facility_created" ON "audit_logs" ("facilityId", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "audit_logs_facility_created"`);
    await queryRunner.query(`DROP INDEX "audit_logs_actor_created"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
