const { app } = require("@azure/functions");
const { shopsTable, sessionsTable, writeShopState } = require("../lib/storage");
const {
  hashSecret,
  randomSalt,
  randomToken,
  randomShopCode,
  randomRecoveryCode,
  isValidPin
} = require("../lib/auth");

const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 180; // 180 days

app.http("signup", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "signup",
  handler: async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request body" } };
    }

    const shopName = String(body.shopName || "").trim().slice(0, 60);
    const pin = String(body.pin || "").trim();

    if (!shopName) {
      return { status: 400, jsonBody: { error: "Shop name is required" } };
    }
    if (!isValidPin(pin)) {
      return { status: 400, jsonBody: { error: "PIN must be 4-8 digits" } };
    }

    const table = await shopsTable();

    let shopCode = null;
    const salt = randomSalt();
    const pinHash = hashSecret(pin, salt);
    const recoveryCode = randomRecoveryCode();
    const recoverySalt = randomSalt();
    const recoveryHash = hashSecret(recoveryCode, recoverySalt);

    for (let attempt = 0; attempt < 6 && !shopCode; attempt++) {
      const candidate = randomShopCode();
      try {
        await table.createEntity({
          partitionKey: "shop",
          rowKey: candidate,
          shopName,
          salt,
          pinHash,
          recoverySalt,
          recoveryHash,
          createdAt: new Date().toISOString()
        });
        shopCode = candidate;
      } catch (e) {
        if (e.statusCode !== 409) throw e;
        // collision on shop code, try again
      }
    }

    if (!shopCode) {
      return { status: 500, jsonBody: { error: "Could not allocate a shop code, please try again" } };
    }

    await writeShopState(shopCode, {
      shopName,
      currency: "USD",
      language: "en",
      workers: ["Worker 1", "Worker 2", "Worker 3"],
      entries: []
    });

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
      jsonBody: { shopCode, token, shopName, recoveryCode }
    };
  }
});
