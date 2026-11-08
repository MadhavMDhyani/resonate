# Resonate

**Live demo:** https://resonate.dhyani-pankaj811.workers.dev

**Live demo:** https://resonate.dhyani-pankaj811.workers.dev

**Free, open-source music player. Creative Commons streaming, free downloads, no ads — plus your own local files in the same player.**

Resonate is a Spotify-style web player with one crucial difference: everything it offers is
legal by construction.

- **Streaming** comes from [Jamendo](https://www.jamendo.com) — hundreds of thousands of
  tracks published under Creative Commons licenses by independent artists who consented to
  free distribution. No major-label catalog, no licenses to buy, no takedowns to fear.
- **Downloads are a feature, not a hack.** Every catalog track has a direct, artist-approved
  MP3 download; albums offer ZIP downloads. Download buttons respect per-track permissions.
- **Local files** — import your own music folders; tags and cover art are read in your
  browser, and files never leave your device.
- **No accounts, no tracking, no ads.** Favorites, playlists, and your local library are
  stored in your browser (IndexedDB).

## Quick start

```bash
npm install
npm run dev
```

You need a free **Jamendo client_id** (the app shows a setup screen with instructions, or
grab one at [devportal.jamendo.com](https://devportal.jamendo.com) → Apps → create app):

```bash
cp .env.example .env   # then paste your client_id into VITE_JAMENDO_CLIENT_ID
```

## Features

- Spotify-style UI: home, search, album / artist / playlist pages, player bar, queue panel
- Play / pause / seek / next / prev / shuffle / repeat / volume, OS media-key support
  (Media Session API)
- Free MP3 download on every track, ZIP download on albums (where Jamendo provides one)
- CC license badge on every catalog track — click it for the license deed
- Favorites and personal playlists (reorder, rename, delete) — persisted locally
- Local library: import a folder (Chromium, persisted handles) or pick files (any browser),
  tag + cover-art parsing, play local and catalog tracks in the same queue

## Architecture

Plain Vite + React 19 + TypeScript SPA. No backend. Music never touches a server we run.

```
src/
├── api/jamendo.ts        # typed Jamendo v3.0 client (cache, error handling)
├── audio/audioSingleton  # one global <audio> element
├── db/db.ts              # Dexie/IndexedDB: favorites, playlists, local tracks, file handles
├── stores/playerStore.ts # queue, playback order, shuffle/repeat (Zustand)
├── hooks/useAudioEngine  # element ↔ store ↔ MediaSession wiring
├── local/localLibrary.ts # File System Access API, tag parsing (music-metadata)
├── components/           # PlayerBar, TrackRow, Sidebar, QueuePanel, MediaCard…
└── pages/                # Home, Search, Album, Artist, Playlists, Library, LocalFiles
```

## Legal model (read this before forking)

- **Code**: GPL-3.0-or-later. Fork it, but keep it open.
- **Music**: remains under its own Creative Commons licenses. Resonate displays the license
  for every track and links the deed. It only ever streams/downloads from Jamendo's own
  endpoints with developer consent, and hides downloads where a track disallows them.
- **This is why it works**: distributing CC music with attribution and artist consent is
  legal everywhere; distributing major-label music without a license is not. Don't add
  YouTube/Spotify rippers to a fork — that's piracy and it will kill the project.

## Roadmap

- [ ] PWA: installable, offline shell
- [ ] Equalizer (Web Audio API), gapless playback
- [ ] Sync favorites/playlists across devices (opt-in, encrypted)
- [ ] Artist tipping / revenue share (Jamendo commercial tier or direct payments)
- [ ] Android/iOS via Capacitor

## Monetization path (compatible with free + open source)

1. **Donations** — GitHub Sponsors / Open Collective link in the app (off by default).
2. **Freemium** — free core forever; paid extras (e.g. cloud sync, EQ presets, themes).
3. **Commercial API tier** — when revenue exists, upgrade the Jamendo plan per their terms.
4. **Artist economy** — tips and merch links keep the catalog healthy and give you cut
   streams that no rights body can touch.

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).