import { canModerate } from "../middleware/authorization";

// Content states anyone allowed to use the route may see. Lost & found also
// shows resolved items publicly.
export const PUBLIC_STATUSES: readonly string[] = Object.freeze(["active"]);
export const LOST_FOUND_PUBLIC_STATUSES: readonly string[] = Object.freeze(["active", "resolved"]);

interface Viewer {
  id?: string;
  role?: string;
}

// Moderators see every state. Owners see their own content in any state
// except deleted. Everyone else sees only public states.
export const canViewContent = ({
  status,
  ownerId,
  viewer,
  publicStatuses = PUBLIC_STATUSES,
}: {
  status: string;
  ownerId: string | null | undefined;
  viewer?: Viewer | null;
  publicStatuses?: readonly string[];
}) => {
  if (publicStatuses.includes(status)) return true;
  if (canModerate(viewer)) return true;
  return Boolean(viewer?.id) && viewer?.id === ownerId && status !== "deleted";
};
