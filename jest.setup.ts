// Firebase Emulator environment variables for tests
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

// Prevent real Firebase Admin SDK from initializing with production credentials
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "test-project";
process.env.FIREBASE_CLIENT_EMAIL =
  process.env.FIREBASE_CLIENT_EMAIL || "test@test-project.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----";

// Skip Puppeteer in CI unless explicitly enabled
if (!process.env.ENABLE_PUPPETEER) {
  process.env.SKIP_PUPPETEER = "true";
}
