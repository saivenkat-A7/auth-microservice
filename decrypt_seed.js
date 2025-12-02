const fs = require("fs");
const crypto = require("crypto");

function decryptSeed(encryptedSeedB64, privateKeyPath) {
    // 1. Load student's private key
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    // 2. Base64 decode
    const encryptedBuffer = Buffer.from(encryptedSeedB64, "base64");

    // 3. RSA-OAEP SHA-256 decrypt
    const decryptedBuffer = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
        },
        encryptedBuffer
    );

    // 4. Convert to UTF-8 string
    const seed = decryptedBuffer.toString("utf8");

    // 5. Validate hex format (64 chars)
    if (!/^[0-9a-f]{64}$/.test(seed)) {
        throw new Error("❌ Seed validation failed: must be 64-character hex string");
    }

    return seed;
}

// Example usage:
const encryptedSeed = fs.readFileSync("./encrypted_seed.txt", "utf8").trim();
const seed = decryptSeed(encryptedSeed, "./student_private.pem");

console.log("✅ Decrypted Seed:", seed);

// Save to file
fs.writeFileSync("./data/seed.txt", seed);
console.log("📌 Saved decrypted seed to /data/seed.txt");
