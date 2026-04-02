import * as admin from "firebase-admin";

export default async function globalTeardown() {
  // Delete all Firebase Admin app instances to prevent open handles
  await Promise.all(admin.apps.map((app) => app?.delete()));
}
