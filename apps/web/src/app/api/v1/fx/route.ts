import { handler, ok } from "@/server/api";
import { getFx } from "@/server/data";

export const GET = handler(async () => ok({ rates: await getFx() }));
