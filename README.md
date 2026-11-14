# MyTube

MyTube is a YouTube-style single-page client built with React 19, Vite, and Firebase (Authentication, Cloud Firestore, and Analytics). It obtains public video, channel, playlist, and comment data from YouTube Data API v3, embeds YouTube videos, keeps users permanently signed in via Firebase Authentication (`browserLocalPersistence`), and syncs their profile, subscriptions, liked videos, and Watch Later library to Cloud Firestore.

## Features

- **Persistent Firebase Login (No Auto-Logout)**: Uses Firebase Authentication with `browserLocalPersistence` and `onAuthStateChanged` so users stay logged in across page reloads, tab closes, and browser restarts until they explicitly click **Sign out**.
- **Cloud Firestore Backend**: Automatically saves and syncs user profiles (`/users/{uid}`), subscriptions (`/users/{uid}/subscriptions/{channelId}`), liked videos (`/users/{uid}/likedVideos/{videoId}`), and Watch Later (`/users/{uid}/watchLater/{videoId}`).
- **YouTube Account Sync**: Signing in with Google also requests the YouTube scope to import and sync real YouTube subscriptions and liked videos.
- Home feed of popular videos, category filtering, infinite scroll, and Shorts shelf.
- Video watch pages with embedded playback, related videos, timestamps, comments, sharing, likes, Watch Later, and channel subscription controls.

## Netlify Environment Variables Setup

To configure Firebase on your published **Netlify** site:

1. Open your [Netlify Dashboard](https://app.netlify.com/) → select your site → **Site configuration** → **Environment variables**.
2. Add the following Firebase environment variables from your Firebase project settings:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=study-os-f9bba
VITE_FIREBASE_STORAGE_BUCKET=study-os-f9bba.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-WCBY4NLKE3
```

3. In the [Firebase Console](https://console.firebase.google.com/):
   - Go to **Authentication** → **Sign-in method** and make sure **Google** is enabled.
   - Go to **Authentication** → **Settings** → **Authorized domains** and add your Netlify domain (e.g., `your-site-name.netlify.app`).
   - Go to **Firestore Database** and ensure a Firestore database is created and the security rules from `firestore.rules` are published.
4. Trigger a new deploy in Netlify (**Deploys** → **Trigger deploy** → **Deploy site**) so Vite bundles the new `VITE_FIREBASE_*` environment variables.
