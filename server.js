// server.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const { authenticator } = require('otplib');
const base32 = require('hi-base32');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Config
const DATA_DIR = path.join(__dirname, 'data');
const SEED_PATH = path.join(DATA_DIR, 'seed.txt');            // hex seed (64 chars)
const PRIVATE_KEY_PATH = path.join(__dirname, 'student_private.pem');
const PORT = process.env.PORT || 8080;

// Ensure data directory exists (prevents ENOENT on write)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: load private key
function loadPrivateKey() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    throw new Error('Private key file not found: ' + PRIVATE_KEY_PATH);
  }
  return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
}

// Helper: validate hex seed (64 char, lowercase hex)
function isValidHexSeed(s) {
  return typeof s === 'string' && s.length === 64 && /^[0-9a-f]{64}$/.test(s);
}

// Helper: save seed file
function saveSeed(hexSeed) {
  // Ensure data dir exists (again)
  fs.mkdirSync(path.dirname(SEED_PATH), { recursive: true });
  fs.writeFileSync(SEED_PATH, hexSeed, { encoding: 'utf8', flag: 'w' });
}

// Helper: read seed file
function readSeed() {
  if (!fs.existsSync(SEED_PATH)) return null;
  const s = fs.readFileSync(SEED_PATH, 'utf8').trim();
  return s;
}

// Helper: decrypt base64 encrypted seed using RSA-OAEP SHA-256
function decryptSeedBase64(encryptedSeedB64, privateKeyPem) {
  // 1. Base64 decode
  const encryptedBuffer = Buffer.from(encryptedSeedB64, 'base64');

  // 2. Use crypto.privateDecrypt with OAEP & sha256
  // Node's privateDecrypt options: { key, padding, oaepHash }
  const decryptedBuffer = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256' // MGF1 with SHA-256 is default for OAEP in Node when oaepHash set
    },
    encryptedBuffer
  );

  // 3. Convert to UTF-8 string
  const decryptedString = decryptedBuffer.toString('utf8');

  return decryptedString;
}

// Helper: hex seed -> base32 secret for otplib
function hexToBase32(hexSeed) {
  const bytes = Buffer.from(hexSeed, 'hex');      // convert hex -> bytes
  // hi-base32 returns uppercase; otplib accepts uppercase base32
  return base32.encode(bytes).replace(/=+$/, ''); // remove padding chars
}

// --- Endpoint 1: POST /decrypt-seed ---
app.post('/decrypt-seed', (req, res) => {
  try {
    const encryptedSeed = req.body.encrypted_seed || req.body.encryptedSeed || req.body['encrypted-seed'];
    if (!encryptedSeed || typeof encryptedSeed !== 'string') {
      return res.status(400).json({ error: 'Missing field: encrypted_seed' });
    }

    // Load private key
    const privateKeyPem = loadPrivateKey();

    // Decrypt
    let decrypted;
    try {
      decrypted = decryptSeedBase64(encryptedSeed, privateKeyPem);
    } catch (err) {
      console.error('Decryption failed:', err.message);
      return res.status(500).json({ error: 'Decryption failed' });
    }

    // Validate: must be 64-char hex lowercase (in assignment they say 64 hex chars)
    const candidate = decrypted.trim();
    if (!isValidHexSeed(candidate)) {
      return res.status(500).json({ error: 'Decrypted seed invalid format' });
    }

    // Save to /data/seed.txt
    saveSeed(candidate);

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Endpoint 2: GET /generate-2fa ---
app.get('/generate-2fa', (req, res) => {
  try {
    const hexSeed = readSeed();
    if (!hexSeed) {
      return res.status(500).json({ error: 'Seed not decrypted yet' });
    }
    if (!isValidHexSeed(hexSeed)) {
      return res.status(500).json({ error: 'Stored seed invalid' });
    }

    // Convert to base32 for otplib
    const base32Secret = hexToBase32(hexSeed);

    // Configure otplib (default uses SHA-1, 6 digits, 30s) - defaults are fine
    authenticator.options = { step: 30, digits: 6 }; // explicit but optional

    // Generate current code
    const code = authenticator.generate(base32Secret);

    // Calculate remaining seconds in current period
    const step = 30;
    const epoch = Math.floor(Date.now() / 1000);
    const remaining = step - (epoch % step);

    return res.status(200).json({ code, valid_for: remaining });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Endpoint 3: POST /verify-2fa ---
app.post('/verify-2fa', (req, res) => {
  try {
    const code = (req.body.code || req.body.codeString || req.body['code']);
    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const hexSeed = readSeed();
    if (!hexSeed) {
      return res.status(500).json({ error: 'Seed not decrypted yet' });
    }
    if (!isValidHexSeed(hexSeed)) {
      return res.status(500).json({ error: 'Stored seed invalid' });
    }

    const base32Secret = hexToBase32(hexSeed);
    authenticator.options = { step: 30, digits: 6 };

    // Verify with window ±1 (previous, current, next)
    const verified =
      authenticator.checkDelta(code, base32Secret) !== null // checkDelta returns delta or null
      ? true
      : false;

    // alternatively manual window check:
    // let ok = false;
    // for (let offset = -1; offset <= 1; offset++) {
    //   if (authenticator.check(code, base32Secret, { timestamp: Date.now() + offset * 30000 })) {
    //     ok = true; break;
    //   }
    // }

    return res.status(200).json({ valid: verified });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth microservice running on port ${PORT}`);
  console.log(`Seed path: ${SEED_PATH}`);
});
