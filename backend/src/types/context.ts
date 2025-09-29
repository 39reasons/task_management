import type { Pool } from "pg";
import type { DecodedToken } from "@shared/types";

export interface GraphQLContext {
  db: Pool;
  user: DecodedToken | null;
}
