-- FSBO weekly visit hours (owner-published listings take bookings without an agent)
ALTER TABLE "Listing" ADD COLUMN "visitHours" JSONB;
