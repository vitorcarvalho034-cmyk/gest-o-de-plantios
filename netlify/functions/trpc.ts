import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";

// Netlify Function handler para tRPC
export default async (req: Request) => {
  const responseHeaders = new Headers();
  return fetchRequestHandler({
    endpoint: "/.netlify/functions/trpc",
    req,
    router: appRouter,
    createContext: ({ req }) => ({
      req: {
        headers: Object.fromEntries(req.headers.entries()),
      },
      responseHeaders,
    }),
    responseMeta: ({ ctx }) => ({ headers: ctx?.responseHeaders }),
  });
};

export const config = {
  path: "/.netlify/functions/trpc/*",
};
