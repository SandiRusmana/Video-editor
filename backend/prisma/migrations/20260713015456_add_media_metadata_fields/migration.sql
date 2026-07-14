/*
  Warnings:

  - You are about to drop the column `fileName` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `Media` table. All the data in the column will be lost.
  - Added the required column `name` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" DROP COLUMN "fileName",
DROP COLUMN "filePath",
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "path" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "width" INTEGER;
