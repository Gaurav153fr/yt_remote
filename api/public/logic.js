/**
 * Gemini Music Player - Material 3 Expressive Controller
 * Features: Dynamic Theming, Waveform Seekbar, Responsive Layout
 */

const socket = io();
const roomCode = "<%= roomCode %>";
const colorThief = new ColorThief();

// Elements
const songImg = document.getElementById("songImg");
const songTitle = document.getElementById("song");
const artistName = document.getElementById("artist");
const playPauseBtn = document.getElementById("play_pause");
const playIcon = document.getElementById("playIcon");
const slider = document.getElementById("slideBar");
const waveCanvas = document.getElementById("waveCanvas");
const ctx = waveCanvas.getContext("2d");
const infoDisplay = document.getElementById("info");

// State
let currentImgUrl = "";
let isPlaying = false;
let animationFrameId = null;

// --- 1. Socket Initialization ---
socket.emit("joinRoom", roomCode);

socket.on("roomUpdate", (data) => {
  infoDisplay.innerText = `${data.message} | Members: ${data.members}`;
});

// --- 2. Dynamic Theming Engine ---
// Extracts dominant color from album art to theme the entire UI
songImg.onload = function() {
  try {
    const color = colorThief.getColor(songImg);
    const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    const darkVariant = `rgb(${Math.floor(color[0]*0.2)}, ${Math.floor(color[1]*0.2)}, ${Math.floor(color[2]*0.2)})`;
    
    // Update M3 Design Tokens
    document.documentElement.style.setProperty('--primary', rgb);
    document.documentElement.style.setProperty('--primary-container', `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`);
    
    // Smooth background transition
    document.body.style.background = `radial-gradient(circle at top right, rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.2), ${darkVariant} 100%)`;
  } catch (e) {
    console.error("Theming error:", e);
  }
};

// --- 3. Expressive Waveform Seekbar ---
function renderWave() {
  const width = waveCanvas.width;
  const height = waveCanvas.height;
  const progress = parseFloat(slider.value);
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = themeColor;

  const centerY = height / 2;
  const playheadX = width * progress;

  for (let x = 0; x <= width; x++) {
    // Wave intensity peaks near the playhead/thumb
    const distance = Math.abs(x - playheadX);
    const amplitude = isPlaying ? Math.max(0, 18 - distance / 12) : 2;
    const frequency = 0.06;
    const speed = Date.now() * 0.006;
    
    const y = centerY + Math.sin(x * frequency + speed) * amplitude;
    
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
  animationFrameId = requestAnimationFrame(renderWave);
}

// Ensure canvas matches display size for sharpness
function resizeCanvas() {
  waveCanvas.width = waveCanvas.offsetWidth;
  waveCanvas.height = waveCanvas.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
renderWave();

// --- 4. Core Player Logic ---
socket.on("song", (data) => {
  // Metadata Updates
  songTitle.textContent = data.text.title || "No song";
  artistName.textContent = data.text.artist || "Unknown";
  
  // Play/Pause State & Icon
  isPlaying = !!data.text.playing;
  playIcon.textContent = isPlaying ? "pause" : "play_arrow";

  // Seekbar Positioning
  const ratio = timeToRatio(data.text.slider);
  if (ratio !== null) {
    slider.value = ratio;
    updateTimeLabels(data.text.slider);
  }

  // Cover Image Handling (Dynamic Theming triggers on load)
  if (data.text.image && data.text.image !== currentImgUrl) {
    currentImgUrl = data.text.image;
    // Upgrade resolution from YouTube thumbnail format
    songImg.src = data.text.image.replace(/(w)(\d+)-(h)(\d+)/, `$1600-$3600`);
  }
});

function updateTimeLabels(timeString) {
  const match = timeString.match(/(\d+)\s*Min.*?(\d+)\s*Sec.*?of\s*(\d+)\s*Min.*?(\d+)\s*Sec/i);
  if (match) {
    document.getElementById("currentTime").innerText = `${match[1]}:${match[2].padStart(2, '0')}`;
    document.getElementById("totalTime").innerText = `${match[3]}:${match[4].padStart(2, '0')}`;
  }
}

function timeToRatio(timeString) {
  const match = timeString.match(/(\d+)\s*Min.*?(\d+)\s*Sec.*?of\s*(\d+)\s*Min.*?(\d+)\s*Sec/i);
  if (match) {
    const current = parseInt(match[1]) * 60 + parseInt(match[2]);
    const total = parseInt(match[3]) * 60 + parseInt(match[4]);
    return total > 0 ? (current / total).toFixed(4) : 0;
  }
  return null;
}

// --- 5. User Interactions ---
playPauseBtn.onclick = () => socket.emit("play_pause", { roomCode });
document.getElementById("nextSong").onclick = () => socket.emit("nextSong", { roomCode });
document.getElementById("prevSong").onclick = () => socket.emit("prevSong", { roomCode });

slider.oninput = (e) => {
  socket.emit("slider", { roomCode, value: e.target.value });
};

// --- 6. Chat & Queue ---
document.getElementById("sendBtn").onclick = () => {
  const input = document.getElementById("msgInput");
  if (input.value.trim()) {
    socket.emit("message", { roomCode, msg: input.value });
    input.value = "";
  }
};

socket.on("message", (msg) => {
  const li = document.createElement("li");
  li.className = "m3-chat-item";
  li.innerText = msg;
  const list = document.getElementById("messages");
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
});

document.getElementById("updateQueue").onclick = () => socket.emit("updateQueue", { roomCode });

socket.on("queue", (data) => {
  const container = document.getElementById("queueContainer");
  container.innerHTML = data.queue.map(song => `
    <div class="m3-list-item">
      <span class="material-symbols-rounded">music_note</span>
      <p>${song.title}</p>
    </div>
  `).join('');
});