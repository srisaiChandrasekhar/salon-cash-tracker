const { sessionsTable } = require("./storage");

// Returns the authenticated shop code, or null if the request has no
// valid, unexpired session token.
async function requireAuth(request) {
  // Note: we deliberately avoid the standard "Authorization" header here.
  // Azure Static Web Apps' managed/integrated Functions proxy reserves that
  // header for its own built-in auth system and does not reliably forward
  // a custom Bearer token through to the API, so we use our own header.
  let token = (request.headers.get("x-sc-token") || "").trim();
  if (!token) {
    const authHeader = request.headers.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match) token = match[1].trim();
  }
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
