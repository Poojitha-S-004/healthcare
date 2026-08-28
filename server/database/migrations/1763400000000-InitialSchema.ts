import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1763400000000 implements MigrationInterface {
  name = "InitialSchema1763400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "openId" character varying(64) NOT NULL,
        "name" text,
        "email" character varying(320),
        "loginMethod" character varying(64),
        "role" character varying(10) NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastSignedIn" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_openId" UNIQUE ("openId"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "facilities" (
        "id" SERIAL NOT NULL,
        "code" character varying(64) NOT NULL,
        "name" character varying(255) NOT NULL,
        "defaultLanguage" character varying(5) NOT NULL DEFAULT 'en',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_facilities_code" UNIQUE ("code"),
        CONSTRAINT "PK_facilities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "facility_memberships" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "facilityId" integer NOT NULL,
        "staffRole" character varying(20) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_facility_memberships" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "facilityMembership_user_facility_role"
        ON "facility_memberships" ("userId", "facilityId", "staffRole")
    `);

    await queryRunner.query(`
      CREATE TABLE "sync_operations" (
        "id" SERIAL NOT NULL,
        "operationId" character varying(128) NOT NULL,
        "userId" integer NOT NULL,
        "facilityId" integer,
        "operationType" character varying(96) NOT NULL,
        "entityId" character varying(128) NOT NULL,
        "payload" text,
        "clientCreatedAt" TIMESTAMP NOT NULL,
        "receivedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sync_operations_operationId" UNIQUE ("operationId"),
        CONSTRAINT "PK_sync_operations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id" SERIAL NOT NULL,
        "localId" character varying(128) NOT NULL,
        "name" character varying(255) NOT NULL,
        "dateOfBirth" date,
        "gender" character varying(16),
        "facilityId" integer NOT NULL,
        "guardianName" text,
        "contactPhone" character varying(32),
        "careCategory" character varying(10) NOT NULL DEFAULT 'routine',
        "allergies" text,
        "currentMedicines" text,
        "registeredAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patients" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "queue_entries" (
        "id" SERIAL NOT NULL,
        "patientId" integer NOT NULL,
        "facilityId" integer NOT NULL,
        "serviceType" character varying(64) NOT NULL,
        "careCategory" character varying(10) NOT NULL DEFAULT 'routine',
        "priorityReason" character varying(512),
        "tokenNumber" integer NOT NULL DEFAULT 0,
        "status" character varying(20) NOT NULL DEFAULT 'waiting',
        "enteredAt" TIMESTAMP NOT NULL DEFAULT now(),
        "calledAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_queue_entries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "teleconsult_sessions" (
        "id" SERIAL NOT NULL,
        "patientId" integer NOT NULL,
        "facilityId" integer NOT NULL,
        "clinicianId" integer,
        "status" character varying(20) NOT NULL DEFAULT 'scheduled',
        "scheduledAt" TIMESTAMP,
        "startedAt" TIMESTAMP,
        "endedAt" TIMESTAMP,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teleconsult_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "triage_results" (
        "id" SERIAL NOT NULL,
        "patientId" integer NOT NULL,
        "facilityId" integer NOT NULL,
        "careCategory" character varying(64) NOT NULL,
        "riskScore" integer NOT NULL DEFAULT 0,
        "serviceType" character varying(64),
        "reason" text,
        "assessedBy" character varying(64) NOT NULL DEFAULT 'rule_based',
        "screeningData" jsonb,
        "assessedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_triage_results" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "facility_memberships"
        ADD CONSTRAINT "FK_facility_memberships_userId"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "facility_memberships"
        ADD CONSTRAINT "FK_facility_memberships_facilityId"
        FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "sync_operations"
        ADD CONSTRAINT "FK_sync_operations_userId"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "patients"
        ADD CONSTRAINT "FK_patients_facilityId"
        FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "queue_entries"
        ADD CONSTRAINT "FK_queue_entries_patientId"
        FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "queue_entries" DROP CONSTRAINT "FK_queue_entries_patientId"`);
    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_patients_facilityId"`);
    await queryRunner.query(`ALTER TABLE "sync_operations" DROP CONSTRAINT "FK_sync_operations_userId"`);
    await queryRunner.query(`ALTER TABLE "facility_memberships" DROP CONSTRAINT "FK_facility_memberships_facilityId"`);
    await queryRunner.query(`ALTER TABLE "facility_memberships" DROP CONSTRAINT "FK_facility_memberships_userId"`);
    await queryRunner.query(`DROP TABLE "triage_results"`);
    await queryRunner.query(`DROP TABLE "teleconsult_sessions"`);
    await queryRunner.query(`DROP TABLE "queue_entries"`);
    await queryRunner.query(`DROP TABLE "patients"`);
    await queryRunner.query(`DROP TABLE "sync_operations"`);
    await queryRunner.query(`DROP INDEX "facilityMembership_user_facility_role"`);
    await queryRunner.query(`DROP TABLE "facility_memberships"`);
    await queryRunner.query(`DROP TABLE "facilities"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
