# DRL Musical Housie — Project Context

> **Purpose of this file:** Give any AI agent (or developer) full context to understand, run, modify, and deploy this project without prior conversation history.

---

## Why This Project Exists

This is a **family function tool** built for the **Shah family** in Gujarat.

During a family gathering on **1 July 2026**, the mothers and aunties of the family ("DRL Royal Ladies") will play **Musical Housie** (also called Musical Tambola / Kukuba). Instead of calling numbers 1–90, the host plays Bollywood songs — each song maps to three housie numbers on the players' tickets.

**The problem:** The hosts are not very tech-savvy. They need a dead-simple way to:
1. Pick a random housie number during the game
2. Play the correct song instantly through speakers
3. See which song is playing and navigate forward/backward
4. Browse the full list of 30 songs if needed

**The solution:** A single-page, mobile-first web app that works on a phone connected to speakers. No app install, no login, no build step — just open a URL and tap big buttons.

**Deployment goal:** Host on **GitHub + Vercel** as a static site. Audio files are bundled in the repo (~148 MB) so playback works offline from Vercel's CDN without streaming from YouTube at runtime.

---

## Event Details (Accurate Gujarati Copy)

These strings live in `data/songs.json → event` and are rendered in `index.html`:

| Field | Gujarati Text |
|-------|---------------|
| Blessing | `\|\| શ્રી લોઢણ પાર્શ્વનાથાય નમઃ \|\|` |
| Evening tagline | `સંગીતમય સાંજ` |
| Group name | `ડભોઈ રોયેલ લેડીઝ` |
| Game type | `મ્યુઝિકલ હાઉઝી` |
| Date | `તારીખ: ૧ જુલાઈ, ૨૦૨૬` |
| Hosts (સંચાલન) | `જયશ્રી શાહ · હેતલ શાહ · રીના શાહ · સંગીતા શાહ · હીના શાહ · મીતા ફડિયા · હેમલતા શાહ` |

**Source document:** `DRL - Musical Housie A4.pdf` in the project root — the official housie ticket/board PDF in Gujarati with the song list and prize structure.

---

## How Musical Housie Works (Game Rules)

Standard 90-number housie, but numbers are replaced by **30 unique Bollywood songs**. Each song appears on **three numbers**:

```
Song 1  → numbers  1, 31, 61
Song 2  → numbers  2, 32, 62
...
Song 30 → numbers 30, 60, 90
```

Formula: `songId = ((housieNumber - 1) % 30) + 1`

**Prize categories** (from PDF, for reference — not implemented in the app):
- પહેલાં ૫ (First 5) × 2
- પહેલાં ૯ (First 9) × 2
- ચાર ખૂણા (Four corners) × 2
- ઉપરની / વચ્ચેની / નીચેની લાઈન (Lines) × 2 each
- એકફાસ્ટ / લંચ / ડિનર × 2 each
- ફુલ હાઉઝી (Full house) × 4

The app only handles **song playback and number calling** — prize tracking is done manually on paper tickets.

---

## What Was Built (Technical Summary)

### Architecture

```
Static site — no framework, no build step, no backend
├── HTML shell (index.html)
├── CSS (css/style.css) — mobile-first, wine/gold theme
├── Vanilla JS player (js/app.js) — IIFE, no dependencies
├── JSON data (data/songs.json) — event metadata + 30 songs
├── Audio assets (audio/*.m4a) — pre-downloaded from YouTube
└── Download script (scripts/download-songs.py) — yt-dlp pipeline
```

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Vanilla JS, no React/Vue** | Zero build step; easy Vercel deploy; minimal complexity for a one-page tool |
| **Pre-downloaded audio (not YouTube embed)** | Reliable offline playback; no ads; works without internet after first load; hosts don't need YouTube open |
| **`.m4a` format (not `.mp3`)** | ffmpeg was not available during initial setup; m4a plays fine in all modern mobile browsers |
| **`data/songs.json` as single source of truth** | Event text, song names (GU/HI/EN), movie, YouTube URL, and audio path all in one file |
| **Mobile-first UI** | Primary use case is a phone connected to speakers at the function |
| **Gujarati numeral display** | Housie numbers shown as ૧૨૩ not 123 — matches the physical tickets |

### UI Design (Current)

- **Theme:** Spotify dark — `#121212` body, `#181818` surfaces, `#1DB954` green accent
- **Fonts:** Noto Sans Gujarati + Noto Sans Devanagari (Google Fonts); Cormorant Garamond removed
- **Layout:** Flex shell with sticky top bar, scrollable main, sticky bottom Random button — max-width 480px
- **Touch targets:** Play button 64–72px circle, Random button 56px full-width, skip buttons 56px
- **Safe areas:** `env(safe-area-inset-*)` for iPhone notch/home bar
- **Progress bar:** Custom 4px green track; 1000-step range input; pointer + touch events for mobile scrubbing
- **Album art:** Per-song gradient placeholders (30 distinct HSL gradients); no real images needed
- **Housie number:** Green badge overlaid on album art in now-playing; also shown large in the badge
- **Song list:** Spotify-style track rows — gradient art square + Gu name + singers/movie + housie nums

### Player Logic (`js/app.js`)

State object:
```javascript
{
  songs: [],              // loaded from songs.json
  currentHousieNumber: 1, // 1–90
  playedNumbers: Set(),   // tracks called numbers for random picker
  isPlaying: false,
  isSeeking: false        // true while user drags progress bar
}
```

Key functions:
- `playSongByHousieNumber(n)` — sets number, marks as played, loads audio, plays
- `pickRandom()` — picks from unplayed numbers 1–90; resets pool when all 90 called
- `songIndexFromHousieNumber(n)` — maps 1–90 → song id 1–30
- `toGujaratiNumber(n)` — converts ASCII digits to Gujarati numerals
- Progress seeking uses `PROGRESS_MAX = 1000` for fine-grained scrubbing; `isSeeking` flag prevents `timeupdate` from fighting the slider during drag

### Audio Download Pipeline (`scripts/download-songs.py`)

1. Reads `data/songs.json`
2. For each song, tries YouTube URL → ytsearch fallback by English name → ytsearch by Hindi name
3. Downloads via **yt-dlp**; uses **certifi** for SSL cert fix on macOS Python
4. Output: `audio/NN-slug.m4a` (or `.mp3` if ffmpeg installed)
5. Updates `songs.json` with final audio paths

Run with:
```bash
pip install -r requirements.txt   # yt-dlp, certifi
python3 scripts/download-songs.py
# or: npm run download
```

**Note:** ffmpeg optional. Without it, files are `.m4a`. With ffmpeg, converts to `.mp3`.

---

## File Structure

```
DRL Musical Housie/
├── index.html                  # App shell — header, player, song list, footer
├── css/style.css               # All styles (CSS custom properties, no preprocessor)
├── js/app.js                   # Player logic (IIFE, ~320 lines)
├── data/
│   └── songs.json              # Event metadata + 30 songs (source of truth)
├── audio/                      # 30 pre-downloaded song files (~148 MB total)
│   ├── 01-lag-jaa-gale.m4a
│   ├── 02-roop-tera-mastana.m4a
│   └── ... (through 30)
├── scripts/
│   └── download-songs.py       # yt-dlp download script
├── DRL - Musical Housie A4.pdf # Original housie PDF (reference only)
├── context.md                  # This file
├── README.md                   # User-facing quick start
├── package.json                # npm scripts: download, serve
├── requirements.txt            # Python deps for download script
├── vercel.json                 # Cache headers for /audio/*
└── .gitignore
```

---

## Data Schema (`data/songs.json`)

```json
{
  "event": {
    "blessingGu": "|| શ્રી લોઢણ પાર્શ્વનાથાય નમઃ ||",
    "eveningGu": "સંગીતમય સાંજ",
    "titleGu": "ડભોઈ રોયેલ લેડીઝ",
    "subtitleGu": "મ્યુઝિકલ હાઉઝી",
    "dateGu": "તારીખ: ૧ જુલાઈ, ૨૦૨૬",
    "hostsGu": "જયશ્રી શાહ · ..."
  },
  "songs": [
    {
      "id": 1,
      "nameGu": "લગ જા ગલે",
      "nameHi": "लग जा गले",
      "nameEn": "Lag Jaa Gale",
      "movie": "Woh Kaun Thi",
      "youtube": "https://www.youtube.com/watch?v=...",
      "audio": "audio/01-lag-jaa-gale.m4a"
    }
  ]
}
```

### Full Song List (PDF Order)

| ID | Gujarati | English | Movie | Housie Numbers |
|----|----------|---------|-------|----------------|
| 1 | લગ જા ગલે | Lag Jaa Gale | Woh Kaun Thi | 1, 31, 61 |
| 2 | રૂપ તેરા મસ્તાના | Roop Tera Mastana | Aradhana | 2, 32, 62 |
| 3 | પલ પલ દિલ કે પાસ | Pal Pal Dil Ke Paas | Blackmail | 3, 33, 63 |
| 4 | ચુરા લિયા હૈ તુમને | Chura Liya Hai Tumne | Yaadon Ki Baaraat | 4, 34, 64 |
| 5 | દમ મારો દમ | Dum Maaro Dum | Hare Rama Hare Krishna | 5, 35, 65 |
| 6 | મેરે સપનો કી રાની | Mere Sapnon Ki Rani | Aradhana | 6, 36, 66 |
| 7 | યે દોસ્તી હમ નહીં | Ye Dosti Hum Nahin | Sholay | 7, 37, 67 |
| 8 | એક દો તીન | Ek Do Teen | Tezaab | 8, 38, 68 |
| 9 | તુઝે દેખા તો | Tujhe Dekha To | DDLJ | 9, 39, 69 |
| 10 | પહેલા નશા | Pehla Nasha | Jo Jeeta Wohi Sikandar | 10, 40, 70 |
| 11 | આજ કલ તેરે મેરે પ્યાર | Aaj Kal Tere Mere Pyar | Purab Aur Paschim | 11, 41, 71 |
| 12 | ગુલાબી આંખો | Gulabi Aankhen | The Train | 12, 42, 72 |
| 13 | એ મેરે દિલ કે ચૈન | Aye Mere Dil Ke Chain | Mere Jeevan Saathi | 13, 43, 73 |
| 14 | એક લડકી કો દેખા | Ek Ladki Ko Dekha | 1942: A Love Story | 14, 44, 74 |
| 15 | દિલ દિવાના | Dil Deewana | Maine Pyaar Kiya | 15, 45, 75 |
| 16 | કભી કભી મેરે દિલ | Kabhi Kabhi Mere Dil Mein | Kabhi Kabhie | 16, 46, 76 |
| 17 | મેહંદી લગા કે રખના | Mehndi Laga Ke Rakhna | DDLJ | 17, 47, 77 |
| 18 | છૈયા છૈયા | Chaiyya Chaiyya | Dil Se | 18, 48, 78 |
| 19 | યાર બના ચૈન | Yaar Bina Chain Kahan Re | Saaheb | 19, 49, 79 |
| 20 | ડિલ દો દવાને | Dil Do Na | Heyy Babyy | 20, 50, 80 |
| 21 | ખઈકે પાન બનારસ | Khaike Paan Banaras Wala | Don | 21, 51, 81 |
| 22 | આપ કે નજરોને | Aap Ke Nazron Ne | An Evening in Paris | 22, 52, 82 |
| 23 | હવા હવાઈ | Hawa Hawai | Mr. India | 23, 53, 83 |
| 24 | જુમ્મા ચુમ્મા દે દે | Jumma Chumma De De | Hum | 24, 54, 84 |
| 25 | યે કાલી કાલી આંખો | Ye Kaali Kaali Aankhen | Baazigar | 25, 55, 85 |
| 26 | ચોલી કે પીછે | Choli Ke Peeche | Khal Nayak | 26, 56, 86 |
| 27 | દીદી તેરા દેવર | Didi Tera Devar Deewana | HAHK | 27, 57, 87 |
| 28 | જો હાલ દિલ કા | Jo Haal Dil Ka | Sarfarosh | 28, 58, 88 |
| 29 | મેરે ખ્વાબો મે જો | Mere Khwabon Mein Jo | DDLJ | 29, 59, 89 |
| 30 | લૈલા મૈ લૈલા | Laila Main Laila | Qurbani | 30, 60, 90 |

---

## Known Ambiguities & Decisions

1. **Song #20 (`ડિલ દો દવાને`)** — PDF transliteration is unclear. Mapped to **"Dil Do Na"** from Heyy Babyy. User should confirm this is correct; easy to swap in `songs.json` + re-download audio.

2. **Gujarati song names** — Extracted from PDF via `pypdf`; some transliterations may differ slightly from spoken Gujarati. User provided corrected event-level text; individual song names come from the PDF.

3. **Audio source** — Songs downloaded from YouTube via yt-dlp (official channel uploads where possible). Not all may be the exact "official" version — acceptable for a family function.

4. **Audio format** — Currently `.m4a` (~148 MB total). Vercel free tier supports this size but it's close to repo limits. If deploying fails, consider Git LFS or converting to lower-bitrate mp3 with ffmpeg.

5. **No prize tracking** — App does not track who won which dividend. That's handled on paper tickets.

---

## How to Run Locally

```bash
# Serve (no install needed)
python3 -m http.server 8765
# Open http://localhost:8765

# Or via npm
npm run serve   # port 3000
```

**Important:** Must serve via HTTP (not `file://`) — `fetch('data/songs.json')` requires a server.

---

## How to Deploy (Vercel)

1. Ensure `audio/` folder is committed (~148 MB)
2. Push to GitHub
3. Import on vercel.com — **no build command**, output dir `.`
4. `vercel.json` sets long cache headers on `/audio/*`

---

## How to Modify (Common Tasks)

### Change a song
Edit `data/songs.json` → update name/YouTube URL → delete old audio file → run `python3 scripts/download-songs.py`

### Change event text
Edit `data/songs.json → event` — app loads dynamically on page load

### Change UI colors
Edit CSS custom properties in `:root` at top of `css/style.css`:
```css
--bg-deep: #1a0a12;
--gold: #d4a853;
--rose: #c9788a;
```

### Add a feature (e.g. prize tracker, called-numbers log)
- All logic is in `js/app.js` (single IIFE)
- No module bundler — just edit the file directly
- State is in-memory only (resets on page refresh) — use `localStorage` if persistence needed

---

## Development History

| Phase | What happened |
|-------|---------------|
| **Initial build** | Parsed PDF for 30 songs; built vanilla HTML/CSS/JS player; downloaded all audio via yt-dlp; orange/simple theme |
| **UI redesign v1** | User requested classy mobile-friendly design → wine/gold dark theme, SVG icons, glass cards, larger touch targets, iPhone safe areas |
| **Audio fix** | Progress slider wasn't working on mobile → added pointer/touch events, 1000-step range, visual fill track, `isSeeking` flag |
| **Gujarati text correction** | User provided accurate event copy → updated `songs.json` event block and HTML fallbacks |
| **Context doc** | This file created for AI/developer handoff |
| **Spotify redesign + album details** | Full UI rebuild: Spotify dark theme (`#121212`, `#1DB954` green), sticky top bar + scrollable content + sticky Random button at bottom. Added `singers`, `musicBy`, `year` fields to all 30 songs in `songs.json`. Song list uses Spotify-style track rows with per-song gradient art placeholders. Big housie number badge overlays album art. Now-playing shows singers + music director. |

---

## Constraints for Future AI Agents

- **Do not over-engineer** — this is a one-day family event tool, not a product
- **Keep it static** — no backend, no database, no auth unless explicitly requested
- **Mobile-first always** — primary users are non-technical Gujarati-speaking mothers on phones
- **Gujarati text is sacred** — verify with user before changing any Gujarati copy
- **Audio must be pre-bundled** — do not switch to YouTube iframe/embed at runtime
- **No commits unless user asks** — per user preference

---

## Quick Reference Commands

```bash
# Local dev
python3 -m http.server 8765

# Download/re-download songs
pip install -r requirements.txt
python3 scripts/download-songs.py

# Deploy
git push origin main   # Vercel auto-deploys
```
