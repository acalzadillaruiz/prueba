-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'AGENCY_OWNER', 'AGENT', 'CAPTOR', 'PHOTOGRAPHER', 'BACKOFFICE', 'OWNER_PRIVATE', 'SEEKER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'LONG_RENT', 'SHORT_RENT', 'COMMERCIAL_SALE', 'COMMERCIAL_RENT');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND', 'LUXURY');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'COMING_SOON', 'ACTIVE', 'UNDER_OFFER', 'SOLD', 'RENTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'TOUR', 'OFFER', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('LISTING_FORM', 'TOUR_REQUEST', 'WHATSAPP_NOTE', 'ALERT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CaptureResult" AS ENUM ('PENDING', 'CAPTURED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('SCHEDULED', 'SHOOTING', 'UPLOADING', 'DELIVERED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('RECEIVED', 'COUNTERED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "EmailKind" AS ENUM ('ALERT', 'TOUR', 'INVITE', 'VERIFY', 'LEAD');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SEEKER',
    "phone" TEXT,
    "hue" INTEGER NOT NULL DEFAULT 200,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "budget" INTEGER,
    "interests" TEXT,
    "prequal" JSONB,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDoc" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "AgencyStatus" NOT NULL DEFAULT 'TRIAL',
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "color" TEXT NOT NULL DEFAULT '#F26B4D',
    "logoUrl" TEXT,
    "initials" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMember" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "salePpm" INTEGER NOT NULL,
    "rentPpm" DOUBLE PRECISION NOT NULL,
    "activeListings" INTEGER NOT NULL,
    "daysOnMarket" INTEGER NOT NULL,
    "trend12m" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyEs" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'VE',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "polygon" JSONB,
    "kind" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "category" "Category" NOT NULL,
    "luxury" BOOLEAN NOT NULL DEFAULT false,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "pets" BOOLEAN NOT NULL DEFAULT false,
    "priceAmount" INTEGER NOT NULL,
    "priceCurrency" TEXT NOT NULL DEFAULT 'USD',
    "pricePeriod" TEXT,
    "areaM2" INTEGER NOT NULL,
    "plotM2" INTEGER,
    "beds" INTEGER NOT NULL DEFAULT 0,
    "baths" INTEGER NOT NULL DEFAULT 0,
    "parking" INTEGER NOT NULL DEFAULT 0,
    "yearBuilt" INTEGER NOT NULL,
    "amenities" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "review" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "statusBeforeTakedown" "ListingStatus",
    "takedownReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT,
    "agentId" TEXT,
    "ownerUserId" TEXT,
    "scenes" TEXT[],
    "floorplanUrl" TEXT,
    "videoUrl" TEXT,
    "virtualTourUrl" TEXT,
    "hasFloorplan" BOOLEAN NOT NULL DEFAULT false,
    "hasVideo" BOOLEAN NOT NULL DEFAULT false,
    "hasVirtualTour" BOOLEAN NOT NULL DEFAULT false,
    "brochurePdf" TEXT,
    "privateListing" BOOLEAN NOT NULL DEFAULT false,
    "shortRent" JSONB,
    "commercial" JSONB,
    "fingerprint" TEXT NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "avgTimeSec" INTEGER NOT NULL DEFAULT 60,
    "interactions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPhoto" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "scene" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPriceHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceEstimateSnapshot" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "mid" INTEGER NOT NULL,
    "low" INTEGER NOT NULL,
    "high" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "comparables" JSONB NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'heuristic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceEstimateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateFingerprint" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "DuplicateFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "agencyId" TEXT,
    "agentId" TEXT,
    "seekerUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'LISTING_FORM',
    "budget" INTEGER,
    "message" TEXT NOT NULL,
    "score" INTEGER,
    "nextAction" TEXT,
    "reason" TEXT,
    "messagesCount" INTEGER NOT NULL DEFAULT 1,
    "toursRequested" INTEGER NOT NULL DEFAULT 0,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "firstResponseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourSlot" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,

    CONSTRAINT "TourSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "leadId" TEXT,
    "agentId" TEXT NOT NULL,
    "seekerUserId" TEXT,
    "seekerName" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "virtual" BOOLEAN NOT NULL DEFAULT false,
    "status" "TourStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedListing" (
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "polygon" JSONB,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "leadId" TEXT,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadParticipant" (
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastRead" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("threadId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidderName" TEXT NOT NULL,
    "bidderUserId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'RECEIVED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "agentId" TEXT,
    "listingId" TEXT,
    "status" "MandateStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureLead" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "captorId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "areaM2" INTEGER NOT NULL,
    "askingPrice" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "fingerprint" TEXT,
    "result" "CaptureResult" NOT NULL DEFAULT 'PENDING',
    "duplicateOfId" TEXT,
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaJob" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'SCHEDULED',
    "photos" INTEGER NOT NULL DEFAULT 0,
    "cover" BOOLEAN NOT NULL DEFAULT false,
    "floorplan" BOOLEAN NOT NULL DEFAULT false,
    "video" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MediaJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "salePct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "agentSplitPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "rentMonths" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "captorPct" DOUBLE PRECISION NOT NULL DEFAULT 10,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "leadId" TEXT,
    "agentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "agentPart" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ESTIMATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "code" TEXT NOT NULL,
    "perUsd" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "kind" "EmailKind" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ModerationReport" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "title" TEXT NOT NULL,
    "reasonEs" TEXT NOT NULL,
    "reasonEn" TEXT NOT NULL,
    "reporter" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMember_agencyId_userId_key" ON "AgencyMember"("agencyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_key" ON "Zone"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_slug_key" ON "Zone"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_status_countryCode_city_listingType_idx" ON "Listing"("status", "countryCode", "city", "listingType");

-- CreateIndex
CREATE INDEX "Listing_priceAmount_idx" ON "Listing"("priceAmount");

-- CreateIndex
CREATE INDEX "Listing_publishedAt_idx" ON "Listing"("publishedAt");

-- CreateIndex
CREATE INDEX "Listing_lat_lng_idx" ON "Listing"("lat", "lng");

-- CreateIndex
CREATE INDEX "Listing_zone_idx" ON "Listing"("zone");

-- CreateIndex
CREATE INDEX "ListingPhoto_listingId_order_idx" ON "ListingPhoto"("listingId", "order");

-- CreateIndex
CREATE INDEX "ListingPriceHistory_listingId_date_idx" ON "ListingPriceHistory"("listingId", "date");

-- CreateIndex
CREATE INDEX "PlaceEstimateSnapshot_listingId_createdAt_idx" ON "PlaceEstimateSnapshot"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateFingerprint_fingerprint_key" ON "DuplicateFingerprint"("fingerprint");

-- CreateIndex
CREATE INDEX "Lead_agencyId_stage_idx" ON "Lead"("agencyId", "stage");

-- CreateIndex
CREATE INDEX "Lead_agentId_createdAt_idx" ON "Lead"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TourSlot_agentId_weekday_hour_key" ON "TourSlot"("agentId", "weekday", "hour");

-- CreateIndex
CREATE INDEX "Tour_agentId_start_idx" ON "Tour"("agentId", "start");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_agencyId_key" ON "CommissionRule"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEntry_leadId_key" ON "CommissionEntry"("leadId");

-- CreateIndex
CREATE INDEX "EmailOutbox_to_createdAt_idx" ON "EmailOutbox"("to", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPriceHistory" ADD CONSTRAINT "ListingPriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceEstimateSnapshot" ADD CONSTRAINT "PlaceEstimateSnapshot_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateFingerprint" ADD CONSTRAINT "DuplicateFingerprint_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_seekerUserId_fkey" FOREIGN KEY ("seekerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourSlot" ADD CONSTRAINT "TourSlot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_seekerUserId_fkey" FOREIGN KEY ("seekerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureLead" ADD CONSTRAINT "CaptureLead_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureLead" ADD CONSTRAINT "CaptureLead_captorId_fkey" FOREIGN KEY ("captorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaJob" ADD CONSTRAINT "MediaJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaJob" ADD CONSTRAINT "MediaJob_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

