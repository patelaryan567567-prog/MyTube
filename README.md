# MyTube

MyTube is a YouTube-style single-page client built with React 19 and Vite. It obtains public video, channel, playlist, and comment data from YouTube Data API v3, embeds YouTube videos, and provides a browser-local library with Google sign-in UI.

## Features

- Home feed of popular videos for India, category filtering, infinite scroll, and a Shorts shelf limited to videos up to 60 seconds.
- Video watch pages with embedded playback, related videos, timestamps, comments, sharing, likes, Watch Later, and channel subscription controls.
- Search with suggestions and recent searches; channel pages with Home, Videos, Live, and Playlists tabs.
- Dedicated Trending, Shorts, Subscriptions, Watch Later, Liked Videos, Playlist, and “You” routes.
- Google OAuth client integration, plus light and dark themes.
- In-memory API-response caching and automatic API-key failover on YouTube quota errors.

## Technology

- React 19, React Router 7, Vite 8, Axios, and React Icons.
- `@react-oauth/google` and `jwt-decode` for the sign-in experience.
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
  api/          YouTube Data API client and key rotation
  components/   Navigation and reusable cards
  context/      Theme and browser-local library state
  pages/        Route-level views
  utils/        Shared helpers
public/         Favicons and SVG icon assets
```

## Deployment

`netlify.toml` configures Netlify to serve `index.html` for every route, which is required by the browser router. Add the `VITE_*` variables in the hosting provider’s build environment, build with `npm run build`, and publish Vite’s output directory (`dist`).

## Important limitations

- All `VITE_*` values are embedded in the browser bundle. Restrict YouTube keys by referrer/API in Google Cloud; do not use a server secret as a `VITE_*` variable.
- Likes, subscriptions, Watch Later, theme, user profile, recent searches, and locally posted comments are stored in `localStorage`; they are not written to a YouTube account or synchronized across browsers.
- Data availability, rate limits, search results, and playback depend on YouTube and the supplied API keys.

