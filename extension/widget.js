// Prevent multiple widgets per tab
if (!window.__ytm_widget_initialized__) {
  window.__ytm_widget_initialized__ = true;

  // --- Styles ---
  const style = document.createElement("style");
  style.textContent = `
  .ytm-widget {
    position: fixed; inset: auto 12px 12px auto;
    z-index: 999999;
    width: 280px; height: 64px;
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px;
    background: rgba(20,20,20,0.9);
    color: #fff;
    backdrop-filter: blur(8px);
    border-radius: 999px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.25);
    user-select: none;
    cursor: grab;
    overflow: hidden;
    transition: transform 0.2s ease, right 0.2s ease, left 0.2s ease, top 0.2s ease, bottom 0.2s ease, opacity 0.2s ease;
  }
  .ytm-widget:active { cursor: grabbing; }
  .ytm-cover {
    width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex: none;
    background: #333;
  }
  .ytm-cover img { width: 100%; height: 100%; object-fit: cover; display:block;cursor:pointer; }
  .ytm-meta { flex: 1; min-width: 0; }
  .ytm-title { font-size: 13px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ytm-artist { font-size: 11px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ytm-controls { display: flex; gap: 8px; align-items: center; }
  .ytm-btn {
    width: 28px; height: 28px; border-radius: 999px; background: rgba(255,255,255,0.1);
    display: grid; place-items: center; border: none; color: white; cursor: pointer;
  }
  .ytm-btn:hover { background: rgba(255,255,255,0.18); }
  .right-container { display: flex;flex-direction: column; }
  #lyrics { display: none; width: 100%; height: 200px; background: transparent; }
  #lyricsCanvas { width: 100%; height: 100%; }
  `;
  document.documentElement.appendChild(style);

  // --- UI ---
  const wrap = document.createElement("div");
  wrap.className = "ytm-widget";
  wrap.innerHTML = `
    <div class="ytm-cover"><img id="ytmWImg" alt="" /></div>
    <div class="right-container" id="right-container">
      <div class="ytm-meta">
        <div class="ytm-title" id="ytmWTitle">Not playing</div>
        <div class="ytm-artist" id="ytmWArtist">—</div>
      </div>
      <div class="ytm-controls">
        <button class="ytm-btn" id="ytmPrev" title="Previous">⏮︎</button>
        <button class="ytm-btn" id="ytmPlay" title="Play/Pause">▶︎</button>
        <button class="ytm-btn" id="ytmNext" title="Next">⏭︎</button>
      </div>
     
    </div>
   
    <div id="lyrics"><canvas id="lyricsCanvas" width="280" height="200"></canvas></div>
  `;
  document.body.appendChild(wrap);

  const els = {
    img: wrap.querySelector("#ytmWImg"),
    title: wrap.querySelector("#ytmWTitle"),
    artist: wrap.querySelector("#ytmWArtist"),
    prev: wrap.querySelector("#ytmPrev"),
    play: wrap.querySelector("#ytmPlay"),
    next: wrap.querySelector("#ytmNext"),
  };

  // --- Drag + snap ---
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  const STORAGE_KEY = "ytm_widget_pos";

  function loadPos() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }
  function savePos(pos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      chrome.runtime.sendMessage({ type: "widget:position", data: pos });
    } catch {}
  }
  function applyPos(pos) {
    wrap.style.left = pos.left + "px";
    wrap.style.top = pos.top + "px";
    wrap.style.right = "auto"; wrap.style.bottom = "auto";
  }
  const saved = loadPos(); if (saved) applyPos(saved);

  function snapToEdge() {
    const pad = 12, rect = wrap.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    let x = Math.max(pad, Math.min(vw - rect.width - pad, rect.left));
    let y = Math.max(pad, Math.min(vh - rect.height - pad, rect.top));
    wrap.style.left = x + "px"; wrap.style.top = y + "px";
    savePos({ left: x, top: y });
  }

  wrap.addEventListener("pointerdown", e => {
    if (e.target.closest(".ytm-controls")) return;
    dragging = true; startX = e.clientX; startY = e.clientY;
    const r = wrap.getBoundingClientRect(); startLeft = r.left; startTop = r.top;
    e.preventDefault();
  });
  window.addEventListener("pointermove", e => {
    if (!dragging) return;
    wrap.style.left = startLeft + (e.clientX - startX) + "px";
    wrap.style.top = startTop + (e.clientY - startY) + "px";
  });
  window.addEventListener("pointerup", () => { if (dragging) { dragging = false; snapToEdge(); } });
  window.addEventListener("resize", snapToEdge);

  // --- Player control messaging ---
  function control(action) {
    chrome.runtime.sendMessage({ type: "widget:control", action });
  }
  els.prev.addEventListener("click", () => control("prevSong"));
  els.play.addEventListener("click", () => control("play_pause"));
  els.next.addEventListener("click", () => control("nextSong"));

  // --- Lyrics canvas animation ---
  const canvas = document.getElementById("lyricsCanvas");
  const ctx = canvas.getContext("2d");
  let currentPlay = 0; // seconds from YouTube
let lyrics = [];
let currentLine = 0;
let scrollY = 0;

function startLyrics(raw) {
  // parse [mm:ss.xx] lyric format → [{time,text}]
  lyrics = raw.split("\n").map(line => {
    const m = line.match(/\[(\d+):(\d+).(\d+)\](.*)/);
    if (!m) return null;
    return {
      time: parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100,
      text: m[4].trim()
    };
  }).filter(Boolean);

  currentLine = 0;
  scrollY = 0; // smooth scroll offset
  requestAnimationFrame(drawLyrics);
}

function drawLyrics() {
  const now = parseTimeString(currentPlay)+1  ; // <-- use YouTube's current playback time

  // find current line index
  for (let i = 0; i < lyrics.length; i++) {
   
    if (lyrics[i].time <= now && (i === lyrics.length - 1 || lyrics[i + 1].time > now)) {
      currentLine = i;
      break;
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.textAlign = "center";
  ctx.font = "18px sans-serif";

  // --- Smooth scroll effect ---
  const targetY = currentLine * 40; // 40px per line
  scrollY += (targetY - scrollY) * 0.08; // easing for smoothness

  // Draw all lines with fade + highlight current
  lyrics.forEach((line, i) => {
    const y = cy + (i * 40 - scrollY);
    const dist = Math.abs(i - currentLine);
    let alpha = Math.max(0, 1 - dist * 0.6); // fade other lines
    if (dist === 0) alpha = 1; // highlight current line
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;

    if (dist === 0) {
      ctx.font = "bold 16px sans-serif"; // current line bigger/bold
    } else {
      ctx.font = "14px sans-serif";
    }

    const maxWidth = canvas.width * 0.85; // 85% of canvas width
    const lineHeight = 24;
    wrapText(ctx, line.text, cx, y, maxWidth, lineHeight);
    
  });

  requestAnimationFrame(drawLyrics);
}

  // --- Toggle UI / Lyrics ---
  let isLyricsOpen = false;
  els.img.addEventListener("click", () => {
    const lyricsDiv = wrap.querySelector("#lyrics");
    const rightDiv = wrap.querySelector("#right-container");
    // const favDiv = wrap.querySelector(".fav-songs");
    if (!isLyricsOpen) {

       lyricsDiv.style.display="block"; rightDiv.style.display="none"; 
      //  favDiv.style.display="none";
      chrome.runtime.sendMessage({ type: "widget:lyrics", data: true });
      startLyrics(currentLyricsRaw || `[00:00.00] No lyrics found`);
      isLyricsOpen = true;
    } else {
      lyricsDiv.style.display="none"; rightDiv.style.display="block";
      // favDiv.style.display="flex";
      isLyricsOpen = false;
    }
  });

  // --- Update song + lyrics from background ---
  let currentLyricsRaw = "";
  function updateSong(d) {
    if (!d) return;
    els.title.textContent = d.title || "Unknown";
    els.artist.textContent = d.artist || "Unknown";
    if (d.image) els.img.src = d.image;
    els.play.innerHTML = d.playing ? "⏸︎" : "▶︎";
    if (d.lyrics) currentLyricsRaw = d.lyrics;
    if(d.slider) currentPlay = d.slider;
    console.log("currentPlay",currentPlay);
    
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "songUpdate") updateSong(msg.data);
    if (msg.type === "position") applyPos(msg.data);
    if (msg.type === "lyrics") {currentLyricsRaw = msg.data;console.log("lyrics",msg.data);startLyrics(msg.data);
  
    };
  });

  chrome.runtime.sendMessage({ type: "widget:requestSync" }, res => {
    if (res?.ok && res.data) updateSong(res.data);
  });
}



function parseTimeString(str) {
  const m = str.match(/(\d+)\s*Minutes?\s*(\d+)\s*Seconds?/i);
  if (!m) return 0;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line);
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  for (let j = 0; j < lines.length; j++) {
    ctx.fillText(lines[j], x, y + j * lineHeight);
  }

  return lines.length * lineHeight; // return how tall it was
}
