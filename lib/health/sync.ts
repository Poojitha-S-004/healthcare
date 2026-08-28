import type { OfflineOperation } from "./types";
import type { AppRouter } from "@/server/routers";
import { createTRPCClient } from "@/lib/trpc";
/**
 * Server-facing shape for a queued offline mutation (matches `sync.push` input).
 */
export type PushOperation = {
  id: string;
  type: string;
  entityId: string;
  createdAt: number;
  payload?: string;
};

export type PushSyncResult = {
  acknowledgedIds: string[];
  acknowledgedAt: number;
};

/**
 * The push transport used by the health store to replay queued offline
 * operations to the backend. Implemented in the root layout so the store
 * stays decoupled from the tRPC provider tree.
 */
export type SyncTransport = (ops: PushOperation[]) => Promise<PushSyncResult>;

export function serializeOperation(operation: OfflineOperation): PushOperation {
  return {
    id: operation.id,
    type: operation.type,
    entityId: operation.entityId,
    createdAt: operation.createdAt,
  };
}

/**
 * Builds a SyncTransport from an existing tRPC client (the same instance the
 * root layout uses), reusing its auth headers and links.
 */
export function clientToSyncTransport(client: ReturnType<typeof createTRPCClient>): SyncTransport {
  return async (ops) => {
    const result = await client.sync.push.mutate({ operations: ops });
    return result;
  };
}
