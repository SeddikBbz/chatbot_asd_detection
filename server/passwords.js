const crypto = require('crypto');

// scrypt-based password hashing using only Node's built-in `crypto` module,
// so the project has one fewer third-party dependency to install.
// Format stored in the DB: "scrypt:<saltHex>:<hashHex>"

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(plainPassword, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const [, salt, hashHex] = stored.split(':');
  const hash = crypto.scryptSync(plainPassword, salt, 64);
  const storedHash = Buffer.from(hashHex, 'hex');
  if (hash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(hash, storedHash);
}

module.exports = { hashPassword, verifyPassword };
