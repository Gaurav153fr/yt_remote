// background.js
importScripts('./socket.io.min.js');

// --- Track YouTube Music tab ---
let ytMusicTabId = null;
let lastSong = null;
let pollInterval = null;
let roomCode = null;

async function ensureYtMusicTab() {
  if (ytMusicTabId) return ytMusicTabId;
  const tabs = await chrome.tabs.query({ url: "https://music.youtube.com/*" });
  if (tabs.length) ytMusicTabId = tabs[0].id;
  
  return ytMusicTabId;
}

async function sendToYtMusic(message) {
  const tabId = await ensureYtMusicTab();
  if (!tabId) {
    console.warn("No active YouTube Music tab found");
    return null;
  }

  async function trySend() {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("sendToYtMusic error:", chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  // --- First attempt
  let response = await trySend();

  if (response === null) {
    // Inject content script if not connected
    try {
      console.log("Injecting content.js into tab", tabId);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });

      // Retry once after injection
      response = await trySend();
    } catch (err) {
      console.error("Injection failed:", err);
      return null;
    }
  }

  return response;
}


async function broadcastToAllTabs(payload) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    try {
      chrome.tabs.sendMessage(t.id, payload);
    } catch {}
  }
}

function startPolling() {
  clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    try {
      const res = await sendToYtMusic({ action: "getCurrentlyPlaying" });
    
      if (res && !res.error) {
        lastSong = res;
    
        broadcastToAllTabs({ type: "songUpdate", data: res });
        
        if (roomCode) {
          socket.emit("song", { roomCode, text:res });
        }

        // --- LOCAL WEBSOCKET CAST ---
        if (localWs && localWs.readyState === WebSocket.OPEN) {
          localWs.send(JSON.stringify({ type: "songUpdate", data: res }));
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 1000);
}

// --- Widget messages ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "widget:control") {
        console.log("Control:", msg.action);
      
        const res = await sendToYtMusic({ action: msg.action, data: msg.data });
        
        if (res && !res.error) {
          lastSong = res;
        
          broadcastToAllTabs({ type: "songUpdate", data: res, });
        } else {
          console.log("error",res); sendResponse({ ok: false, error: String(res) });
        }
        sendResponse({ ok: true });
      }

      if (msg.type === "widget:lyrics") {
        const music = await sendToYtMusic({ action: "getCurrentlyPlaying" });
        const lyrics = await fetchSyncedLyrics(music.title, music.artist.split("•")[0]);
        broadcastToAllTabs({ type: "lyrics", data: lyrics, isLyricsOpen: msg.data });
        sendResponse({ ok: true, data: lyrics });
      }

      if (msg.type === "widget:position") {
        broadcastToAllTabs({ type: "position", data: msg.data });
        sendResponse({ ok: true });
      }

      if(msg.type ==="quickPicks"){
        const picks = await sendToYtMusic({ action: "quickPicks" });
        sendResponse({ ok: true, data: picks.quickSongs });
      }

      if (msg.type === "playQuick") {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          world: "MAIN",
          func: (href) => {
            return new Promise((resolve, reject) => {
              const selector = `a[href='${href}']`;
              const observer = new MutationObserver((mutations, obs) => {
                const song = document.querySelector(selector);
                if (song) {
                  song.click();
                  obs.disconnect(); 
                  resolve({ status: "success" });
                }
              });
              observer.observe(document.body, { childList: true, subtree: true });
              const song = document.querySelector(selector);
              if (song) {
                song.click();
                observer.disconnect();
                resolve({ status: "success" });
              }
              setTimeout(() => {
                observer.disconnect();
                reject({ status: "failed" });
              }, 5000); 
            });
          },
          args: [msg.data]
        }).then(results => sendResponse({ok: true, ...results[0].result }))
          .catch(err => sendResponse({ok: false, status: "failed", error: String(err) }));
        return true; 
      }

      if (msg.type === "widget:sync") {
        sendResponse({ ok: true, data: lastSong });
      }
      if (msg.type === "setRoomId") {
        roomCode = msg.roomId;
        sendResponse({ status: "ok" });
      }
      if (msg.type === "getRoomId") {
        sendResponse({ roomId: roomCode });
      }
      if (msg.type === "saveSettings") {
        await chrome.storage.sync.set({ settings: msg.data });
        sendResponse({ status: "ok" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true;
});

// --- Track tab updates ---
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (tab.url && tab.url.startsWith("https://music.youtube.com/")) {
    ytMusicTabId = tabId;
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (ytMusicTabId === tabId) ytMusicTabId = null;
});

// 1. Remote Server
const SERVER_ADDRESS = "https://yt-remote.onrender.com"; 

const socket = io(SERVER_ADDRESS, {
  transports: ["websocket"],
  autoConnect: true,
  forceNew: true,
});

socket.on("connect", () => {
  console.log("Connected to server!");
  socket.emit("createRoom");
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
});

socket.on("roomCreated", (data) => {
  console.log("Room created:", data);
  roomCode = data.roomCode;
});

// --- Remote controls ---
socket.on("nextSong", () => sendToYtMusic({ action: "nextSong" }));
socket.on("prevSong", () => sendToYtMusic({ action: "prevSong" }));
socket.on("play_pause", () => sendToYtMusic({ action: "play_pause" }));
socket.on("slider", (data) => sendToYtMusic({ action: "slider", data }));
socket.on("updateQueue", async () => {
  const res = await sendToYtMusic({ action: "updateQueue" });
  if (roomCode && res) {
    socket.emit("queue", { roomCode, ...res });
  }
});

socket.on("disconnect", () => {
  console.warn("Disconnected from server");
  clearInterval(pollInterval);
});

async function fetchSyncedLyrics(title, artist) {
  const query = { track_name: title, artist_name: artist };
  try {
    const response = await fetch(`https://lrclib.net/api/get?${new URLSearchParams(query)}`);
    const data = await response.json();
    if (data.id) return data.syncedLyrics;
    else throw new Error("No synced lyrics found");
  } catch (error) {
    return null;
  }
}

// ----------------------------------------------------
// LOCAL WEBSOCKET CLIENT (For Tauri Standalone Widget)
// ----------------------------------------------------
let localWs = null;
let localWsReconnectTimer = null;

function connectLocalWs() {
  if (localWs && localWs.readyState !== WebSocket.CLOSED) return;

  localWs = new WebSocket("ws://127.0.0.1:1422/ws");

  localWs.onopen = () => {
    console.log("Connected to local Tauri WebSocket Server");
    // Broadcast initial state immediately
    if (lastSong) {
      localWs.send(JSON.stringify({ type: "songUpdate", data: lastSong }));
    }
  };

  localWs.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (!msg || !msg.type) return;

      // Remote player controls
      if (msg.type === "play_pause") sendToYtMusic({ action: "play_pause" });
      else if (msg.type === "nextSong") sendToYtMusic({ action: "nextSong" });
      else if (msg.type === "prevSong") sendToYtMusic({ action: "prevSong" });
      else if (msg.type === "slider") sendToYtMusic({ action: "slider", data: msg.data });
      else if (msg.type === "widget:sync") {
        if (lastSong) {
          localWs.send(JSON.stringify({ type: "songUpdate", data: lastSong }));
        }
      }
      
      // Feature request mappings (Proxy to content.js)
      else if (msg.type === "getQueue") {
        const res = await sendToYtMusic({ action: "updateQueue" });
        localWs.send(JSON.stringify({ type: "getQueueResponse", data: res }));
      }
      else if (msg.type === "playQueue") {
        await sendToYtMusic({ action: "playQueue", data: msg.data });
        localWs.send(JSON.stringify({ type: "playQueueResponse", data: { ok: true } }));
      }
      else if (msg.type === "liveSearch") {
        const res = await sendToYtMusic({ action: "liveSearch", query: msg.query });
        localWs.send(JSON.stringify({ type: "liveSearchResponse", data: res || [] }));
      }
      else if (msg.type === "playSearchResult") {
        const tabId = await ensureYtMusicTab();
        if (tabId) {
          await sendToYtMusic({ action: "pauseOnly" });
          setTimeout(() => chrome.tabs.update(tabId, { url: `https://music.youtube.com/watch?v=${msg.videoId}` }), 150);
        }
        localWs.send(JSON.stringify({ type: "playSearchResultResponse", data: { ok: true } }));
      }
      else if (msg.type === "getLikedSongs") {
        const res = await sendToYtMusic({ action: "getLikedSongs" });
        localWs.send(JSON.stringify({ type: "getLikedSongsResponse", data: res || [] }));
      }
      else if (msg.type === "playLikedSong") {
        const tabId = await ensureYtMusicTab();
        if (tabId) {
          await sendToYtMusic({ action: "pauseOnly" });
          setTimeout(() => chrome.tabs.update(tabId, { url: `https://music.youtube.com/watch?v=${msg.videoId}&list=LM` }), 150);
        }
        localWs.send(JSON.stringify({ type: "playLikedSongResponse", data: { ok: true } }));
      }
      else if (msg.type === "getHomeShelves") {
        const res = await sendToYtMusic({ action: "getHomeShelves" });
        localWs.send(JSON.stringify({ type: "getHomeShelvesResponse", data: res || [] }));
      }
      else if (msg.type === "playShelfItem") {
        await sendToYtMusic({ action: "playShelfItem", data: msg.data });
        localWs.send(JSON.stringify({ type: "playShelfItemResponse", data: { ok: true } }));
      }
    } catch (e) {
      console.error("Local WS parse error", e);
    }
  };

  localWs.onclose = () => {
    localWs = null;
    clearTimeout(localWsReconnectTimer);
    localWsReconnectTimer = setTimeout(connectLocalWs, 2000);
  };

  localWs.onerror = () => {
    if (localWs) localWs.close();
  };
}

// Start attempting local connection
connectLocalWs();

// Ensure polling runs independently so the local widget always gets data instantly!
startPolling();

