const { app } = require("@azure/functions");
const { shopsTable, sessionsTable } = require("../lib/storage");
const { hashSecret, randomToken } = require("../lib/auth");

const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 180; // 180 days

app.http("login", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "login",
  handler: async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request body" } };
    }

    const shopCode = String(body.shopCode || "").trim().toUpperCase();
    const pin = String(body.pin || "").trim();
    if (!shopCode || !pin) {
      return { status: 400, jsonBody: { error: "Shop code and PIN are required" } };
    }

    const table = await shopsTable();
    let shop;
    try {
      shop = await table.getEntity("shop", shopCode);
    } catch (e) {
      return { status: 401, jsonBody: { error: "Incorrect shop code or PIN" } };
    }

    const hash = hashSecret(pin, shop.salt);
    if (hash !== shop.pinHash) {
      return { status: 401, jsonBody: { error: "Incorrect shop code or PIN" } };
    }

    const sessions = await sessionsTable();
    const token = randomToken();
    await sessions.createEntity({
      partitionKey: "session",
      rowKey: token,
      shopCode,
      expiresAt: Date.now() + SESSION_LIFETIME_MS
    });

    return {
      status: 200,
      jsonBody: { shopCode, token, shopName: shop.shopName }
    };
  }
});
