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

  // ── DOM refs ──────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  const els = {
    // Event info
    eventBlessing: el("event-blessing"),
    eventEvening:  el("event-evening"),
    eventTitle:    el("event-title"),
    eventSubtitle: el("event-subtitle"),
    eventDate:     el("event-date"),
    eventHosts:    el("event-hosts"),

    // Now-playing
    nowArtBg:     el("now-art-bg"),
    nowArtImg:    el("now-art-img"),
    nowArtWrap:   el("now-art-wrap"),
    housieNumber: el("housie-number"),
    numberAliases:el("number-aliases"),
    songNameGu:   el("song-name-gu"),
    songNameHi:   el("song-name-hi"),
    songSingers:  el("song-singers"),
    songMeta:     el("song-meta"),

    // Main progress
    progressBar:   el("progress-bar"),
    progressFill:  el("progress-fill"),
    progressTrack: el("progress-track"),
    timeCurrent:   el("time-current"),
    timeTotal:     el("time-total"),

    // Main controls
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

    // Status
    statusMsg: el("status-msg"),
    songList:  el("song-list"),
    audio:     el("audio-player"),
    app:       el("app"),
    mainScroll:el("main-scroll"),

    // Mini-player
    miniPlayer:       el("mini-player"),
    miniProgressFill: el("mini-progress-fill"),
    miniArtBg:        el("mini-art-bg"),
    miniArtImg:       el("mini-art-img"),
    miniNumber:       el("mini-number"),
    miniName:         el("mini-name"),
    miniSub:          el("mini-sub"),
    miniInfoBtn:      el("mini-info-btn"),
    miniRandom:       el("mini-random"),
    miniPrev:         el("mini-prev"),
    miniPlay:         el("mini-play"),
    miniPlayIcon:     el("mini-play-icon"),
    miniPauseIcon:    el("mini-pause-icon"),
    miniNext:         el("mini-next"),
  };

  // ── YouTube thumbnail ─────────────────────────────
  function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/[?&]v=([\w-]{11})/);
    return m ? m[1] : null;
  }

  function getYouTubeThumb(url, quality) {
    const id = getYouTubeId(url);
    if (!id) return null;
    return "https://img.youtube.com/vi/" + id + "/" + (quality || "hqdefault") + ".jpg";
  }

  // ── Gradient fallbacks ────────────────────────────
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

  // ── Utilities ─────────────────────────────────────
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

  // ── Playing state (CSS class) ─────────────────────
  // Drives: header glow, art-wrap pulse, vinyl ring, mini eq overlay
  function updatePlayingState() {
    const playing = state.isPlaying && !els.audio.paused;
    els.app.classList.toggle("is-playing", playing);
  }

  // ── Progress ──────────────────────────────────────
  function updateProgressUI(val, dur) {
    const pct = val / PROGRESS_MAX;
    if (els.progressFill)  els.progressFill.style.width  = (pct * 100) + "%";
    if (els.miniProgressFill) els.miniProgressFill.style.width = (pct * 100) + "%";
    if (dur > 0 && els.timeCurrent) els.timeCurrent.textContent = formatTime(pct * dur);
  }

  function syncProgress() {
    const dur = duration();
    if (!dur) return;
    const val = Math.round((els.audio.currentTime / dur) * PROGRESS_MAX);
    if (els.progressBar) els.progressBar.value = val;
    updateProgressUI(val, dur);
  }

  function seekTo(val) {
    const dur = duration();
    if (!dur) return;
    els.audio.currentTime = (val / PROGRESS_MAX) * dur;
    updateProgressUI(val, dur);
  }

  // ── Volume ────────────────────────────────────────
  // iOS ignores audio.volume — hardware buttons only
  const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function updateVolume() {
    if (els.volumeFill) els.volumeFill.style.width = els.volumeBar.value + "%";
    if (!isIOS) els.audio.volume = els.volumeBar.value / 100;
  }

  function setupVolumeUI() {
    if (isIOS) {
      const row = document.querySelector(".volume-row");
      if (row) row.style.display = "none";
    } else {
      updateVolume();
      els.volumeBar.addEventListener("input", updateVolume);
    }
  }

  // ── Art URL — local image first, YouTube thumb as fallback ──
  function getArtUrl(song, ytQuality) {
    return song.image || getYouTubeThumb(song.youtube, ytQuality || "hqdefault") || null;
  }

  // ── Art (main player) ─────────────────────────────
  function updateArt(song) {
    const grad = songGradient(song.id);
    const url  = getArtUrl(song, "hqdefault");
    if (els.nowArtBg)  els.nowArtBg.style.background = grad;
    if (els.nowArtImg) {
      if (url) { els.nowArtImg.src = url; els.nowArtImg.style.opacity = "1"; }
      else     { els.nowArtImg.src = "";  els.nowArtImg.style.opacity = "0"; }
    }
  }

  // ── Mini-player update ────────────────────────────
  function updateMiniPlayer() {
    const song    = currentSong();
    const playing = state.isPlaying && !els.audio.paused;

    if (!song) return;

    // Art
    const grad = songGradient(song.id);
    const url  = getArtUrl(song, "mqdefault");
    if (els.miniArtBg)  els.miniArtBg.style.background = grad;
    if (els.miniArtImg) {
      if (url) { els.miniArtImg.src = url; els.miniArtImg.style.opacity = "1"; }
      else     { els.miniArtImg.src = "";  els.miniArtImg.style.opacity = "0"; }
    }

    // Info
    setTxt(els.miniNumber, toGu(song.id));
    setTxt(els.miniName,   song.nameGu);
    setTxt(els.miniSub,    (song.singers || "") + (song.movie ? " · " + song.movie : ""));

    // Play/pause icons
    if (els.miniPlayIcon)  els.miniPlayIcon.classList.toggle("hidden",  playing);
    if (els.miniPauseIcon) els.miniPauseIcon.classList.toggle("hidden", !playing);
  }

  // ── Display update ────────────────────────────────
  function updateDisplay() {
    const song = currentSong();
    if (!song) return;

    setTxt(els.housieNumber,  toGu(song.id));
    setTxt(els.numberAliases, houseNums(song.id).map(toGu).join(" · "));
    setTxt(els.songNameGu,    song.nameGu);
    setTxt(els.songNameHi,    song.nameHi);
    setTxt(els.songSingers,   song.singers || "");

    const metaParts = [song.movie, song.year, song.musicBy ? "Music: " + song.musicBy : ""].filter(Boolean);
    setTxt(els.songMeta, metaParts.join(" · "));

    updateArt(song);
    updateMiniPlayer();
    renderList();
  }

  // ── Song List ─────────────────────────────────────
  function renderList() {
    const curId   = songIdFromHousie(state.currentHousieNumber);
    const playing = state.isPlaying && !els.audio.paused;
    els.songList.innerHTML = "";

    state.songs.forEach(function (song) {
      const isActive  = song.id === curId;
      const allPlayed = state.playedNumbers.has(song.id);
      const nums      = houseNums(song.id).map(toGu).join("·");
      const grad    = songGradient(song.id);
      const artUrl  = getArtUrl(song, "mqdefault");

      // Animated eq bars when active + playing, else number
      const idxHTML = (isActive && playing)
        ? '<span class="eq-bars"><span></span><span></span><span></span><span></span></span>'
        : toGu(song.id);

      // Art: gradient bg with local image (or YouTube thumb) on top
      const artStyle =
        "width:46px;height:46px;border-radius:4px;object-fit:cover;display:block;" +
        "background:" + grad +
        (artUrl ? ";background-image:url(" + artUrl + ");background-size:cover;background-position:center" : "");

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

    // Scroll active row into view (within song list, not page)
    const active = els.songList.querySelector(".song-item.active");
    if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ── Playback ──────────────────────────────────────
  function resetProgress() {
    if (els.progressBar)     els.progressBar.value        = 0;
    if (els.progressFill)    els.progressFill.style.width  = "0%";
    if (els.miniProgressFill)els.miniProgressFill.style.width = "0%";
    if (els.timeCurrent)     els.timeCurrent.textContent   = "0:00";
    if (els.timeTotal)       els.timeTotal.textContent     = "0:00";
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

    // Main play button icons
    if (els.playIcon)  els.playIcon.classList.toggle("hidden",  playing);
    if (els.pauseIcon) els.pauseIcon.classList.toggle("hidden", !playing);

    // Mini-player + playing state class + list re-render
    updatePlayingState();
    updateMiniPlayer();
    renderList();
  }

  function goNext() {
    playSongByHousie(state.currentHousieNumber >= 30 ? 1 : state.currentHousieNumber + 1);
  }
  function goPrev() {
    playSongByHousie(state.currentHousieNumber <= 1 ? 30 : state.currentHousieNumber - 1);
  }

  function pickRandom() {
    const unplayed = [];
    for (let i = 1; i <= 30; i++) if (!state.playedNumbers.has(i)) unplayed.push(i);
    const pool = unplayed.length ? unplayed : Array.from({ length: 30 }, function (_, i) { return i + 1; });
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

  // ── Seek ──────────────────────────────────────────
  function startSeek() { state.isSeeking = true; if (els.progressTrack) els.progressTrack.classList.add("seeking"); }
  function endSeek()   {
    state.isSeeking = false;
    if (els.progressTrack) els.progressTrack.classList.remove("seeking");
    seekTo(Number(els.progressBar.value));
  }

  // Scroll main-scroll to top (to show full player)
  function scrollToPlayer() {
    if (els.mainScroll) els.mainScroll.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Event binding ─────────────────────────────────
  function bindEvents() {
    // Tapping the header scrolls to music controls (restart btn keeps its own action)
    const topBar = document.querySelector(".top-bar");
    if (topBar) {
      topBar.addEventListener("click", function(e) {
        if (!e.target.closest("#btn-restart")) scrollToPlayer();
      });
    }

    // Main controls
    els.btnPlay.addEventListener("click",    togglePlay);
    els.btnNext.addEventListener("click",    goNext);
    els.btnPrev.addEventListener("click",    goPrev);
    els.btnRandom.addEventListener("click",  pickRandom);
    els.btnRestart.addEventListener("click", restartGame);

    // Mini-player: entire bar taps to scroll to full player;
    // control buttons stop propagation so they don't trigger the scroll
    if (els.miniPlayer) els.miniPlayer.addEventListener("click", scrollToPlayer);
    if (els.miniPlay)   els.miniPlay.addEventListener("click",   function(e) { e.stopPropagation(); togglePlay(); });
    if (els.miniNext)   els.miniNext.addEventListener("click",   function(e) { e.stopPropagation(); goNext(); });
    if (els.miniPrev)   els.miniPrev.addEventListener("click",   function(e) { e.stopPropagation(); goPrev(); });
    if (els.miniRandom) els.miniRandom.addEventListener("click", function(e) { e.stopPropagation(); pickRandom(); });
    // Mini art img fallback
    if (els.miniArtImg) {
      els.miniArtImg.addEventListener("error", function () { this.style.opacity = "0"; });
      els.miniArtImg.addEventListener("load",  function () { this.style.opacity = "1"; });
    }

    // Progress scrubber
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

    // Audio events
    els.audio.addEventListener("timeupdate",     function () { if (!state.isSeeking) syncProgress(); });
    els.audio.addEventListener("loadedmetadata", function () { if (els.timeTotal) els.timeTotal.textContent = formatTime(duration()); syncProgress(); });
    els.audio.addEventListener("durationchange", function () { if (els.timeTotal) els.timeTotal.textContent = formatTime(duration()); });
    els.audio.addEventListener("seeked",         function () { if (!state.isSeeking) syncProgress(); });
    els.audio.addEventListener("play",           function () { state.isPlaying = true;  updatePlayBtn(); });
    els.audio.addEventListener("pause",          function () { state.isPlaying = false; updatePlayBtn(); });
    els.audio.addEventListener("ended",          function () { state.isPlaying = false; updatePlayBtn(); setStatus("ગીત પૂરું થયું"); });
    els.audio.addEventListener("error",          function () { setStatus("ઑડિયો ફાઇલ મળી નહીં"); });

    // Main art image fallback
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
      setupVolumeUI();
      loadAudio(currentSong());
      updateDisplay();
      bindEvents();
      setStatus("");
    } catch (err) {
      setStatus("songs.json લોડ થઈ શક્યું નહીં");
      console.error(err);
    } finally {
      els.app.classList.remove("loading");
    }
  }

  init();
})();
