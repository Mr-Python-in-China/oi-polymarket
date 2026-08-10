import type { clientOnly$, serverOnly$ } from "vite-env-only/macros";

declare global {
  const clientOnly$: typeof clientOnly$;
  const serverOnly$: typeof serverOnly$;
}
