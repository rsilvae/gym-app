-- CreateEnum
CREATE TYPE "EmailCodePurpose" AS ENUM ('VERIFY_EMAIL');

-- AlterTable: primero las columnas aceptan null, para poder rellenar las cuentas que ya existen
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT;

-- Cuentas creadas antes de esta migración: se consideran verificadas
UPDATE "User" SET "emailVerifiedAt" = "createdAt";

-- Les damos un nombre de usuario a partir de su email ("Ana.Perez@mail.com" → "ana.perez").
-- Si dos quedan iguales (o es muy corto), se le agrega "_2", "_3"...
WITH base AS (
    SELECT
        "id",
        "createdAt",
        COALESCE(
            NULLIF(LEFT(REGEXP_REPLACE(LOWER(SPLIT_PART("email", '@', 1)), '[^a-z0-9_.]', '', 'g'), 15), ''),
            'usuario'
        ) AS "name"
    FROM "User"
),
numbered AS (
    SELECT "id", "name", ROW_NUMBER() OVER (PARTITION BY "name" ORDER BY "createdAt") AS "n"
    FROM base
)
UPDATE "User" AS u
SET "username" = CASE
    WHEN numbered."n" = 1 AND LENGTH(numbered."name") >= 3 THEN numbered."name"
    ELSE numbered."name" || '_' || numbered."n"
END
FROM numbered
WHERE u."id" = numbered."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- CreateTable
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "EmailCodePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailCode_userId_purpose_key" ON "EmailCode"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "EmailCode" ADD CONSTRAINT "EmailCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
