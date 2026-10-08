import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@newplace/db";
import { findDuplicate } from "@/server/listing-service";

// DB-backed (seeded database, like audit-fixes.test.ts). Every row created here is removed in afterAll.
const stamp = `dup${Date.now().toString(36)}`;
const ids: string[] = [];

async function listing(address: string, lat: number, lng: number, areaM2 = 80) {
  const id = `${stamp}-${ids.length}`;
  ids.push(id);
  return prisma.listing.create({
    data: {
      id, slug: id, titleEs: "Test", titleEn: "Test", bodyEs: "", bodyEn: "", address, zone: "Test", city: "Test", state: "", lat, lng,
      kind: "apartment", listingType: "SALE", category: "RESIDENTIAL", priceAmount: 100000, areaM2, yearBuilt: 2000, amenities: [], scenes: [],
      fingerprint: id, status: "ACTIVE", review: "APPROVED", privateListing: true,
    },
  });
}

afterAll(async () => {
  await prisma.listing.deleteMany({ where: { id: { in: ids } } });
});

describe("duplicate check (address + unit)", () => {
  it("with the area still unknown, compares the full address including the unit", async () => {
    const a = await listing(`Av. Test ${stamp}, Res. Uno, Piso 6, apto 6-B`, 3.1, 3.1);
    expect((await findDuplicate(3.1, 3.1, 0, `Av. Test ${stamp}, Res. Uno, Piso 6, apto 6-B`))?.id).toBe(a.id);
    // Same building, another unit: not a duplicate while the area is unknown.
    expect(await findDuplicate(3.1, 3.1, 0, `Av. Test ${stamp}, Res. Uno, Piso 7, apto 7-B`)).toBeNull();
    // A bare zone name never matches on its own.
    expect(await findDuplicate(3.1, 3.1, 0, "Altamira")).toBeNull();
  });

  it("with the area known, a listing at the same point with the same m² is still flagged", async () => {
    const b = await listing(`Calle Test ${stamp}, Casa 1`, 4.2, 4.2, 120);
    expect((await findDuplicate(4.2, 4.2, 120, `Calle Test ${stamp}, Casa 2`))?.id).toBe(b.id);
  });
});
