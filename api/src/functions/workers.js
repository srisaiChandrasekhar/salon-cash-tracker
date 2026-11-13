const { app } = require("@azure/functions");
const { requireAuth } = require("../lib/requireAuth");
const { readShopState, writeShopState } = require("../lib/storage");

function defaultState() {
  return { shopName: "Salon", currency: "USD", language: "en", workers: [], entries: [] };
}

app.http("workers", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "workers",
  handler: async (request) => {
    const shopCode = await requireAuth(request);
    if (!shopCode) return { status: 401, jsonBody: { error: "Not authenticated" } };

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request body" } };
    }

    if (!Array.isArray(body.workers)) {
      return { status: 400, jsonBody: { error: "workers must be an array of names" } };
    }
    const workers = body.workers
      .map((w) => String(w || "").trim().slice(0, 40))
      .filter((w) => w.length > 0)
      .slice(0, 50);

    const current = (await readShopState(shopCode)) || defaultState();
    current.workers = workers;
    await writeShopState(shopCode, current);

    return { status: 200, jsonBody: { workers } };
  }
});
