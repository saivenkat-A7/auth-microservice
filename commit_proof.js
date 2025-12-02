// commit_proof.js
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");
const path = require("path");

// ---------------- CONFIG ----------------
const studentPrivateKeyPath = path.join(__dirname, "student_private.pem");
const instructorPublicKeyPath = path.join(__dirname, "instructor_public.pem");
// ----------------------------------------

// 1️⃣ Get latest commit hash (40-char hex)
const commitHash = execSync("git log -1 --format=%H").toString().trim();
console.log("Commit Hash:", commitHash);

// 2️⃣ Load student private key
const studentPrivateKey = fs.readFileSync(studentPrivateKeyPath, "utf8");

// 3️⃣ Sign commit hash with RSA-PSS-SHA256
const signer = crypto.createSign("sha256");
signer.update(commitHash);
signer.end();
const signature = signer.sign({
    key: studentPrivateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN
});
console.log("Signature generated.");

// 4️⃣ Load instructor public key
const instructorPublicKey = fs.readFileSync(instructorPublicKeyPath, "utf8");

// 5️⃣ Encrypt signature using RSA-OAEP-SHA256
const encryptedSignature = crypto.publicEncrypt(
    {
        key: instructorPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256"
    },
    signature
);

// 6️⃣ Base64 encode the encrypted signature
const base64Signature = encryptedSignature.toString("base64");

// 7️⃣ Output result
console.log("\nEncrypted Signature (Base64, single line):");
console.log(base64Signature);
