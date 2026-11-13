const { app } = require("@azure/functions");
const { shopsTable } = require("../lib/storage");
const { hashSecret, randomSalt, isValidPin } = require("../lib/auth");

app.http("reset-pin", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "reset-pin",
  handler: async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request body" } };
    }

    const shopCode = String(body.shopCode || "").trim().toUpperCase();
    const recoveryCode = String(body.recoveryCode || "").trim().toUpperCase();
    const newPin = String(body.newPin || "").trim();

    if (!shopCode || !recoveryCode) {
      return { status: 400, jsonBody: { error: "Shop code and recovery code are required" } };
    }
    if (!isValidPin(newPin)) {
      return { status: 400, jsonBody: { error: "New PIN must be 4-8 digits" } };
    }

    const table = await shopsTable();
    let shop;
    try {
      shop = await table.getEntity("shop", shopCode);
    } catch (e) {
      return { status: 401, jsonBody: { error: "Incorrect shop code or recovery code" } };
    }

    const recoveryHash = hashSecret(recoveryCode, shop.recoverySalt);
    if (recoveryHash !== shop.recoveryHash) {
      return { status: 401, jsonBody: { error: "Incorrect shop code or recovery code" } };
    }

    const newSalt = randomSalt();
    const newPinHash = hashSecret(newPin, newSalt);
    await table.updateEntity(
      { partitionKey: "shop", rowKey: shopCode, salt: newSalt, pinHash: newPinHash },
      "Merge"
    );

    return { status: 200, jsonBody: { ok: true } };
  }
});
