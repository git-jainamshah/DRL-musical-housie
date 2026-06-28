(function () {
  "use strict";

  // ── Constants ─────────────────────────────────────
  const GUJARATI_DIGITS = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];
  const PROGRESS_MAX    = 1000;

  // ── State ─────────────────────────────────────────
  const state = {
    songs: [],
    currentHousieNumber: 1,
    playedNumbers: new Set(),
    isPlaying: false,
    isSeeking: false,
  };

  // ── DOM references ────────────────────────────────
  // Wrapped in a helper so missing elements don't throw
  function el(id) { return document.getElementById(id); }

  const els = {
    // Event info (some may be null if removed from HTML)
    eventBlessing: el("event-blessing"),  // hidden span
    eventEvening:  el("event-evening"),
    eventTitle:    el("event-title"),
    eventSubtitle: el("event-subtitle"),
    eventDate:     el("event-date"),
    eventHosts:    el("event-hosts"),

    // Now-playing
    nowArtBg:      el("now-art-bg"),     // gradient fallback div
    nowArtImg:     el("now-art-img"),    // YouTube thumbnail <img>
    housieNumber:  el("housie-number"),
    numberAliases: el("number-aliases"),
    songNameGu:    el("song-name-gu"),
    songNameHi:    el("song-name-hi"),
    songSingers:   el("song-singers"),
    songMeta:      el("song-meta"),      // combined movie · year · music

    // Progress
    progressBar:   el("progress-bar"),
    progressFill:  el("progress-fill"),
    progressTrack: el("progress-track"),
    timeCurrent:   el("time-current"),
    timeTotal:     el("time-total"),

    // Controls
    btnPrev:   el("btn-prev"),
    btnPlay:   el("btn-play"),
    playIcon:  el("play-icon"),
    pauseIcon: el("pause-icon"),
    btnNext:   el("btn-next"),
    btnRandom: el("btn-random"),
    btnRestart:el("btn-restart"),

    // Volume
    volumeBar:  el("volume-bar"),
    volumeFill: el("volume-fill"),

    // Misc
    statusMsg: el("status-msg"),
    songList:  el("song-list"),
    audio:     el("audio-player"),
    app:       el("app"),
  };

  // ── YouTube thumbnail ─────────────────────────────
  // Extract video ID from a youtube.com/watch?v=... URL
  function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/[?&]v=([\w-]{11})/);
    return m ? m[1] : null;
  }

  // Returns hqdefault.jpg URL (480×360) — used for main art
  function getYouTubeThumb(url, quality) {
    const id = getYouTubeId(url);
    if (!id) return null;
    return "https://img.youtube.com/vi/" + id + "/" + (quality || "hqdefault") + ".jpg";
  }

  // ── Gradient fallback per song ────────────────────
  // 30 distinct dark-to-vivid gradients, used as CSS bg
  const GRADIENT_HUES = [
    [340, 280], [200, 260], [140, 170], [30,  60],  [280, 320],
    [170, 200], [50,  20],  [310, 270], [220, 180], [80,  110],
    [260, 300], [160, 130], [40,  70],  [290, 250], [190, 220],
    [70,  40],  [330, 290], [210, 170], [110, 140], [250, 280],
    [150, 180], [20,  50],  [300, 260], [180, 210], [60,  90],
    [270, 310], [130, 160], [350, 310], [230, 190], [90,  120],
  ];

  function songGradient(id) {
    const [h1, h2] = GRADIENT_HUES[(id - 1) % 30];
    return "linear-gradient(135deg, hsl(" + h1 + ",60%,18%) 0%, hsl(" + h2 + ",72%,38%) 100%)";
  }

  // ── Utility ───────────────────────────────────────
  function setTxt(domEl, val) {
    if (domEl && val !== undefined && val !== null) domEl.textContent = val;
  }

  function toGu(n) {
    return String(n).split("").map(function (d) { return GUJARATI_DIGITS[+d]; }).join("");
  }

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return "0:00";
    return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  }

  function songIdFromHousie(n) { return ((n - 1) % 30) + 1; }
  function houseNums(songId)    { return [songId, songId + 30, songId + 60]; }
  function currentSong()        { return state.songs.find(function (s) { return s.id === songIdFromHousie(state.currentHousieNumber); }); }
  function duration()           { const d = els.audio.duration; return isFinite(d) && d > 0 ? d : 0; }
  function setStatus(m)         { setTxt(els.statusMsg, m || ""); }

  // ── Progress ──────────────────────────────────────
  function updateProgressUI(val, dur) {
    const pct = val / PROGRESS_MAX;
    els.progressFill.style.width = (pct * 100) + "%";
    if (dur > 0) els.timeCurrent.textContent = formatTime(pct * dur);
  }

  function syncProgress() {
    const dur = duration();
    if (!dur) return;
    const val = Math.round((els.audio.currentTime / dur) * PROGRESS_MAX);
    els.progressBar.value = val;
    updateProgressUI(val, dur);
  }

  function seekTo(val) {
    const dur = duration();
    if (!dur) return;
    els.audio.currentTime = (val / PROGRESS_MAX) * dur;
    updateProgressUI(val, dur);
  }

  // ── Volume ────────────────────────────────────────
  function updateVolume() {
    els.volumeFill.style.width  = els.volumeBar.value + "%";
    els.audio.volume = els.volumeBar.value / 100;
  }

  // ── Art display ───────────────────────────────────
  function updateArt(song) {
    const grad  = songGradient(song.id);
    const thumb = getYouTubeThumb(song.youtube, "hqdefault");

    // Gradient fallback div — always set
    if (els.nowArtBg) els.nowArtBg.style.background = grad;

    // YouTube thumbnail image
    if (els.nowArtImg) {
      if (thumb) {
        els.nowArtImg.src = thumb;
        els.nowArtImg.style.opacity = "1";
      } else {
        els.nowArtImg.src = "";
        els.nowArtImg.style.opacity = "0";
      }
    }
  }

  // ── Display update ────────────────────────────────
  function updateDisplay() {
    const song = currentSong();
    if (!song) return;

    // Number
    setTxt(els.housieNumber, toGu(state.currentHousieNumber));
    setTxt(els.numberAliases, houseNums(song.id).map(toGu).join(" · "));

    // Song info
    setTxt(els.songNameGu,  song.nameGu);
    setTxt(els.songNameHi,  song.nameHi);
    setTxt(els.songSingers, song.singers || "");

    // Combined meta line: Movie · Year · Music: Director
    const metaParts = [song.movie, song.year, song.musicBy ? "Music: " + song.musicBy : ""].filter(Boolean);
    setTxt(els.songMeta, metaParts.join(" · "));

    updateArt(song);
    renderList();
  }

  // ── Song List ─────────────────────────────────────
  function renderList() {
    const curId    = songIdFromHousie(state.currentHousieNumber);
    const playing  = state.isPlaying && !els.audio.paused;
    els.songList.innerHTML = "";

    state.songs.forEach(function (song) {
      const isActive  = song.id === curId;
      const allPlayed = houseNums(song.id).every(function (n) { return state.playedNumbers.has(n); });
      const nums      = houseNums(song.id).map(toGu).join("·");
      const grad      = songGradient(song.id);
      const thumb     = getYouTubeThumb(song.youtube, "mqdefault");

      // Index cell: speaker icon if active+playing, else track number
      const idxHTML = (isActive && playing)
        ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
        : toGu(song.id);

      // Art: <img> with gradient background as fallback (CSS bg shows if image fails)
      const artStyle = "width:46px;height:46px;border-radius:4px;object-fit:cover;display:block;background:" + grad + (thumb ? ";background-image:url(" + thumb + ");background-size:cover;background-position:center" : "");

      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "song-item" + (isActive ? " active" : "") + (allPlayed ? " played" : "");
      btn.setAttribute("role", "listitem");
      btn.setAttribute("aria-label", song.nameGu);

      btn.innerHTML =
        '<span class="song-item-idx">' + idxHTML + '</span>' +
        '<span class="song-item-art" style="' + artStyle + '" aria-hidden="true"></span>' +
        '<span class="song-item-info">' +
          '<span class="song-item-name">' + song.nameGu + '</span>' +
          '<span class="song-item-sub">' + (song.singers || "") + (song.movie ? " · " + song.movie : "") + '</span>' +
        '</span>' +
        '<span class="song-item-nums">' + nums + '</span>';

      btn.addEventListener("click", function () { playSongById(song.id); });
      els.songList.appendChild(btn);
    });

    // Scroll active row into view
    const active = els.songList.querySelector(".song-item.active");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ── Playback ──────────────────────────────────────
  function resetProgress() {
    els.progressBar.value             = 0;
    els.progressFill.style.width      = "0%";
    els.timeCurrent.textContent       = "0:00";
    els.timeTotal.textContent         = "0:00";
  }

  function loadAudio(song) {
    resetProgress();
    els.audio.src = song.audio;
    els.audio.load();
  }

  function playSongByHousie(num) {
    state.currentHousieNumber = num;
    state.playedNumbers.add(num);
    const song = currentSong();
    loadAudio(song);
    updateDisplay();
    els.audio.play()
      .then(function () {
        state.isPlaying = true;
        updatePlayBtn();
        setStatus("ચાલુ છે · " + song.nameGu);
      })
      .catch(function () {
        state.isPlaying = false;
        updatePlayBtn();
        setStatus("ઑડિયો લોડ થઈ રહ્યું નથી");
      });
  }

  function playSongById(id) { playSongByHousie(id); }

  function togglePlay() {
    if (!els.audio.src) { playSongByHousie(state.currentHousieNumber); return; }
    if (els.audio.paused) {
      els.audio.play();
      state.isPlaying = true;
      setStatus("ચાલુ છે");
    } else {
      els.audio.pause();
      state.isPlaying = false;
      setStatus("રોક્યું");
    }
    updatePlayBtn();
  }

  function updatePlayBtn() {
    const playing = state.isPlaying && !els.audio.paused;
    els.playIcon.classList.toggle("hidden", playing);
    els.pauseIcon.classList.toggle("hidden", !playing);
    renderList();
  }

  function goNext() {
    playSongByHousie(state.currentHousieNumber >= 90 ? 1 : state.currentHousieNumber + 1);
  }
  function goPrev() {
    playSongByHousie(state.currentHousieNumber <= 1 ? 90 : state.currentHousieNumber - 1);
  }

  function pickRandom() {
    const unplayed = [];
    for (let i = 1; i <= 90; i++) if (!state.playedNumbers.has(i)) unplayed.push(i);
    const pool = unplayed.length ? unplayed : Array.from({ length: 90 }, function (_, i) { return i + 1; });
    const pick  = pool[Math.floor(Math.random() * pool.length)];
    playSongByHousie(pick);
    setStatus("🎲 " + toGu(pick) + " · " + (currentSong() || {}).nameGu);
  }

  function restartGame() {
    if (!confirm("નવી રમત શરૂ કરવી? · Start a new game?")) return;
    state.playedNumbers.clear();
    state.currentHousieNumber = 1;
    state.isPlaying = false;
    els.audio.pause();
    els.audio.currentTime = 0;
    loadAudio(currentSong());
    updateDisplay();
    updatePlayBtn();
    setStatus("નવી રમત શરૂ! 🎉");
  }

  // ── Seek events ───────────────────────────────────
  function startSeek() { state.isSeeking = true; els.progressTrack.classList.add("seeking"); }
  function endSeek()   {
    state.isSeeking = false;
    els.progressTrack.classList.remove("seeking");
    seekTo(Number(els.progressBar.value));
  }

  // ── Event binding ─────────────────────────────────
  function bindEvents() {
    els.btnPlay.addEventListener("click",    togglePlay);
    els.btnNext.addEventListener("click",    goNext);
    els.btnPrev.addEventListener("click",    goPrev);
    els.btnRandom.addEventListener("click",  pickRandom);
    els.btnRestart.addEventListener("click", restartGame);
    els.volumeBar.addEventListener("input",  updateVolume);

    els.progressBar.addEventListener("pointerdown",   startSeek);
    els.progressBar.addEventListener("pointerup",     endSeek);
    els.progressBar.addEventListener("pointercancel", endSeek);
    els.progressBar.addEventListener("touchstart",    startSeek, { passive: true });
    els.progressBar.addEventListener("touchend",      endSeek);
    els.progressBar.addEventListener("change",        endSeek);
    els.progressBar.addEventListener("input", function (e) {
      const val = Number(e.target.value);
      updateProgressUI(val, duration());
      if (state.isSeeking && duration()) els.audio.currentTime = (val / PROGRESS_MAX) * duration();
    });

    els.audio.addEventListener("timeupdate",     function () { if (!state.isSeeking) syncProgress(); });
    els.audio.addEventListener("loadedmetadata", function () { els.timeTotal.textContent = formatTime(duration()); syncProgress(); });
    els.audio.addEventListener("durationchange", function () { els.timeTotal.textContent = formatTime(duration()); });
    els.audio.addEventListener("seeked",         function () { if (!state.isSeeking) syncProgress(); });
    els.audio.addEventListener("play",           function () { state.isPlaying = true;  updatePlayBtn(); });
    els.audio.addEventListener("pause",          function () { state.isPlaying = false; updatePlayBtn(); });
    els.audio.addEventListener("ended",          function () { state.isPlaying = false; updatePlayBtn(); setStatus("ગીત પૂરું થયું"); });
    els.audio.addEventListener("error",          function () { setStatus("ઑડિયો ફાઇલ મળી નહીં"); });

    // If YouTube thumb fails to load, keep the gradient fallback
    if (els.nowArtImg) {
      els.nowArtImg.addEventListener("error", function () { this.style.opacity = "0"; });
      els.nowArtImg.addEventListener("load",  function () { this.style.opacity = "1"; });
    }
  }

  // ── Init ──────────────────────────────────────────
  async function init() {
    els.app.classList.add("loading");
    try {
      const res  = await fetch("data/songs.json");
      const data = await res.json();

      if (data.event) {
        const ev = data.event;
        setTxt(els.eventBlessing, ev.blessingGu);
        setTxt(els.eventEvening,  ev.eveningGu);
        setTxt(els.eventTitle,    ev.titleGu);
        setTxt(els.eventSubtitle, ev.subtitleGu);
        setTxt(els.eventDate,     ev.dateGu);
        setTxt(els.eventHosts,    ev.hostsGu);
      }

      state.songs = data.songs;
      updateVolume();
      loadAudio(currentSong());
      updateDisplay();
      bindEvents();
      setStatus("પ્લે દબાવો · ગીત ટેપ કરો · અથવા રેન્ડમ");
    } catch (err) {
      setStatus("songs.json લોડ થઈ શક્યું નહીં");
      console.error(err);
    } finally {
      els.app.classList.remove("loading");
    }
  }

  init();
})();
