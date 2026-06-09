import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";

// Netlify Function handler para tRPC
export default async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/.netlify/functions/trpc",
    req,
    router: appRouter,
    createContext: ({ req }) => ({
      req: {
        headers: Object.fromEntries(req.headers.entries()),
      },
    }),
  });
};

export const config = {
  path: "/.netlify/functions/trpc/*",
};
