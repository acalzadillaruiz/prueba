import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
console.log(JSON.stringify(await p.mandate.findMany({ where: { listingId: process.argv[2] } })));
await p.$disconnect();
