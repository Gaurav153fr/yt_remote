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
    --fg: #ffffff; --bg-mini: #ff0000; --bg-expanded: #121212;
   /* Position it 20px from the right and 20px from the bottom */
left: calc(100vw - 175px); 
top: calc(100vh - 70px);
    transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), 
                height 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
                left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
                top 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    touch-action: none;
    user-select: none; -webkit-user-select: none;
  }
  :host(.is-expanded) { width: 310px; height: 170px; }

  .widget {
    all: initial; display: flex; align-items: center; padding: 6px;
    background: var(--bg-mini); color: var(--fg); border-radius: 999px;
    box-shadow: 0 12px 45px rgba(0,0,0,0.4); backdrop-filter: blur(20px);
    font-family: system-ui, sans-serif; width: 100%; height: 100%; 
    box-sizing: border-box; overflow: hidden; cursor: pointer; position: relative;
    border: 1px solid rgba(255,255,255,0.2);
    transition: background 0.6s ease;
  }
  .widget.expanded { border-radius: 32px; cursor: default; background: var(--bg-expanded); }

  .bg-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.8s ease; z-index: 0; pointer-events: none; }
  .expanded .bg-art { opacity: 0.5; }
  
  .mini-content { display: flex; align-items: center; z-index: 5; width: 100%; gap: 12px; padding-left: 4px; pointer-events: none; }
  .expanded .mini-content { display: none; }
  
  .mini-art { width: 38px; height: 38px; border-radius: 50%; border: 2px solid var(--fg); overflow: hidden; flex-shrink: 0; }
  .mini-art img { width: 100%; height: 100%; object-fit: cover; }
  
  .bar-container { display: flex; align-items: center; justify-content: center; width: 50px; height: 25px; cursor: pointer; pointer-events: auto; position: relative; }
  .bars-inner { display: flex; align-items: center; gap: 3px; transition: opacity 0.2s; }
  .action-icon { position: absolute; font-size: 18px; opacity: 0; transform: scale(0.5); transition: 0.2s; font-weight: bold; }
  .flashing .bars-inner { opacity: 0; }
  .flashing .action-icon { opacity: 1; transform: scale(1.1); }

  .bar { width: 3px; background: var(--fg); border-radius: 2px; }
  .playing .bar { animation: bar-dance 0.8s infinite ease-in-out; }
  .bar:nth-child(1), .bar:nth-child(5) { height: 6px; }
  .bar:nth-child(2), .bar:nth-child(4) { height: 12px; animation-delay: 0.15s; }
  .bar:nth-child(3) { height: 18px; animation-delay: 0.3s; }

  @keyframes bar-dance { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.6); } }

  .expanded-ui { display: none; flex-direction: column; width: 100%; z-index: 5; padding: 18px; box-sizing: border-box; }
  .expanded .expanded-ui { display: flex; }
  .title { font-size: 17px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--fg); }
  .artist { font-size: 13px; opacity: 0.8; color: var(--fg); margin-bottom: 5px; }
  
  .seekbar-row { display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 5px; }
  .seekbar-wrap { flex-grow: 1; height: 35px; cursor: pointer; position: relative; }
  #waveCanvas { width: 100%; height: 100%; pointer-events: none; }
  .time-display { font-size: 11px; font-variant-numeric: tabular-nums; opacity: 0.9; min-width: 70px; text-align: right; color: var(--fg); font-weight: 600; }

  .controls { display: flex; justify-content: center; gap: 20px; align-items: center; margin-top: 10px; }
  .btn { background: rgba(255,255,255,0.1); border: none; color: var(--fg); cursor: pointer; font-size: 22px; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
  .btn:active { transform: scale(0.9); }
  .btn#play { background: var(--fg); color: var(--bg-expanded); }
  .drag-handle { margin-left: auto; cursor: grab; opacity: 0.6; padding: 10px; font-size: 20px; z-index: 10; color: var(--fg); pointer-events: auto; }
  `;
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "widget";
  wrap.innerHTML = `
  <img id="bg-art" class="bg-art" />
  <div class="mini-content">
      <div class="mini-art"><img id="img-mini" /></div>
      <div class="bar-container" id="barBox">
          <div class="action-icon" id="flashIcon">▶</div>
          <div class="bars-inner">
              <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
          </div>
      </div>
      <div class="drag-handle" id="handle">⠿</div>
  </div>
  <div class="expanded-ui">
    <div class="title" id="title">...</div>
    <div class="artist" id="artist">...</div>
    <div class="seekbar-row">
        <div class="seekbar-wrap" id="seekbar"><canvas id="waveCanvas"></canvas></div>
        <div class="time-display" id="timeText">0:00 / 0:00</div>
    </div>
    <div class="controls">
      <button class="btn" id="prev">⏮</button>
      <button class="btn" id="play">▶</button>
      <button class="btn" id="next">⏭</button>
    </div>
  </div>
  `;
  shadow.appendChild(wrap);

  let isDragging = false, hasMoved = false, startX, startY;
  let miniHome = { 
    left: window.innerWidth - 175, 
    top: window.innerHeight - 70 
  };
  const clampPos = (l, t, isExp) => {
      const w = isExp ? 310 : 155, h = isExp ? 170 : 50, pad = 10;
      return {
          l: Math.max(pad, Math.min(l, window.innerWidth - w - pad)),
          t: Math.max(pad, Math.min(t, window.innerHeight - h - pad))
      };
  };

  const hdl = wrap.querySelector("#handle");
  hdl.onpointerdown = (e) => {
      isDragging = true; hasMoved = false;
      startX = e.clientX; startY = e.clientY;
      const r = host.getBoundingClientRect();
      miniHome.left = r.left; miniHome.top = r.top;
      host.style.transition = "none";
      hdl.setPointerCapture(e.pointerId);
  };

  window.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      const coords = clampPos(miniHome.left + dx, miniHome.top + dy, wrap.classList.contains('expanded'));
      host.style.left = coords.l + "px"; host.style.top = coords.t + "px";
  });

  window.addEventListener("pointerup", () => {
      if (!isDragging) return;
      isDragging = false;
      const r = host.getBoundingClientRect();
      miniHome = { left: r.left, top: r.top };
      host.style.transition = "all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)";
      setTimeout(() => { hasMoved = false; }, 50);
  });

  wrap.onclick = (e) => {
      if (hasMoved || e.target.closest(".btn") || e.target.closest("#seekbar") || e.target.closest("#handle") || e.target.closest("#barBox")) return;
      const isExp = wrap.classList.toggle("expanded");
      host.classList.toggle("is-expanded", isExp);
      if (isExp) {
          const coords = clampPos(miniHome.left, miniHome.top, true);
          host.style.left = coords.l + "px"; host.style.top = coords.t + "px";
          requestAnimationFrame(drawWave);
      } else {
          host.style.left = miniHome.left + "px"; host.style.top = miniHome.top + "px";
      }
  };

  const updateTheme = (src) => {
      let hd = src.includes('googleusercontent.com') ? src.split('=')[0] + '=s800-c' : src;
      const img = new Image(); img.crossOrigin = "Anonymous"; img.src = hd;
      img.onload = () => {
          const c = document.createElement("canvas"); const x = c.getContext("2d");
          c.width = 40; c.height = 40; x.drawImage(img, 0, 0, 40, 40);
          const data = x.getImageData(0, 0, 40, 40).data;
          let counts = {}, max = 0, dom = {r:255, g:0, b:0}, bright = {v:-1}, dark = {v:766};
          for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i+1], b = data[i+2], v = r+g+b;
              if (v > bright.v) bright = {v, r, g, b};
              if (v < dark.v) dark = {v, r, g, b};
              const k = `${Math.floor(r/10)},${Math.floor(g/10)},${Math.floor(b/10)}`;
              counts[k] = (counts[k] || 0) + 1;
              if (counts[k] > max) { max = counts[k]; dom = {r, g, b}; }
          }
          if ((dom.r + dom.g + dom.b) < 150) { dom.r += 65; dom.g += 65; dom.b += 65; }
          if ((dom.r + dom.g + dom.b) > 650) { dom.r *= 0.8; dom.g *= 0.8; dom.b *= 0.8; }
          host.style.setProperty('--bg-mini', `rgb(${dom.r}, ${dom.g}, ${dom.b})`);
          host.style.setProperty('--bg-expanded', `rgb(${Math.floor(dark.r*0.25)}, ${Math.floor(dark.g*0.25)}, ${Math.floor(dark.b*0.25)})`);
          if (bright.v < 400) bright = {r:255, g:255, b:255};
          host.style.setProperty('--fg', `rgb(${bright.r}, ${bright.g}, ${bright.b})`);
          wrap.querySelector("#bg-art").src = hd; wrap.querySelector("#img-mini").src = hd;
      };
  };

  const barBox = wrap.querySelector("#barBox");
  const flashIcon = wrap.querySelector("#flashIcon");
  barBox.onclick = (e) => {
      e.stopPropagation();
      flashIcon.textContent = isPlaying ? "⏸" : "▶";
      barBox.classList.add("flashing");
      chrome.runtime.sendMessage({ type: "widget:control", action: "play_pause" });
      setTimeout(() => barBox.classList.remove("flashing"), 600);
  };

  const cvs = wrap.querySelector('#waveCanvas'); const ctx = cvs.getContext('2d');
  let phase = 0, currentProgress = 0, isPlaying = false;

  const drawWave = () => {
      if (!wrap.classList.contains('expanded')) return;
      const w = cvs.offsetWidth, h = cvs.offsetHeight;
      if (cvs.width !== w) { cvs.width = w; cvs.height = h; }
      ctx.clearRect(0, 0, w, h);
      const midY = h / 2, progX = w * currentProgress, fg = getComputedStyle(host).getPropertyValue('--fg');
      ctx.beginPath(); ctx.strokeStyle = fg; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let x = 0; x <= progX; x++) {
          const env = Math.sin((x / progX) * Math.PI); 
          // WAVE MATH: 0.25 is wavelength, 14 is amplitude
          const y = midY + Math.sin(x * 0.25 - phase) * (isPlaying ? 7 : 1) * env;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = fg; ctx.arc(progX, midY, 6, 0, 7); ctx.fill();
      phase += isPlaying ? 0.12 : 0.02;
      requestAnimationFrame(drawWave);
  };

  const parseTime = (s) => {
      const parts = s.toLowerCase().split(' ');
      let min = 0, sec = 0;
      for (let i=0; i<parts.length; i++) {
          if (parts[i].startsWith('min')) min = parseInt(parts[i-1]) || 0;
          if (parts[i].startsWith('sec')) sec = parseInt(parts[i-1]) || 0;
      }
      return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const updateUI = (d) => {
      if (!d) return;
      isPlaying = d.playing;
      wrap.querySelector("#title").textContent = d.title.split(' - ')[1] || d.title;
      wrap.querySelector("#artist").textContent = d.artist.split(' • ')[0];
      wrap.querySelector("#play").innerHTML = d.playing ? "⏸" : "▶";
      wrap.querySelector("#barBox").classList.toggle("playing", d.playing);
      if (d.image) updateTheme(d.image);
      if (d.slider) {
          const pts = d.slider.split(' of ');
          if (pts.length === 2) {
              wrap.querySelector("#timeText").textContent = `${parseTime(pts[0])} / ${parseTime(pts[1])}`;
              const toSec = (s) => {
                  const p = s.toLowerCase().split(' ');
                  let total = 0;
                  for (let i=0; i<p.length; i++) {
                      if (p[i].startsWith('min')) total += (parseInt(p[i-1]) || 0) * 60;
                      if (p[i].startsWith('sec')) total += (parseInt(p[i-1]) || 0);
                  }
                  return total;
              };
              const cur = toSec(pts[0]), dur = toSec(pts[1]);
              if (dur > 0) currentProgress = cur / dur;
          }
      }
  };
  
  wrap.querySelector("#play").onclick = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: "widget:control", action: "play_pause" }); };
  wrap.querySelector("#prev").onclick = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: "widget:control", action: "prevSong" }); };
  wrap.querySelector("#next").onclick = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: "widget:control", action: "nextSong" }); };
  wrap.querySelector("#seekbar").onpointerdown = (e) => {
      const r = wrap.querySelector("#seekbar").getBoundingClientRect();
      const s = (ev) => { currentProgress = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
      s(e); window.onpointermove = s;
      window.onpointerup = () => { window.onpointermove = null; chrome.runtime.sendMessage({ type: "widget:control", action: "seek", value: currentProgress }); };
      e.stopPropagation();
  };
  chrome.runtime.onMessage.addListener(msg => { if (msg.type === "songUpdate") updateUI(msg.data); });
}