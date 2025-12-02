// totp_utils.js
const fs = require('fs');
const path = require('path');
const rfc4648 = require('rfc4648');
const { totp } = require('otplib');

// CONFIG
const seedPath = path.join(__dirname, 'data', 'seed.txt');

// TOTP settings (default for most implementations)
totp.options = { 
  digits: 6,
  step: 30,       // 30-second window
  algorithm: 'sha1' // TOTP uses HMAC-SHA1 by default
};

// Utility: convert 64-hex -> base32 (RFC4648) without padding
function hexToBase32NoPad(hexStr) {
  const buf = Buffer.from(hexStr, 'hex');
  return rfc4648.base32.stringify(buf, { pad: false });
}

function generateTotpFromHex(hexSeed) {
  // 1. Convert hex -> base32
  const base32 = hexToBase32NoPad(hexSeed);
  // 2. Generate TOTP (otplib expects a base32 secret)
  const code = totp.generate(base32);
  return code;
}

// verify with windowSteps = number of time steps before/after to accept
function verifyTotpFromHex(hexSeed, code, windowSteps = 1) {
  const base32 = hexToBase32NoPad(hexSeed);
  // otplib supports window through check with options: pass window param to check method via totp.check
  // But totp.check does not accept window directly; instead set totp.options.window temporarily.
  const prevOptions = Object.assign({}, totp.options);
  totp.options = { ...totp.options, window: windowSteps };

  const isValid = totp.check(code, base32);

  // restore options
  totp.options = prevOptions;
  return isValid;
}

// CLI usage
if (require.main === module) {
  if (!fs.existsSync(seedPath)) {
    console.error('Missing seed file at', seedPath, '— run decryption first.');
    process.exit(1);
  }
  const hexSeed = fs.readFileSync(seedPath, 'utf8').trim();

  const arg = process.argv[2];
  if (arg === '--gen') {
    const code = generateTotpFromHex(hexSeed);
    console.log('TOTP code (30s):', code);
  } else if (arg === '--verify') {
    const provided = process.argv[3];
    const windowSteps = parseInt(process.argv[4] || '1', 10);
    if (!provided) {
      console.error('Usage: node totp_utils.js --verify <6digitcode> [windowSteps]');
      process.exit(2);
    }
    const ok = verifyTotpFromHex(hexSeed, provided, windowSteps);
    console.log('Verify result:', ok);
  } else {
    console.log('Usage: node totp_utils.js --gen   # generate code');
    console.log('       node totp_utils.js --verify 123456 [windowSteps]');
  }
}

module.exports = { generateTotpFromHex, verifyTotpFromHex };
