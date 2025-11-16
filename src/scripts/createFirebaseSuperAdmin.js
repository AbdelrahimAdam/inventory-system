// src/scripts/createFirebaseSuperAdmin.js
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

// Needed to resolve the JSON file path when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load your service account key
const serviceAccountPath = path.resolve(__dirname, "../config/serviceAccountKey.json");

console.log("🔑 Using service account from:", serviceAccountPath);

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      databaseURL: "https://perfume-inventory-prod.firebaseio.com",
    });
    console.log("✅ Firebase Admin initialized successfully");
  }
} catch (err) {
  console.error("❌ Failed to initialize Firebase Admin:", err);
  process.exit(1);
}

// === Example Super Admin Creation ===
const auth = admin.auth();

(async () => {
  console.log("🚀 Starting Firebase Super Admin creation...");

  try {
    const email = "abdelrahim.elbran@gmail.com";
    const password = "Abdoa@90@90@90";
    const displayName = "Super Admin";

    let user;

    try {
      user = await auth.getUserByEmail(email);
      console.log("ℹ️ Super Admin already exists:", user.uid);
    } catch {
      user = await auth.createUser({
        email,
        password,
        displayName,
      });
      console.log("✅ Created Super Admin:", user.uid);
    }

    // Assign a custom claim
    await auth.setCustomUserClaims(user.uid, { role: "superadmin" });

    console.log("🏆 Super Admin configured with custom claim: superadmin");
  } catch (err) {
    console.error("❌ Error creating Firebase Super Admin:", err.message);
    console.error("Error code:", err.code);
  } finally {
    console.log("✨ Firebase Super Admin setup process completed!");
    process.exit(0);
  }
})();
