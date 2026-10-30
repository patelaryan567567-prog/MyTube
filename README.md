# MyTube

MyTube is a YouTube-style single-page client built with React 19 and Vite. It obtains public video, channel, playlist, and comment data from YouTube Data API v3, embeds YouTube videos, and syncs a signed-in user's real YouTube subscriptions and liked videos via OAuth.

## Features

- Home feed of popular videos for India, category filtering, infinite scroll, and a Shorts shelf limited to videos up to 60 seconds.
- For signed-in users with subscriptions, two extra Home rows — "Latest from your subscriptions" and "Popular with your subscriptions" — built from their subscribed channels' recent uploads.
- Video watch pages with embedded playback, related videos, timestamps, comments, sharing, likes, Watch Later, and channel subscription controls.
- Search with suggestions and recent searches; channel pages with Home, Videos, Live, and Playlists tabs.
- Dedicated Trending, Shorts, Subscriptions, Watch Later, Liked Videos, Playlist, and "You" routes.
- Real account sync: signing in grants YouTube access, so subscriptions and liked videos are read from the user's real account, and subscribing or liking updates it.
- Light and dark themes.
- In-memory API-response caching and automatic API-key failover on YouTube quota errors.

## Technology

- React 19, React Router 7, Vite 8, Axios, and React Icons.
- `@react-oauth/google` for OAuth sign-in with the YouTube scope.
- ESLint for linting and Netlify configuration for SPA hosting.

## Prerequisites

- A current Node.js LTS installation compatible with the dependencies in `package.json`.
- A Google OAuth web client ID and one or more YouTube Data API v3 keys.

## Run locally

```bash
npm install
npm run dev
```

Create `.env` in the project root before starting the app:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
VITE_API_HOME=your_youtube_data_api_key
VITE_API_SEARCH=your_youtube_data_api_key
VITE_API_VIDEO=your_youtube_data_api_key

# Optional quota fallbacks (up to seven additional keys)
VITE_API_EXTRA=your_youtube_data_api_key
VITE_API_EXTRA2=your_youtube_data_api_key
# …through VITE_API_EXTRA7
```

The API client starts each request type with its dedicated key and tries the remaining defined keys after a `quotaExceeded` or `dailyLimitExceeded` response. Other API failures are surfaced to the UI/console instead of being retried across keys.

### Google Cloud setup for account sign-in

Signing in reads the user's real subscriptions and liked videos, so the OAuth client needs the YouTube scope:

1. In [Google Cloud Console](https://console.cloud.google.com/), open the project tied to `VITE_GOOGLE_CLIENT_ID` and make sure the **YouTube Data API v3** is enabled.
2. Under **APIs & Services → OAuth consent screen**, add the scope `https://www.googleapis.com/auth/youtube`.
3. While the app is in **Testing** mode, only accounts added as test users can sign in. To let anyone sign in, submit the app for Google's verification (required for this scope).
4. Under **Credentials**, add your site's URL (and `http://localhost:5173` for local development) to the OAuth client's authorized JavaScript origins.

Without this, sign-in still works but subscribing, liking, and reading real account data will fail.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the production bundle. |
| `npm run preview` | Serve the built bundle locally. |
| `npm run lint` | Run ESLint over the repository. |

## Project structure

```text
src/
  api/          youtube.js (public content, with key rotation and caching)
                youtubeAccount.js (the signed-in user's own subscriptions/likes)
  components/   Navigation and reusable cards
  context/      Auth (OAuth session, real subscriptions/likes, Watch Later) and theme state
  hooks/        useSubscriptionFeed (Home's "Latest"/"Popular from subscriptions" rows)
  pages/        Route-level views
  utils/        Shared helpers
public/         Favicons and SVG icon assets
```

## Deployment

`netlify.toml` configures Netlify to serve `index.html` for every route, which is required by the browser router. Add the `VITE_*` variables in the hosting provider's build environment, build with `npm run build`, and publish Vite's output directory (`dist`).

## Important limitations

- All `VITE_*` values are embedded in the browser bundle. Restrict YouTube keys by referrer/API in Google Cloud; do not use a server secret as a `VITE_*` variable.
- Subscriptions and liked videos are read from, and written to, the user's real YouTube account. Watch Later, theme, recent searches, and locally posted comments stay in `localStorage` only — YouTube's public API has no Watch Later endpoint.
- A sign-in lasts about an hour (the lifetime of the OAuth access token); after that, MyTube prompts the user to sign in again rather than silently losing data.
- The Home page's "Latest" and "Popular from your subscriptions" rows are MyTube's own approximation from the user's subscribed channels, not YouTube's own recommendation algorithm, which isn't exposed by the public API.
- Data availability, rate limits, search results, and playback depend on YouTube and the supplied API keys.
