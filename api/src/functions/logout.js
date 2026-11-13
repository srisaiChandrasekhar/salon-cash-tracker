const { app } = require("@azure/functions");
const { sessionsTable } = require("../lib/storage");

app.http("logout", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "logout",
  handler: async (request) => {
    const authHeader = request.headers.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match) {
      const token = match[1].trim();
      const sessions = await sessionsTable();
      try {
        await sessions.deleteEntity("session", token);
      } catch (e) {
        // already gone — fine
      }
    }
    return { status: 200, jsonBody: { ok: true } };
  }
});
