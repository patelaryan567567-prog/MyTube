import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

const env = import.meta.env || {};

const isPlaceholder = (val) =>
  !val ||
  typeof val !== "string" ||
  val.trim() === "" ||
  /^[-_.\s]+$/.test(val.trim()) ||
  val.includes("your_");

const isAiStudioPreview =
  typeof window !== "undefined" && window.location.hostname.endsWith(".run.app");

const hasValidEnvFirebase =
  !isAiStudioPreview &&
  !isPlaceholder(env.VITE_FIREBASE_API_KEY) &&
  !isPlaceholder(env.VITE_FIREBASE_PROJECT_ID) &&
  !isPlaceholder(env.VITE_FIREBASE_APP_ID);

const firebaseConfig = hasValidEnvFirebase
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY.trim(),
      authDomain: !isPlaceholder(env.VITE_FIREBASE_AUTH_DOMAIN)
        ? env.VITE_FIREBASE_AUTH_DOMAIN.trim()
        : `${env.VITE_FIREBASE_PROJECT_ID.trim()}.firebaseapp.com`,
      ...(!isPlaceholder(env.VITE_FIREBASE_DATABASE_URL)
        ? { databaseURL: env.VITE_FIREBASE_DATABASE_URL.trim() }
        : {}),
      projectId: env.VITE_FIREBASE_PROJECT_ID.trim(),
      storageBucket: !isPlaceholder(env.VITE_FIREBASE_STORAGE_BUCKET)
        ? env.VITE_FIREBASE_STORAGE_BUCKET.trim()
        : `${env.VITE_FIREBASE_PROJECT_ID.trim()}.firebasestorage.app`,
      messagingSenderId: !isPlaceholder(env.VITE_FIREBASE_MESSAGING_SENDER_ID)
        ? env.VITE_FIREBASE_MESSAGING_SENDER_ID.trim()
        : "",
      appId: env.VITE_FIREBASE_APP_ID.trim(),
      ...(!isPlaceholder(env.VITE_FIREBASE_MEASUREMENT_ID)
        ? { measurementId: env.VITE_FIREBASE_MEASUREMENT_ID.trim() }
        : {}),
    }
  : {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      ...(!isPlaceholder(env.VITE_FIREBASE_MEASUREMENT_ID)
        ? { measurementId: env.VITE_FIREBASE_MEASUREMENT_ID.trim() }
        : {}),
    };

// Only use appletConfig.firestoreDatabaseId when connected to appletConfig.projectId.
// If a custom Firebase project is configured via Netlify env vars, use VITE_FIREBASE_FIRESTORE_DATABASE_ID
// (or the project's default database if not specified).
const firestoreDatabaseId =
  firebaseConfig.projectId === appletConfig.projectId
    ? appletConfig.firestoreDatabaseId
    : !isPlaceholder(env.VITE_FIREBASE_FIRESTORE_DATABASE_ID)
      ? env.VITE_FIREBASE_FIRESTORE_DATABASE_ID.trim()
      : undefined;

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Keep the user logged in across browser restarts and tab closes.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not set Firebase auth persistence:", err);
});

// Configure Google Auth Provider with YouTube scope so a single login
// persists Firebase Auth indefinitely and grants YouTube Data API access.
export const YT_SCOPE = "https://www.googleapis.com/auth/youtube";
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(YT_SCOPE);
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Firebase Analytics safely when supported by the browser
export let analytics = null;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore analytics errors when blocked by adblockers or unsupported environments
    });
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Sanitize strings and IDs to strictly match firebase-blueprint.json & firestore.rules
const cleanStr = (val, maxLen, fallback = "") => {
  const s = typeof val === "string" ? val.trim() : "";
  return (s || fallback).slice(0, maxLen);
};

export const isValidFirestoreId = (id) =>
  typeof id === "string" &&
  id.length >= 1 &&
  id.length <= 128 &&
  /^[a-zA-Z0-9_-]+$/.test(id);

/**
 * Ensures the parent `/users/{uid}` document exists and is up to date.
 */
export async function upsertUserProfile(firebaseUser, extraProfile = {}) {
  if (!firebaseUser?.uid || !isValidFirestoreId(firebaseUser.uid)) return null;
  const uid = firebaseUser.uid;
  const path = `users/${uid}`;
  const ref = doc(db, "users", uid);

  const name = cleanStr(
    extraProfile.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0],
    120,
    "MyTube User"
  );
  const email = cleanStr(extraProfile.email || firebaseUser.email, 254, "user@example.com");
  const picture = cleanStr(extraProfile.picture || firebaseUser.photoURL, 1024, "");

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        name,
        email,
        picture,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      if (
        existing.name !== name ||
        existing.email !== email ||
        existing.picture !== picture
      ) {
        await setDoc(ref, {
          uid,
          name,
          email,
          picture,
          createdAt: existing.createdAt,
          updatedAt: serverTimestamp(),
        });
      }
    }
    return { uid, name, email, picture };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Upserts a subscription item in `/users/{uid}/subscriptions/{channelId}`.
 */
export async function saveSubscriptionToFirestore(uid, channel) {
  if (!uid || !channel?.id || !isValidFirestoreId(uid) || !isValidFirestoreId(channel.id)) {
    return;
  }
  const channelId = channel.id;
  const path = `users/${uid}/subscriptions/${channelId}`;
  const ref = doc(db, "users", uid, "subscriptions", channelId);

  const payloadBase = {
    id: channelId,
    uid,
    subId: cleanStr(channel.subId, 256, ""),
    name: cleanStr(channel.name, 200, "Channel"),
    avatar: cleanStr(channel.avatar, 1024, ""),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...payloadBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      await setDoc(ref, {
        ...payloadBase,
        createdAt: existing.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeSubscriptionFromFirestore(uid, channelId) {
  if (!uid || !channelId || !isValidFirestoreId(uid) || !isValidFirestoreId(channelId)) {
    return;
  }
  const path = `users/${uid}/subscriptions/${channelId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "subscriptions", channelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Upserts a video item in `/users/{uid}/{subcollection}/{videoId}`
 * where subcollection is `"likedVideos"` or `"watchLater"`.
 */
export async function saveVideoItemToFirestore(uid, subcollection, video) {
  if (!uid || !video?.id || !isValidFirestoreId(uid) || !isValidFirestoreId(video.id)) {
    return;
  }
  const videoId = video.id;
  const path = `users/${uid}/${subcollection}/${videoId}`;
  const ref = doc(db, "users", uid, subcollection, videoId);

  const payloadBase = {
    id: videoId,
    uid,
    title: cleanStr(video.title, 300, "Untitled video"),
    thumb: cleanStr(video.thumb, 1024, ""),
    channel: cleanStr(video.channel, 200, ""),
    duration: cleanStr(video.duration, 32, ""),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...payloadBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      await setDoc(ref, {
        ...payloadBase,
        createdAt: existing.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeVideoItemFromFirestore(uid, subcollection, videoId) {
  if (!uid || !videoId || !isValidFirestoreId(uid) || !isValidFirestoreId(videoId)) {
    return;
  }
  const path = `users/${uid}/${subcollection}/${videoId}`;
  try {
    await deleteDoc(doc(db, "users", uid, subcollection, videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
