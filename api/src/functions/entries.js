const { app } = require("@azure/functions");
const crypto = require("crypto");
const { requireAuth } = require("../lib/requireAuth");
const { readShopState, writeShopState } = require("../lib/storage");

const VALID_TYPES = ["income", "expense", "shopexpense"];

function defaultState() {
  return { shopName: "Salon", currency: "USD", language: "en", workers: [], entries: [] };
}

app.http("entries", {
  methods: ["POST", "DELETE"],
  authLevel: "anonymous",
  route: "entries/{id?}",
  handler: async (request, context) => {
    const shopCode = await requireAuth(request);
    if (!shopCode) return { status: 401, jsonBody: { error: "Not authenticated" } };

    const current = (await readShopState(shopCode)) || defaultState();
    if (!Array.isArray(current.entries)) current.entries = [];

    const id = context.bindingData && context.bindingData.id;

    if (request.method === "DELETE") {
      if (id) {
        current.entries = current.entries.filter((e) => e.id !== id);
      } else {
        // Bulk delete — "Reset all data" clears entries only.
        current.entries = [];
      }
      await writeShopState(shopCode, current);
      return { status: 200, jsonBody: { ok: true } };
    }

    // POST — add one entry
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid request body" } };
    }

    const date = String(body.date || "").trim();
    const time = String(body.time || "").trim();
    const type = String(body.type || "").trim();
    const amount = Number(body.amount);
    const worker = body.worker ? String(body.worker).trim().slice(0, 40) : null;
    const note = body.note ? String(body.note).trim().slice(0, 200) : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return { status: 400, jsonBody: { error: "Invalid date or time" } };
    }
    if (!VALID_TYPES.includes(type)) {
      return { status: 400, jsonBody: { error: "Invalid entry type" } };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 400, jsonBody: { error: "Amount must be greater than 0" } };
    }

    const entry = {
      id: Date.now().toString(36) + crypto.randomBytes(4).toString("hex"),
      date,
      time,
      worker,
      type,
      amount: Math.round(amount * 100) / 100,
      note
    };

    current.entries.push(entry);
    await writeShopState(shopCode, current);

    return { status: 200, jsonBody: entry };
  }
});
