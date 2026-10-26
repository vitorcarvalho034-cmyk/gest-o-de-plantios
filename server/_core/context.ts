// Contexto simplificado para Netlify Functions
// O sistema usa autenticação própria por JWT de funcionário,
// não depende do Manus OAuth.

export type TrpcContext = {
  req: {
    headers: Record<string, string | string[] | undefined>;
  };
  responseHeaders: Headers;
};

export function createContext(opts: { req: { headers: Record<string, string | string[] | undefined> }; responseHeaders?: Headers }): TrpcContext {
  return {
    req: opts.req,
    responseHeaders: opts.responseHeaders ?? new Headers(),
  };
}
