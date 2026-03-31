/**
 * MSW Server setup for tests
 * This server intercepts HTTP requests and returns mock responses
 */

import { setupServer } from "msw/node";
import { supabaseFunctionsHandlers, supabaseRestHandlers } from "./handlers";

export const server = setupServer(...supabaseFunctionsHandlers, ...supabaseRestHandlers);
