-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Promote the user with the smallest uid (the User primary key is id) to admin.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "id" = (SELECT MIN("id") FROM "User");
