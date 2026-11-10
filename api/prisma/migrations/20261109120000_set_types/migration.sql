-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('NORMAL', 'WARMUP', 'FAILURE', 'DROPSET');

-- AlterTable
ALTER TABLE "RoutineExercise" ADD COLUMN     "setTypes" "SetType"[] DEFAULT ARRAY[]::"SetType"[];

-- AlterTable
ALTER TABLE "WorkoutSet" ADD COLUMN     "type" "SetType" NOT NULL DEFAULT 'NORMAL';
