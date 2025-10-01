
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only';
import serviceAccount from '../../firebase-credentials.json';

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    // We need to cast the service account because the type inference is not perfect.
    const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
    app = admin.initializeApp({ credential });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    // This is a fatal error, and the application cannot run without a database connection.
    throw new Error('Could not initialize Firebase Admin SDK. Check your firebase-credentials.json. ' + error.message);
  }
} else {
  // If the app is already initialized, use the existing instance.
  app = admin.apps[0]!;
}

const db = getFirestore(app);
const auth = admin.auth(app);

export const getFirebaseAdmin = () => {
  if (!db || !auth) {
    // This should not happen if the initialization was successful, but it's a safeguard.
    throw new Error("Firebase Admin has not been initialized correctly.");
  }
  return { db, auth };
};
