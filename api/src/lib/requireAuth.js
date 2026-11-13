const { sessionsTable } = require("./storage");

// Returns the authenticated shop code, or null if the request has no
// valid, unexpired session token.
async function requireAuth(request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;

  const table = await sessionsTable();
  try {
    const session = await table.getEntity("session", token);
    if (Number(session.expiresAt) < Date.now()) return null;
    return session.shopCode;
  } catch (e) {
    return null;
  }
}

module.exports = { requireAuth };
