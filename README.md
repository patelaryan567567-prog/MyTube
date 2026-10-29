# MyTube

A fast, clean YouTube-style client built with React 19 and Vite. It runs entirely in the browser and uses the YouTube Data API v3 for content and Google Sign-In for accounts.

## Features

- **Home**: category filters, a Shorts shelf and an infinite-scroll feed of popular videos
- **Watch**: embedded player, like, Watch Later, share and subscribe, clickable timestamps, comments and an "Up next" list
- **Search**: videos and channels with search suggestions and recent searches
- **Channel**: Home, Videos, Live and Playlists tabs
- **Shorts**: full-screen vertical feed
- **Trending**: popular videos by country
- **Library**: Watch Later, liked videos and subscriptions, saved in your browser
- **Light and dark themes**

## Getting started

```bash
npm install
npm run dev
```

Create a `.env` file in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_API_HOME=your-youtube-api-key
VITE_API_SEARCH=your-youtube-api-key
VITE_API_VIDEO=your-youtube-api-key
# Optional extra keys, used automatically when another key runs out of quota:
# VITE_API_EXTRA, VITE_API_EXTRA2 ... VITE_API_EXTRA7
```

When one key reaches its daily quota, the app switches to the next one automatically.

## Scripts

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the development server       |
| `npm run build`   | Create a production build          |
| `npm run preview` | Preview the production build       |
| `npm run lint`    | Check the code with ESLint         |

## Project structure

```
src/
  api/          YouTube API client with key rotation and caching
  components/   Navbar, VideoCard, VideoList, ChannelCard, CategoryBar, ...
  context/      Auth (user, library) and theme providers
  pages/        One file per route
  utils/        Shared helpers (duration formatting)
```

## Deployment

The project is set up for Netlify. Add the environment variables above in **Site settings → Environment variables**. `netlify.toml` already routes every path to `index.html` so client-side routing works.

## Notes

- Your library (likes, Watch Later, subscriptions) and any comments you post are stored in your browser's local storage. They are not synced to YouTube.
- Variables prefixed with `VITE_` are included in the browser bundle. Restrict each API key to your site's domain in the Google Cloud Console.
