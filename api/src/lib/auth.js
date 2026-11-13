const crypto = require("crypto");

// PIN / recovery-code hashing: salted SHA-256. Not meant to resist a
// serious offline attack on the raw storage account — it's here so a
// stolen blob/table export doesn't hand over plaintext PINs.
function hashSecret(secret, salt) {
  return crypto.createHash("sha256").update(salt + ":" + secret).digest("hex");
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomSalt(bytes = 8) {
  return crypto.randomBytes(bytes).toString("hex");
}

// Short shop code, avoiding visually-ambiguous characters (0/O, 1/I/L).
function randomShopCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

// Recovery code: longer, grouped for readability, same character set.
function randomRecoveryCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const part = () => {
    let s = "";
    for (let i = 0; i < 4; i++) s += chars[crypto.randomInt(chars.length)];
    return s;
  };
  return `${part()}-${part()}-${part()}`;
}

function isValidPin(pin) {
  return typeof pin === "string" && /^[0-9]{4,8}$/.test(pin);
}

module.exports = {
  hashSecret,
  randomToken,
  randomSalt,
  randomShopCode,
  randomRecoveryCode,
  isValidPin
};
