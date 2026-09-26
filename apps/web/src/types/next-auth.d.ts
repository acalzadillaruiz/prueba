import type { Role } from "@newplace/config";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      agencyId: string | null;
      hue: number;
    };
  }
}
