const fs = require("fs");
const path = require("path");
const otplib = require("otplib");

const seedPath = "/app/data/seed.txt";

function hexToBase32(hexStr) {
    return Buffer.from(hexStr, "hex").toString("base64");
}

function generateTOTP(seedHex) {
    const base32Seed = hexToBase32(seedHex);
    otplib.authenticator.options = {
        digits: 6,
        step: 30,
        algorithm: "sha1"
    };
    return otplib.authenticator.generate(base32Seed);
}

try {
    if (!fs.existsSync(seedPath)) {
        console.log("Seed not found");
        process.exit(0);
    }

    const seedHex = fs.readFileSync(seedPath, "utf8").trim();
    const code = generateTOTP(seedHex);

    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    console.log(`${timestamp} 2FA Code: ${code}`);

} catch (err) {
    console.error("Cron error:", err);
}
