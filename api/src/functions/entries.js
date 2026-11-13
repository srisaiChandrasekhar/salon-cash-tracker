const { app } = require("@azure/functions");
const crypto = require("crypto");
const { requireAuth } = require("../lib/requireAuth");
const { readShopState, writeShopState } = require("../lib/storage");

const VALID_TYPES = ["income", "expense", "shopexpense"];

function defaultState() {
  return { shopName: "Salon", currency: "USD", language: "en", workers: [], entries: [] };
}

const MAX_LOG_ENTRIES = 300;

// Record every add/edit/delete so nothing can quietly disappear — the
// owner can review this later even if the underlying entry is gone.
// Anyone who knows the shop PIN can use the app (there's no separate
// worker login), so this log is the only way to catch a figure being
// changed or an entry being deleted after the fact.
function logActivity(current, logEntry) {
  if (!Array.isArray(current.activityLog)) current.activityLog = [];
  current.activityLog.push({
    id: Date.now().toString(36) + crypto.randomBytes(3).toString("hex"),
    at: new Date().toISOString(),
    ...logEntry
  });
  if (current.activityLog.length > MAX_LOG_ENTRIES) {
    current.activityLog = current.activityLog.slice(current.activityLog.length - MAX_LOG_ENTRIES);
  }
}

app.http("entries", {
  methods: ["POST", "PUT", "DELETE"],
  authLevel: "anonymous",
  route: "entries/{id?}",
  handler: async (request, context) => {
    const shopCode = await requireAuth(request);
    if (!shopCode) return { status: 401, jsonBody: { error: "Not authenticated" } };

    const current = (await readShopState(shopCode)) || defaultState();
    if (!Array.isArray(current.entries)) current.entries = [];

    // Azure Functions v4 model: route params come from request.params, not
    // context.bindingData (which doesn't populate for this route). Using
    // bindingData here silently treated every single-entry delete as a
    // bulk delete, wiping all entries — fixed by reading request.params.
    const id = request.params && request.params.id;

    if (request.method === "DELETE") {
      if (id) {
        const deleted = current.entries.find((e) => e.id === id);
        current.entries = current.entries.filter((e) => e.id !== id);
        if (deleted) {
          logActivity(current, {
            action: "delete",
            entryType: deleted.type,
            worker: deleted.worker,
            amount: deleted.amount,
            note: deleted.note,
            entryDate: deleted.date,
            entryTime: deleted.time
          });
        }
      } else {
        // Bulk delete — "Reset all data" clears entries only.
        logActivity(current, { action: "reset", count: current.entries.length });
        current.entries = [];
      }
      await writeShopState(shopCode, current);
      return { status: 200, jsonBody: { ok: true } };
    }

    if (request.method === "PUT") {
      // Edit an existing entry — only amount, worker, and note can change.
      // The date/time/type stay fixed so edits don't reshuffle history.
      if (!id) return { status: 400, jsonBody: { error: "Entry id is required" } };
      const idx = current.entries.findIndex((e) => e.id === id);
      if (idx === -1) return { status: 404, jsonBody: { error: "Entry not found" } };

      let body;
      try {
        body = await request.json();
      } catch {
        return { status: 400, jsonBody: { error: "Invalid request body" } };
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { status: 400, jsonBody: { error: "Amount must be greater than 0" } };
      }
      const worker = body.worker ? String(body.worker).trim().slice(0, 40) : null;
      const note = body.note ? String(body.note).trim().slice(0, 200) : "";

      const before = current.entries[idx];
      const updated = {
        ...before,
        amount: Math.round(amount * 100) / 100,
        worker,
        note
      };
      current.entries[idx] = updated;
      logActivity(current, {
        action: "edit",
        entryType: updated.type,
        entryDate: updated.date,
        entryTime: updated.time,
        prevAmount: before.amount,
        prevWorker: before.worker,
        prevNote: before.note,
        amount: updated.amount,
        worker: updated.worker,
        note: updated.note
      });
      await writeShopState(shopCode, current);

      return { status: 200, jsonBody: updated };
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
