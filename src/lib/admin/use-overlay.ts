import { useSyncExternalStore } from "react";
import { adminSnapshot, subscribeAdminOverlay } from "./overlay";
/** Price utilities read the public snapshot; consumers must subscribe to it. */
export function useAdminOverlay() {
  return useSyncExternalStore(subscribeAdminOverlay, adminSnapshot, adminSnapshot);
}
