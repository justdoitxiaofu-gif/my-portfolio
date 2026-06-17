import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ cacheDir: 'C:/Users/yifumou/WorkBuddy/2026-06-10-19-28-57/my-portfolio/tina/__generated__/.cache/1781701642158', url: 'http://localhost:4001/graphql', token: '', queries,  });
export default client;
  