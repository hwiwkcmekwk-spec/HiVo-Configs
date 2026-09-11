export type PendingAction = "ADD_SOURCE" | "ADD_DESTINATION" | "EDIT_TEMPLATE" | "EDIT_DELAY";

const pending = new Map<number, PendingAction>();

export const ConversationState = {
  set(userId: number, action: PendingAction): void {
    pending.set(userId, action);
  },
  get(userId: number): PendingAction | undefined {
    return pending.get(userId);
  },
  clear(userId: number): void {
    pending.delete(userId);
  },
};
