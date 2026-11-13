const { app } = require("@azure/functions");
const { requireAuth } = require("../lib/requireAuth");
const { readShopState, writeShopState } = require("../lib/storage");

function defaultState() {
  return { shopName: "Salon", currency: "USD", language: "en", workers: [], entries: [] };
}

app.http("settings", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "settings",
  handler: async (request) => {
    const shopCode = await requireAuth(request);
    if (!shopCode) return { status: 401, jsonBody: { error: "Not authenticated" } };

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request body" } };
    }

    const current = (await readShopState(shopCode)) || defaultState();

    if (typeof body.shopName === "string") {
      current.shopName = body.shopName.trim().slice(0, 60) || "Salon";
    }
    if (typeof body.currency === "string") {
      current.currency = body.currency.trim().slice(0, 10);
    }
    if (typeof body.language === "string") {
      current.language = body.language.trim().slice(0, 10);
    }

    await writeShopState(shopCode, current);

    return {
      status: 200,
      jsonBody: { shopName: current.shopName, currency: current.currency, language: current.language }
    };
  }
});
