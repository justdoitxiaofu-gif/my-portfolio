import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ url: 'http://localhost:4001/graphql', token: 'f941fbfb892963ec7ca15380c7d5970504ecb7fe', queries,  });
export default client;
  