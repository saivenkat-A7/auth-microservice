const fs = require('fs');
const axios = require('axios');
const path = require('path');

// ----------------- CONFIG -----------------
const studentId = "23P31A05A7"; // Your actual student ID
const githubRepoUrl = "https://github.com/saivenkat-A7/auth-microservice"; // Your GitHub repo URL
const publicKeyPath = path.join(__dirname, 'student_public.pem'); // Path to your public key
const outputPath = path.join(__dirname, 'data', 'encrypted_seed.txt'); // Where to save encrypted seed
const instructorApiUrl = "https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws/"; // Instructor API URL
// -----------------------------------------

// Read your public key
const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');

async function getEncryptedSeed() {
    try {
        // Call Instructor API
        const response = await axios.post(instructorApiUrl, {
            student_id: studentId,
            github_repo_url: githubRepoUrl, // ✅ Must match API field exactly
            public_key: publicKey
        });

        // Get encrypted seed from response
        const encryptedSeed = response.data.encrypted_seed;

        // Ensure output directory exists
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        // Save encrypted seed to file
        fs.writeFileSync(outputPath, encryptedSeed, 'utf-8');

        console.log("✅ Encrypted seed saved successfully at:", outputPath);
        console.log("Encrypted Seed:", encryptedSeed);

    } catch (error) {
        if (error.response && error.response.data) {
            console.error("❌ API Error:", error.response.data);
        } else {
            console.error("❌ Error:", error.message);
        }
    }
}

getEncryptedSeed();
