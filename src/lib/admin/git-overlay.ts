import { createServerFn } from "@tanstack/react-start";
/** Only the public projection crosses this server boundary; never users, orders or keys. */
export const readGitOverlay = createServerFn({ method: "GET" }).handler(async () => {
  const { adminStorage } = await import("./storage.server");
  const { toPublicState } = await import("./types");
  return toPublicState(await adminStorage().read(), "git");
});
