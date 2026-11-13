const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

function connectionString() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  }
  return conn;
}

async function ensureTable(client) {
  try {
    await client.createTable();
  } catch (e) {
    if (e.statusCode !== 409) throw e;
  }
  return client;
}

async function shopsTable() {
  return ensureTable(TableClient.fromConnectionString(connectionString(), "Shops"));
}

async function sessionsTable() {
  return ensureTable(TableClient.fromConnectionString(connectionString(), "Sessions"));
}

let blobServiceClient = null;
function blobService() {
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString());
  }
  return blobServiceClient;
}

async function dataContainer() {
  const container = blobService().getContainerClient("shopdata");
  await container.createIfNotExists();
  return container;
}

async function streamToString(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function readShopState(shopCode) {
  const container = await dataContainer();
  const blob = container.getBlockBlobClient(`${shopCode}.json`);
  try {
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody);
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

async function writeShopState(shopCode, stateObj) {
  const container = await dataContainer();
  const blob = container.getBlockBlobClient(`${shopCode}.json`);
  const body = JSON.stringify(stateObj);
  await blob.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: "application/json" },
    overwrite: true
  });
}

module.exports = {
  shopsTable,
  sessionsTable,
  readShopState,
  writeShopState
};
