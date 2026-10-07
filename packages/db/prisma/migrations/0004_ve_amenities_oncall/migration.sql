-- Guardia 24/7 rotation per agency
ALTER TABLE "Agency" ADD COLUMN "onCall" JSONB;

-- Venezuelan essentials as filterable data
ALTER TABLE "Listing" ADD COLUMN "powerBackup" TEXT,
ADD COLUMN "ownWell" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "waterTankLiters" INTEGER,
ADD COLUMN "dockFeet" INTEGER,
ADD COLUMN "viewAvila" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "viewSea" BOOLEAN NOT NULL DEFAULT false;
