export type IncomingSyncOperation = {
  id: string;
  type: string;
  entityId: string;
  createdAt: number;
  payload?: string;
};

/** Removes duplicate operation IDs within a retry batch before server persistence. */
export function deduplicateOperations(operations: IncomingSyncOperation[]) {
  const seen = new Set<string>();
  return operations.filter((operation) => {
    if (seen.has(operation.id)) return false;
    seen.add(operation.id);
    return true;
  });
}
