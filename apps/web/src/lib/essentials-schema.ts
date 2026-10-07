import { z } from "zod";
import { MAX_DOCK_FEET, MAX_TANK_LITERS } from "./essentials";

/**
 * Create / update validation of the Venezuelan essentials (listing API, POST and PATCH).
 * Every field is optional; null clears the nullable ones (unknown).
 */
export const essentialsSchema = z.object({
  powerBackup: z.enum(["FULL", "PARTIAL", "NONE"]).nullable().optional(),
  ownWell: z.boolean().optional(),
  waterTankLiters: z.number().int().positive().max(MAX_TANK_LITERS).nullable().optional(),
  dockFeet: z.number().int().positive().max(MAX_DOCK_FEET).nullable().optional(),
  viewAvila: z.boolean().optional(),
  viewSea: z.boolean().optional(),
});
export type EssentialsInput = z.infer<typeof essentialsSchema>;
