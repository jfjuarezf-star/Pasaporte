import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only';

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    // Usar variables de entorno en lugar del archivo JSON
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
      universe_domain: "googleapis.com"
    };

    const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
    app = admin.initializeApp({ credential });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    throw new Error('Could not initialize Firebase Admin SDK. Check your environment variables. ' + error.message);
  }
} else {
  app = admin.apps[0]!;
}

const db = getFirestore(app);
const auth = admin.auth(app);

export const getFirebaseAdmin = () => {
  if (!db || !auth) {
    throw new Error("Firebase Admin has not been initialized correctly.");
  }
  return { db, auth };
};