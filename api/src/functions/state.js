const { app } = require("@azure/functions");
const { requireAuth } = require("../lib/requireAuth");
const { readShopState } = require("../lib/storage");

app.http("state", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "state",
  handler: async (request) => {
    const shopCode = await requireAuth(request);
    if (!shopCode) return { status: 401, jsonBody: { error: "Not authenticated" } };

    const data = await readShopState(shopCode);
    if (!data) {
      return {
        status: 200,
        jsonBody: { shopName: "Salon", currency: "USD", language: "en", workers: [], entries: [], activityLog: [] }
      };
    }
    if (!Array.isArray(data.activityLog)) data.activityLog = [];
    return { status: 200, jsonBody: data };
  }
});
