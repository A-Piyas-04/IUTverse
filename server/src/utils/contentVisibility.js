const { canModerate } = require("../middleware/authorization");

// Content states anyone allowed to use the route may see. Lost & found also
// shows resolved items publicly.
const PUBLIC_STATUSES = Object.freeze(["active"]);
const LOST_FOUND_PUBLIC_STATUSES = Object.freeze(["active", "resolved"]);

// Moderators see every state. Owners see their own content in any state
// except deleted. Everyone else sees only public states.
const canViewContent = ({ status, ownerId, viewer, publicStatuses = PUBLIC_STATUSES }) => {
  if (publicStatuses.includes(status)) return true;
  if (canModerate(viewer)) return true;
  return Boolean(viewer?.id) && viewer.id === ownerId && status !== "deleted";
};

module.exports = { LOST_FOUND_PUBLIC_STATUSES, PUBLIC_STATUSES, canViewContent };
