import type { Pool } from "pg";
import type { DecodedToken } from "../../../shared/types.js";

export interface GraphQLContext extends Record<string, unknown> {
  db: Pool;
  user: DecodedToken | null;
  clientId: string | null;
}
