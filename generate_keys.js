// generate_keys.js
// Node.js built-in crypto - generate RSA 4096-bit keypair (public exponent 65537)
// Writes student_private.pem and student_public.pem in PEM format.

const { generateKeyPairSync } = require('crypto');
const { writeFileSync } = require('fs');
const path = require('path');

function generateRsaKeypair() {
  // generateKeyPairSync options:
  // - modulusLength: 4096 (bits)
  // - publicExponent: 0x10001 (65537)
  // - format: 'pem'
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicExponent: 0x10001,
    publicKeyEncoding: {
      type: 'spki',        // recommended for public key PEM
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',       // recommended for private key PEM
      format: 'pem',
      cipher: undefined,   // do NOT encrypt with passphrase (assignment expects plain PEM)
      passphrase: undefined
    }
  });

  return { privateKey, publicKey };
}

function writeKeysToFiles(privateKeyPem, publicKeyPem) {
  // File names required by assignment:
  const privPath = path.join(process.cwd(), 'student_private.pem');
  const pubPath  = path.join(process.cwd(), 'student_public.pem');

  writeFileSync(privPath, privateKeyPem, { encoding: 'utf8', mode: 0o600 });
  writeFileSync(pubPath, publicKeyPem,  { encoding: 'utf8', mode: 0o644 });

  console.log('Wrote:', privPath, pubPath);
}

(function main() {
  console.log('Generating RSA 4096-bit key pair (this may take a few seconds)...');
  const { privateKey, publicKey } = generateRsaKeypair();
  writeKeysToFiles(privateKey, publicKey);
  console.log('Done. Make sure to commit both files to Git as required by the assignment.');
})();
