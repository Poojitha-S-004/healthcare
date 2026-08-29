import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeleconsultMessages1763700000000 implements MigrationInterface {
  name = "AddTeleconsultMessages1763700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teleconsult_messages" (
        "id" SERIAL NOT NULL,
        "sessionId" integer NOT NULL,
        "senderUserId" integer NOT NULL,
        "senderRole" character varying(32) NOT NULL,
        "senderName" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teleconsult_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teleconsult_messages_sessionId" FOREIGN KEY ("sessionId") REFERENCES "teleconsult_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_teleconsult_messages_senderUserId" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "teleconsultMessages_session_created" ON "teleconsult_messages" ("sessionId", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "teleconsultMessages_session_created"`);
    await queryRunner.query(`DROP TABLE "teleconsult_messages"`);
  }
}
