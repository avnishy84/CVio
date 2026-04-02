import * as admin from "firebase-admin";
import { App } from "firebase-admin/app";

let adminApp: App;

function getAdminApp(): App {
  if (admin.apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    adminApp = admin.apps[0] as App;
  }

  return adminApp;
}

export const adminAuth = () => admin.auth(getAdminApp());
export const adminDb = () => admin.firestore(getAdminApp());
export default getAdminApp;
