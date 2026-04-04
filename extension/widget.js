if (!window.__ytm_widget_initialized__) {
  window.__ytm_widget_initialized__ = true;

  const host = document.createElement("div");
  host.id = "ytm-widget-root";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { 
      position: fixed; z-index: 99999999; 
      width: 155px; height: 50px;
      --fg: #ffffff; --bg-mini: #222; --bg-expanded: #121212;
      --brightness-overlay: rgba(0,0,0,0);
      --accent-color: #4285f4;
      left: calc(100vw - 175px); top: calc(100vh - 70px);
      transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), 
                  height 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
                  left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), 
                  top 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
      touch-action: none; user-select: none;
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      transform-origin: center center;
    }
    :host(.is-expanded) { width: 310px; height: 235px; }
    :host(.lyrics-mini) { width: 240px; height: 50px; }

    .widget {
      all: initial; display: flex; align-items: center; padding: 6px;
      background: var(--bg-mini); color: var(--fg); border-radius: 28px;
      box-shadow: 0 12px 45px rgba(0,0,0,0.6); backdrop-filter: blur(30px);
      width: 100%; height: 100%; box-sizing: border-box; overflow: hidden; 
      cursor: pointer; position: relative; border: 1.5px solid rgba(255,255,255,0.2);
      transition: background 0.6s ease, border-radius 0.5s ease;
    }
    
    .widget::before {
        content: ''; position: absolute; inset: 0; 
        background: var(--brightness-overlay); z-index: 1; pointer-events: none;
    }

    :host(.is-expanded) .widget { border-radius: 35px; background: var(--bg-expanded); }
    .bg-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1s ease; z-index: 0; pointer-events: none; }
  /* Clear image, slight darken */
:host(.is-expanded) .bg-art { opacity: 1; filter: brightness(0.5); }

    /* TABS */
    .nav-tabs { 
      position: absolute; top: 14px; right: 14px; display: none; 
      gap: 6px; z-index: 100; background: rgba(255,255,255,0.08); 
      padding: 4px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
    }
    :host(.is-expanded) .nav-tabs { display: flex; }
    .tab-btn { 
      width: 28px; height: 28px; border-radius: 50%; border: none; 
      background: transparent; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 13px;
      transition: 0.2s;
    }
    .tab-btn.active { background: var(--fg); color: var(--bg-expanded); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }

    /* MINI PLAYER CONTENT - FIXED LAYOUT */
    .mini-player-content { 
      display: flex; align-items: center; z-index: 5; width: 100%; 
      gap: 8px; padding: 0 4px; position: relative; height: 100%;
    }
    :host(.is-expanded) .mini-player-content,
    :host(.lyrics-mini) .mini-player-content { display: none !important; }

    .mini-art { 
      width: 38px; height: 38px; border-radius: 50%; 
      border: 2px solid var(--fg); overflow: hidden; 
      flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3); 
    }
    .mini-art img { width: 100%; height: 100%; object-fit: cover; }
    
    .mini-control-zone { 
      display: flex; align-items: center; justify-content: center;
      gap: 3px; height: 38px; flex-grow: 1;
      position: relative; cursor: pointer; z-index: 10;
    }
    .mini-action-icon { 
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.5); 
      opacity: 0; transition: 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      font-size: 22px; font-weight: bold; z-index: 20; color: #fff; text-shadow: 0 0 12px rgba(0,0,0,1);
    }
    .mini-flashing .mini-action-icon { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
    .mini-flashing .bar-container { opacity: 0; }

    .bar-container { display: flex; align-items: center; gap: 4px; transition: opacity 0.3s; }
    .bar { width: 3px; background: var(--fg); border-radius: 3px; height: 6px; transition: background 0.5s; }
    .playing .bar { animation: bar-dance 0.8s infinite ease-in-out; }
    .bar:nth-child(2), .bar:nth-child(4) { height: 14px; animation-delay: 0.15s; }
    .bar:nth-child(3) { height: 20px; animation-delay: 0.3s; }
    @keyframes bar-dance { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.7); } }

    .drag-handle { 
      cursor: grab; opacity: 0.6; font-size: 20px; 
      color: var(--fg); width: 30px; height: 38px; 
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .drag-handle:active { cursor: grabbing; }

    /* MINI LYRICS CONTENT - BOTTOM-UP ANIMATION */
    .mini-lyrics-content {
        display: none; align-items: center; justify-content: center;
        width: 100%; height: 100%; z-index: 5; padding: 0 20px;
        font-size: 14px; font-weight: 600; text-align: center;
        color: var(--fg); overflow: hidden;
    }
    :host(.lyrics-mini) .mini-lyrics-content { display: flex; }
    
    .mini-lyrics-content span {
        display: inline-block;
        animation: lyricSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes lyricSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* EXPANDED UI */
    .page { display: none; flex-direction: column; width: 100%; z-index: 5; padding: 18px 22px; box-sizing: border-box; }
    :host(.is-expanded) .page.active { display: flex; }

    .title { font-size: 18px; font-weight: 800; color: var(--fg); margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .artist { font-size: 14px; opacity: 0.7; color: var(--fg); margin-bottom: 8px; }
    
    .seekbar-row { display: flex; align-items: center; width: 100%; height: 50px; margin-top: 5px; position: relative; z-index: 10; }
    .seekbar-wrap { flex-grow: 1; height: 100%; position: relative; cursor: pointer; }
    canvas#waveCanvas { width: 100%; height: 100%; pointer-events: none; }
    
    .wave-flash-icon { 
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.5); 
      opacity: 0; font-size: 28px; transition: 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      pointer-events: none; z-index: 15; color: var(--fg); text-shadow: 0 0 20px rgba(0,0,0,0.8);
    }
    .wave-flashing .wave-flash-icon { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
    .wave-flashing canvas { opacity: 0.15; filter: blur(2px); }

    .controls-row { display: flex; align-items: center; justify-content: space-between; margin-top: 15px; position: relative; z-index: 20; }
    .btn-group { display: flex; gap: 16px; flex-grow: 1; justify-content: center; padding-left: 30px;}
    .btn { 
      background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.2); 
      color: var(--fg); cursor: pointer; width: 46px; height: 46px; border-radius: 50%; 
      display: flex; align-items: center; justify-content: center; font-size: 22px;
      transition: all 0.2s;
    }
    .btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }
    .btn:active { transform: scale(0.9); }
    .btn#play { background: var(--fg); color: var(--bg-expanded); border: none; }

    /* LYRIC ANIMATION */
    #page-lyrics { 
        overflow-y: auto; max-height: 160px; font-size: 15px; 
        text-align: center; color: var(--fg); line-height: 1.8; position: relative;
        scrollbar-width: none; mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
    }
    .refresh-btn {
        position: absolute; top: 0px; right: 0px; 
        background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;
        width: 26px; height: 26px; color: var(--fg); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.4s ease, background 0.2s; z-index: 20;
    }
    .refresh-btn:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }
    .lyric-line { 
        opacity: 0.3; transform: scale(0.95); transition: 0.4s all ease; 
        margin-bottom: 8px; font-weight: 400;
    }
    .lyric-line.active { 
        opacity: 1; transform: scale(1); font-weight: 700; 
        text-shadow: 0 0 20px var(--fg);
    }
    .lyric-line.passed { opacity: 0.5; transform: scale(0.98); }
    
    @keyframes lyricFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    /* QUEUE PAGE / EXPLORE PAGE */
    #page-queue { 
        overflow-y: hidden; display: none; flex-direction: column; max-height: 180px; font-size: 13px; 
        color: var(--fg); padding: 5px 0;
    }
    :host(.is-expanded) #page-queue.active { display: flex; }
    
    .explore-subtabs {
        display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; flex-shrink: 0;
        padding-bottom: 8px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .subtab-pill {
        padding: 6px 12px; background: rgba(255,255,255,0.05); border-radius: 14px;
        font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
        transition: all 0.2s; border: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
    }
    .subtab-pill:hover { background: rgba(255,255,255,0.15); }
    .subtab-pill.active { background: var(--fg); color: var(--bg-expanded); }

    #queue-content {
        overflow-y: auto; scrollbar-width: none; flex-grow: 1; padding-bottom: 20px;
        mask-image: linear-gradient(to bottom, transparent, black 5%, black 85%, transparent);
    }
    
    .queue-item { 
        display: flex; align-items: center; padding: 6px 8px; 
        margin-bottom: 6px; border-radius: 8px; cursor: pointer;
        background: rgba(255,255,255,0.08); transition: all 0.2s; border: 1px solid rgba(255,255,255,0.05);
    }
    .queue-item:hover { background: rgba(255,255,255,0.2); transform: scale(1.02); }
    .queue-idx { width: 24px; font-weight: bold; opacity: 0.6; flex-shrink: 0; text-align: center; }
    .queue-details { display: flex; flex-direction: column; overflow: hidden; white-space: nowrap; flex-grow: 1; margin-left: 6px; }
    .queue-title { text-overflow: ellipsis; overflow: hidden; font-weight: 600; }
    .queue-artist { font-size: 11px; opacity: 0.6; text-overflow: ellipsis; overflow: hidden; }
  `;
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "widget";
  wrap.innerHTML = `
    <img id="bg-art" class="bg-art" />
    <div class="nav-tabs">
        <button class="tab-btn active" data-page="player"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-disc3-icon lucide-disc-3"><circle cx="12" cy="12" r="10"/><path d="M6 12c0-1.7.7-3.2 1.8-4.2"/><circle cx="12" cy="12" r="2"/><path d="M18 12c0 1.7-.7 3.2-1.8 4.2"/></svg></button>
        <button class="tab-btn" data-page="lyrics"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-vocal-icon lucide-mic-vocal"><path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12"/><path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"/><circle cx="16" cy="7" r="5"/></svg></button>
        <button class="tab-btn" data-page="queue"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-music"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg></button>
        <button class="search-trigger-btn" id="btn-search" style="background:transparent;border:none;color:inherit;cursor:pointer;opacity:0.5;transition:0.2s;display:flex;align-items:center;justify-content:center;padding:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
    </div>

    <div class="mini-player-content">
        <div class="mini-art"><img id="img-mini" /></div>
        <div class="mini-control-zone" id="mini-control-zone">
            <div class="mini-action-icon" id="miniFlash">▶</div>
            <div class="bar-container" id="barBox">
                <div class="bar"></div><div class="bar"></div><div class="bar-container" style="display:contents"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>
            </div>
        </div>
        <div class="drag-handle" id="handle">⠿</div>
    </div>

    <div class="mini-lyrics-content" id="mini-lyric-text"><span>...</span></div>

    <div class="page active" id="page-player">
        <div class="title" id="title">...</div>
        <div class="artist" id="artist">...</div>
        <div class="seekbar-row" id="wave-zone">
            <div class="wave-flash-icon" id="waveFlash">▶</div>
            <div class="seekbar-wrap" id="seekbar"><canvas id="waveCanvas"></canvas></div>
        </div>
        <div class="controls-row">
            <div class="btn-group">
                <button class="btn" id="prev">⏮</button>
                <button class="btn" id="play">▶</button>
                <button class="btn" id="next">⏭</button>
            </div>
            <div class="drag-handle" id="handle-exp">⠿</div>
        </div>
    </div>
    <div class="page" id="page-lyrics">
        <button id="refresh-lyrics" class="refresh-btn" title="Refresh Lyrics">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <div id="lyrics-content"></div>
    </div>
    <div class="page" id="page-queue">
        <div class="explore-subtabs" id="explore-tabs">
            <div class="subtab-pill active" data-sub="Up Next">Up Next</div>
            <!-- Dynamic shelves will go here -->
        </div>
        <div id="queue-content">Loading queue...</div>
    </div>
  `;
  shadow.appendChild(wrap);
// 1. Add these variables at the top of your script (near isPlaying)
let preExpandedPos = null;
let savedMiniPosition = null;

// 2. Update your initialization function at the bottom
const initializeWidget = () => {
  // 1. Temporarily kill transitions so it doesn't "slide" into place on load
  host.style.transition = 'none';

  const winW = window.innerWidth || document.documentElement.clientWidth;
  const winH = window.innerHeight || document.documentElement.clientHeight;
  const padding = 10;
  
  const startLeft = winW - 155 - padding;
  const startTop = winH - 50 - padding;

  // 2. Set the position instantly
  host.style.left = `${startLeft}px`;
  host.style.top = `${startTop}px`;

  // 3. Populate memory so the first shrink knows where to go
  savedMiniPosition = { left: startLeft, top: startTop };
  preExpandedPos = { left: `${startLeft}px`, top: `${startTop}px` };

  // 4. Force a "reflow" (tells the browser to apply the 0,0-transition-less state now)
  host.offsetHeight; 

  // 5. Re-enable transitions for future expands/shrinks
  host.style.transition = ''; 
  host.style.visibility = "visible";
};

initializeWidget();
let draggedWhileExpanded = false;
  let isPlaying = false, currentProgress = 0, activePage = 'player', phase = 0;
  let currentSongID = "", currentTimeSeconds = 0, songDurationSeconds = 0;
  let parsedLyrics = []; // Array of {time: seconds, text: line}
  const waveCvs = shadow.getElementById("waveCanvas"), waveCtx = waveCvs.getContext("2d");
  
  // Position memory - save position and current size BEFORE expanding

  let savedMiniSize = null; // Track the size when we saved the position

  // --- LYRIC PARSER & SYNC ENGINE ---
  const parseLRC = (lrcText) => {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const parsed = [];
    
    lines.forEach(line => {
      const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const centiseconds = match[3] ? parseInt(match[3]) : 0;
        const text = match[4].trim();
        const totalSeconds = minutes * 60 + seconds + centiseconds / 100;
        if (text) parsed.push({ time: totalSeconds, text });
      }
    });
    
    return parsed.sort((a, b) => a.time - b.time);
  };

  const updateLyricDisplay = () => {
    if (parsedLyrics.length === 0) return;
    
    const container = shadow.getElementById("lyrics-content");
    const miniLyric = shadow.getElementById("mini-lyric-text");
    let activeIndex = -1;
    
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if ((currentTimeSeconds +0.5) >= parsedLyrics[i].time) {
        activeIndex = i;
        break;
      }
    }
    
    const lineElements = container.querySelectorAll('.lyric-line');
    lineElements.forEach((el, idx) => {
      el.classList.remove('active', 'passed');
      if (idx === activeIndex) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (idx < activeIndex) {
        el.classList.add('passed');
      }
    });
    
    if (activeIndex >= 0 && parsedLyrics[activeIndex]) {
      const newText = parsedLyrics[activeIndex].text;
      const currentText = miniLyric.querySelector('span')?.textContent || '';
      
      if (newText !== currentText) {
        miniLyric.innerHTML = `<span>${newText}</span>`;
      }
    }
  };

  const animateLyrics = (text) => {
    const container = shadow.getElementById("lyrics-content");
    container.innerHTML = "";
    
    if (!text) { 
      container.innerText = "Instrumental or No Lyrics Found"; 
      parsedLyrics = [];
      shadow.getElementById("mini-lyric-text").innerHTML = "<span>No lyrics</span>";
      return; 
    }

    parsedLyrics = parseLRC(text);
    
    if (parsedLyrics.length > 0) {
      parsedLyrics.forEach((lyric, i) => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        div.innerText = lyric.text;
        div.dataset.time = lyric.time;
        container.appendChild(div);
      });
      updateLyricDisplay();
    } else {
      parsedLyrics = [];
      const lines = text.split('\n').filter(l => l.trim());
      lines.forEach((line, i) => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        div.innerText = line;
        container.appendChild(div);
        setTimeout(() => div.classList.add('active'), i * 150);
      });
      shadow.getElementById("mini-lyric-text").innerHTML = `<span>${lines[0] || "..."}</span>`;
    }
  };

  // --- THEME & VISIBILITY ---
  const updateTheme = (src) => {
    let hd = src.includes('googleusercontent.com') ? src.split('=')[0] + '=s800-c' : src;
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = hd;
    img.onload = () => {
      const c = document.createElement("canvas"); const x = c.getContext("2d");
      c.width = 40; c.height = 40; x.drawImage(img, 0, 0, 40, 40);
      const data = x.getImageData(0, 0, 40, 40).data;
      let rSum=0, gSum=0, bSum=0;
      for (let i = 0; i < data.length; i += 4) { rSum += data[i]; gSum += data[i+1]; bSum += data[i+2]; }
      const avgV = (rSum + gSum + bSum) / ( (data.length/4) * 3);

      host.style.setProperty('--brightness-overlay', avgV > 170 ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)');
      host.style.setProperty('--bg-mini', `rgb(${rSum/(data.length/4)}, ${gSum/(data.length/4)}, ${bSum/(data.length/4)})`);
      host.style.setProperty('--bg-expanded', `rgb(${(rSum/(data.length/4))*0.15}, ${(gSum/(data.length/4))*0.15}, ${(bSum/(data.length/4))*0.15})`);
      host.style.setProperty('--fg', avgV > 200 ? '#111' : '#fff');

      shadow.getElementById("bg-art").src = hd; shadow.getElementById("img-mini").src = hd;
    };
  };

  // --- ORIGINAL WAVE (WHITE) ---
  const drawWave = () => {
    if (!host.classList.contains('is-expanded') || activePage !== 'player') return;
    const w = waveCvs.offsetWidth, h = waveCvs.offsetHeight;
    if (waveCvs.width !== w) { waveCvs.width = w; waveCvs.height = h; }
    waveCtx.clearRect(0, 0, w, h);
    const midY = h / 2, progX = w * currentProgress;
    const fg = getComputedStyle(host).getPropertyValue('--fg');
    
    // Background line
    waveCtx.beginPath(); 
    waveCtx.strokeStyle = 'rgba(255,255,255,0.1)'; 
    waveCtx.lineWidth = 2;
    waveCtx.moveTo(0, midY); 
    waveCtx.lineTo(w, midY); 
    waveCtx.stroke();

    // Active wave
    waveCtx.beginPath(); 
    waveCtx.strokeStyle = fg;
    waveCtx.lineWidth = 4; 
    waveCtx.lineCap = 'round';
    
    for (let x = 0; x <= progX; x += 2) {
      const env = Math.sin((x / (progX || 1)) * Math.PI); 
      const y = midY + Math.sin(x * 0.3 - phase) * (isPlaying ? 5 : 1) * env;
      x === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
    }
    waveCtx.stroke();
    
    // Progress dot
    waveCtx.beginPath(); 
    waveCtx.fillStyle = fg;
    waveCtx.arc(progX, midY, 6, 0, 7); 
    waveCtx.fill();
    
    phase += isPlaying ? 0.1 : 0.02;
    requestAnimationFrame(drawWave);
  };

  // --- GET CURRENT SIZE BASED ON STATE ---
  const getCurrentSize = () => {
    if (host.classList.contains('is-expanded')) {
      return { width: 310, height: 235 };
    } else if (host.classList.contains('lyrics-mini')) {
      return { width: 240, height: 50 };
    } else {
      return { width: 155, height: 50 };
    }
  };

  // --- FIXED POSITION MANAGEMENT WITH PROPER CENTER CALCULATION ---
// --- FIXED POSITION MANAGEMENT ---
const adjustPositionForExpansion = (isExpanding) => {
  const currentRect = host.getBoundingClientRect();
  
  // 1. Determine exactly how wide we are going to be
  let targetWidth, targetHeight;
  if (isExpanding) {
    targetWidth = 310;
    targetHeight = 235;
  } else {
    // Determine which mini mode we are returning to
    if (activePage === 'lyrics') {
      targetWidth = 240; // Lyrics mini width
      targetHeight = 50;
    } else {
      targetWidth = 155; // Player mini width
      targetHeight = 50;
    }
  }

  if (isExpanding) {
    // SAVE the current style positions before growing
    preExpandedPos = { left: host.style.left, top: host.style.top };
    draggedWhileExpanded = false;

    const centerX = currentRect.left + (currentRect.width / 2);
    const centerY = currentRect.top + (currentRect.height / 2);

    let newLeft = centerX - (targetWidth / 2);
    let newTop = centerY - (targetHeight / 2);

    // Apply viewport constraint for Expanded state
    const maxLeft = window.innerWidth - targetWidth - 10;
    const maxTop = window.innerHeight - targetHeight - 10;
    
    host.style.left = Math.max(10, Math.min(newLeft, maxLeft)) + "px";
    host.style.top = Math.max(10, Math.min(newTop, maxTop)) + "px";

  } else {
    // --- SHRINKING ---
    let finalLeft, finalTop;

    if (!draggedWhileExpanded && preExpandedPos) {
      // Use the saved position
      finalLeft = parseFloat(preExpandedPos.left);
      finalTop = parseFloat(preExpandedPos.top);
    } else {
      // Use the center-point math
      const centerX = currentRect.left + (currentRect.width / 2);
      const centerY = currentRect.top + (currentRect.height / 2);
      finalLeft = centerX - (targetWidth / 2);
      finalTop = centerY - (targetHeight / 2);
    }

    // 2. CRITICAL FIX: Re-run constraint check using the TARGET width
    // This prevents the "lyrics-mini" from clipping the right/bottom edges
    const maxLeft = window.innerWidth - targetWidth - 10;
    const maxTop = window.innerHeight - targetHeight - 10;

    host.style.left = Math.max(10, Math.min(finalLeft, maxLeft)) + "px";
    host.style.top = Math.max(10, Math.min(finalTop, maxTop)) + "px";
  }
};

  // --- DRAG LOGIC WITH BOUNDARIES ---
  // How close (in pixels) the widget needs to be to the edge to "snap"
  const SNAP_THRESHOLD = 40;
  let isDragging = false, hasMoved = false, startX, startY, dragStartPos = { left: 0, top: 0 };
  
  const constrainPosition = (left, top) => {
    const size = getCurrentSize();
    const padding = 10; // Your standard gap from the edge
    const maxLeft = window.innerWidth - size.width - padding;
    const maxTop = window.innerHeight - size.height - padding;
    
    let finalLeft = left;
    let finalTop = top;

    // Horizontal Snapping
    if (left < padding + SNAP_THRESHOLD) finalLeft = padding; // Snap Left
    else if (left > maxLeft - SNAP_THRESHOLD) finalLeft = maxLeft; // Snap Right

    // Vertical Snapping
    if (top < padding + SNAP_THRESHOLD) finalTop = padding; // Snap Top
    else if (top > maxTop - SNAP_THRESHOLD) finalTop = maxTop; // Snap Bottom

    // Boundary Hard-Stop (Safety)
    return {
      left: Math.max(padding, Math.min(finalLeft, maxLeft)),
      top: Math.max(padding, Math.min(finalTop, maxTop))
    };
  };
  
  const onDown = (e) => {
    isDragging = true; 
    hasMoved = false;
    startX = e.clientX; 
    startY = e.clientY;
    const r = host.getBoundingClientRect(); 
    dragStartPos.left = r.left; 
    dragStartPos.top = r.top;
    host.style.transition = "none"; 
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  
  shadow.querySelectorAll('.drag-handle').forEach(h => h.onpointerdown = onDown);
  
  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    if (host.classList.contains('is-expanded')) {
      draggedWhileExpanded = true; 
    }
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
    
    const newPos = constrainPosition(dragStartPos.left + dx, dragStartPos.top + dy);
    host.style.left = newPos.left + "px"; 
    host.style.top = newPos.top + "px";
  });
  
  window.addEventListener("pointerup", () => {
    if (!isDragging) return; 
    
    // Update saved position after dragging in mini mode
    if (!host.classList.contains('is-expanded')) {
      const rect = host.getBoundingClientRect();
      savedMiniPosition = { left: rect.left, top: rect.top };
      savedMiniSize = { width: rect.width, height: rect.height };
    }
    
    isDragging = false;
    host.style.transition = "all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)";
    setTimeout(() => { hasMoved = false; }, 100);
  });

  // --- CONTROL COLLISION FIX ---
  let isScrubbing = false; 
  const triggerFlash = (containerId, iconId, action) => {
    if (isScrubbing) return;
    const el = shadow.getElementById(containerId);
    const ic = shadow.getElementById(iconId);
    ic.textContent = action === "nextSong" ? "⏭" : (isPlaying ? "⏸" : "▶");
    el.classList.add(containerId === 'wave-zone' ? 'wave-flashing' : 'mini-flashing');
    chrome.runtime.sendMessage({ type: "widget:control", action });
    setTimeout(() => el.classList.remove(containerId === 'wave-zone' ? 'wave-flashing' : 'mini-flashing'), 600);
  };

  // Mini Controls
  let miniClickTimer = null;
  shadow.getElementById("mini-control-zone").onclick = (e) => {
      if (host.classList.contains('is-expanded')) return;
      e.stopPropagation();
      if (miniClickTimer) {
          clearTimeout(miniClickTimer); miniClickTimer = null;
          triggerFlash("mini-control-zone", "miniFlash", "nextSong");
      } else {
          miniClickTimer = setTimeout(() => {
              triggerFlash("mini-control-zone", "miniFlash", "play_pause");
              miniClickTimer = null;
          }, 250);
      }
  };

  // Expanded Seekbar
  let waveClickTimer = null;
  let seekbarInteractionStarted = false;
  
  shadow.getElementById("seekbar").onpointerdown = (e) => {
    e.stopPropagation();
    
    seekbarInteractionStarted = false;
    isScrubbing = false;
    
    const r = shadow.getElementById("seekbar").getBoundingClientRect();
    let hasDragged = false;
    
    const onMove = (ev) => {
      if (!hasDragged) {
        hasDragged = true;
        seekbarInteractionStarted = true;
      }
      isScrubbing = true;
      currentProgress = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    };
    
 // Inside shadow.getElementById("seekbar").onpointerdown ...
const onUp = (ev) => {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  
  if (hasDragged || !isScrubbing) {
    // 1. Calculate the final percentage (0.0 to 1.0)
    const r = shadow.getElementById("seekbar").getBoundingClientRect();
    const finalProgress = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    
    // 2. SEND THE MESSAGE to background.js
    // We use "slider" as the action to match your content script switch case
    chrome.runtime.sendMessage({ 
      type: "widget:control", 
      action: "slider", 
      data: finalProgress 
    });

    // 3. Brief delay before allowing songUpdates to move the slider again
    setTimeout(() => { isScrubbing = false; }, 150);
  }
};
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Wave zone click
  shadow.getElementById("wave-zone").onclick = (e) => {
    if (e.target.closest("#seekbar") || isScrubbing || seekbarInteractionStarted) {
      seekbarInteractionStarted = false;
      return;
    }
    
    e.stopPropagation();
    
    if (waveClickTimer) {
      clearTimeout(waveClickTimer);
      waveClickTimer = null;
      triggerFlash("wave-zone", "waveFlash", "nextSong");
    } else {
      waveClickTimer = setTimeout(() => {
        triggerFlash("wave-zone", "waveFlash", "play_pause");
        waveClickTimer = null;
      }, 250);
    }
  };

  // Main Toggle
  wrap.onclick = (e) => {
    if (hasMoved || e.target.closest(".btn") || e.target.closest(".tab-btn") || 
        e.target.closest("#wave-zone") || e.target.closest(".drag-handle") || 
        e.target.closest("#mini-control-zone")) return;
    
    const isExpanding = !host.classList.contains('is-expanded');
    
    // Adjust position before toggling class
    adjustPositionForExpansion(isExpanding);
    
    // Toggle classes
    host.classList.toggle('is-expanded');
    host.classList.toggle('lyrics-mini', !isExpanding && activePage === 'lyrics');
    
    if (isExpanding) requestAnimationFrame(drawWave);
  };

  // --- BACKGROUND COMMS ---
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "songUpdate") {
      const d = msg.data; 
      isPlaying = d.playing;

      shadow.getElementById("title").textContent = d.title.split(' - ')[1] || d.title;
      shadow.getElementById("artist").textContent = d.artist.split(' • ')[0];
      shadow.getElementById("play").textContent = isPlaying ? "⏸" : "▶";
      shadow.getElementById("barBox").classList.toggle("playing", isPlaying);
      if (d.image) updateTheme(d.image);
      
      if (currentSongID !== d.title) {
          currentSongID = d.title;
          shadow.getElementById("lyrics-content").innerHTML = "<div style='opacity:0.5; margin-top:20px;'>Loading lyrics...</div>";
          shadow.getElementById("mini-lyric-text").innerHTML = "<span>...</span>";
          parsedLyrics = [];
          chrome.runtime.sendMessage({ type: "widget:lyrics", data: true });
          
          if (activePage === 'queue') {
              updateQueueDisplay();
          }
      }

      if (d.progressPct !== undefined && !isScrubbing) {
        currentProgress = d.progressPct;
        currentTimeSeconds = d.currentTimeSeconds || 0;
        songDurationSeconds = d.durationSeconds || 0;
      } else if (d.slider) {
          const pts = d.slider.split(' of ');
          if (pts.length === 2) {
              const toSec = (s) => {
                  const p = s.toLowerCase().split(' ');
                  let total = 0;
                  p.forEach((v, i) => {
                    if (v.startsWith('min')) total += (parseInt(p[i-1]) || 0) * 60;
                    if (v.startsWith('sec')) total += (parseInt(p[i-1]) || 0);
                  });
                  return total;
              };
              currentTimeSeconds = toSec(pts[0]);
              songDurationSeconds = toSec(pts[1]);
              currentProgress = songDurationSeconds > 0 ? currentTimeSeconds / songDurationSeconds : 0;
          }
      }
      
      if (parsedLyrics.length > 0) {
        updateLyricDisplay();
      }
    }
    
    if (msg.type === "lyrics") {
        animateLyrics(msg.data);
    }
  });

  // Sync immediately on load — show current song without waiting for next poll tick
  chrome.runtime.sendMessage({ type: "widget:sync" }, (response) => {
    if (response && response.data && !response.data.error) {
      chrome.runtime.sendMessage({ type: "songUpdate", data: response.data });
      // Dispatch locally since we're already the receiver tab
      const syntheticMsg = { type: "songUpdate", data: response.data };
      const d = syntheticMsg.data;
      isPlaying = d.playing;
      shadow.getElementById("title").textContent = d.title ? (d.title.split(' - ')[1] || d.title) : "...";
      shadow.getElementById("artist").textContent = d.artist ? d.artist.split(' • ')[0] : "...";
      shadow.getElementById("play").textContent = isPlaying ? "⏸" : "▶";
      shadow.getElementById("barBox").classList.toggle("playing", isPlaying);
      if (d.image) updateTheme(d.image);
    }
  });

  setInterval(() => {
    if (isPlaying && parsedLyrics.length > 0) {
      updateLyricDisplay();
    }
  }, 500);

  shadow.getElementById("play").onclick = (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: "widget:control", action: "play_pause" });
  };
  shadow.getElementById("prev").onclick = (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: "widget:control", action: "prevSong" });
  };
  shadow.getElementById("next").onclick = (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: "widget:control", action: "nextSong" });
  };
  shadow.getElementById("refresh-lyrics").onclick = (e) => {
    e.stopPropagation();
    const btn = shadow.getElementById("refresh-lyrics");
    btn.style.transform = "rotate(360deg)";
    setTimeout(() => { btn.style.transition = "none"; btn.style.transform = "rotate(0deg)"; setTimeout(() => btn.style.transition = "transform 0.4s ease, background 0.2s", 50); }, 400);
    
    shadow.getElementById("lyrics-content").innerHTML = "<div style='opacity:0.5; margin-top:20px;'>Refreshing lyrics...</div>";
    shadow.getElementById("mini-lyric-text").innerHTML = "<span>...</span>";
    parsedLyrics = [];
    chrome.runtime.sendMessage({ type: "widget:lyrics", data: true });
  };

  let activeExploreSubtab = "Up Next";
  let cachedShelves = [];

  const renderUpNext = () => {
    chrome.runtime.sendMessage({ type: "getQueue" }, (response) => {
      const container = shadow.getElementById("queue-content");
      if (!response || !response.queue || response.queue.length === 0) {
        container.innerHTML = "<div style='text-align:center; opacity:0.5; margin-top:40px;'>Queue is empty</div>";
        return;
      }
      container.innerHTML = "";
      response.queue.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "queue-item";
        div.innerHTML = `
          <div class="queue-idx">${index + 1}</div>
          <div class="queue-details">
            <div class="queue-title">${item.title}</div>
            <div class="queue-artist">${item.artist && item.artist[0] ? item.artist[0].artist : 'Unknown'}</div>
          </div>
        `;
        div.onclick = (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ type: "playQueue", data: index });
        };
        container.appendChild(div);
      });
    });
  };

  const renderLikedSongs = () => {
    shadow.getElementById("queue-content").innerHTML = `<div style='text-align:center; opacity:0.5; margin-top:40px;'>Loading Liked Songs...</div>`;
    chrome.runtime.sendMessage({ type: "getLikedSongs" }, (response) => {
      const container = shadow.getElementById("queue-content");
      if (!response || !response.data || response.data.length === 0) {
        container.innerHTML = "<div style='text-align:center; opacity:0.5; margin-top:40px; padding: 0 10px; line-height: 1.5;'>Please visit your Liked Songs playlist in YouTube Music once to sync them!</div>";
        return;
      }
      container.innerHTML = "";
      response.data.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "queue-item";
        div.innerHTML = `
          <div class="queue-idx">${index + 1}</div>
          <div class="queue-details">
            <div class="queue-title">${item.title}</div>
            <div class="queue-artist">${item.artist && item.artist[0] ? item.artist[0].artist : 'Unknown'}</div>
          </div>
        `;
        div.onclick = (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ type: "playLikedSong", videoId: item.videoId });
            container.innerHTML = `<div style='text-align:center; opacity:0.5; margin-top:40px;'>Playing ${item.title}...</div>`;
        };
        container.appendChild(div);
      });
    });
  };

  const renderShelf = (shelfTitle) => {
    const shelf = cachedShelves.find(s => s.title === shelfTitle);
    const container = shadow.getElementById("queue-content");
    if (!shelf || !shelf.items || shelf.items.length === 0) {
        container.innerHTML = `<div style='text-align:center; opacity:0.5; margin-top:40px;'>No items in ${shelfTitle}</div>`;
        return;
    }
    container.innerHTML = "";
    shelf.items.forEach((item, displayIdx) => {
        const div = document.createElement("div");
        div.className = "queue-item";
        div.innerHTML = `
          <div class="queue-idx">${displayIdx + 1}</div>
          <div class="queue-details">
            <div class="queue-title">${item.title}</div>
            <div class="queue-artist">${item.artist && item.artist[0] ? item.artist[0].artist : 'Unknown'}</div>
          </div>
        `;
        div.onclick = (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ type: "playShelfItem", data: { shelfIdx: item.shelfIdx, itemIdx: item.itemIdx } });
            container.innerHTML = `<div style='text-align:center; opacity:0.5; margin-top:40px;'>Playing ${item.title}...</div>`;
        };
        container.appendChild(div);
    });
  };

  const fetchDynamicShelves = () => {
    chrome.runtime.sendMessage({ type: "getHomeShelves" }, (response) => {
        if (response && response.status === "success" && response.shelves) {
            cachedShelves = response.shelves;
            
            const tabsContainer = shadow.getElementById("explore-tabs");
            tabsContainer.innerHTML = `<div class="subtab-pill ${activeExploreSubtab === 'Up Next' ? 'active' : ''}" data-sub="Up Next">Up Next</div>`;
            
            const likedPill = document.createElement("div");
            likedPill.className = `subtab-pill ${activeExploreSubtab === 'Liked Songs' ? 'active' : ''}`;
            likedPill.dataset.sub = "Liked Songs";
            likedPill.textContent = "Liked Songs";
            tabsContainer.appendChild(likedPill);
            
            cachedShelves.forEach(shelf => {
                const sub = document.createElement("div");
                sub.className = `subtab-pill ${activeExploreSubtab === shelf.title ? 'active' : ''}`;
                sub.dataset.sub = shelf.title;
                sub.textContent = shelf.title;
                tabsContainer.appendChild(sub);
            });
            bindSubtabs();
        }
    });
  };

  const bindSubtabs = () => {
      shadow.querySelectorAll('.subtab-pill').forEach(pill => {
          pill.onclick = (e) => {
              e.stopPropagation();
              shadow.querySelectorAll('.subtab-pill').forEach(p => p.classList.remove('active'));
              pill.classList.add('active');
              activeExploreSubtab = pill.dataset.sub;
              updateQueueDisplay();
          };
      });
  };

  const updateQueueDisplay = () => {
    if (activeExploreSubtab === "Up Next") {
        renderUpNext();
    } else if (activeExploreSubtab === "Liked Songs") {
        renderLikedSongs();
    } else {
        renderShelf(activeExploreSubtab);
    }
  };

  bindSubtabs();

  shadow.getElementById('btn-search').onclick = (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: "toggle-search-widget" });
  };
  shadow.getElementById('btn-search').onmouseenter = (e) => e.target.style.opacity = '1';
  shadow.getElementById('btn-search').onmouseleave = (e) => e.target.style.opacity = '0.5';

  shadow.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation(); 
        activePage = btn.dataset.page;
        shadow.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shadow.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        shadow.getElementById(`page-${activePage}`).classList.add('active');
        if (activePage === 'player') requestAnimationFrame(drawWave);
        if (activePage === 'queue') {
            updateQueueDisplay();
            fetchDynamicShelves();
        }
    };
  });
}

