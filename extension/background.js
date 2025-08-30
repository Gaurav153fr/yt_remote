// background.js
import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.7.1/+esm";

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
          // if (roomCode) socket.emit("song", { roomCode, text:{...res} });
        }else{
          console.log("error",res);sendResponse({ ok: false, error: String(res) });
        }
        sendResponse({ ok: true });
      }
if (msg.type === "widget:lyrics") {
  console.log("recieved lyrics request");
  
  const music = await sendToYtMusic({ action: "getCurrentlyPlaying" });
  const lyrics = await fetchSyncedLyrics(music.title, music.artist.split("•")[0]);
console.log("lyrics",lyrics);

  broadcastToAllTabs({ type: "lyrics", data: lyrics,isLyricsOpen:msg.data });
  sendResponse({ ok: true, data: lyrics });
      }
      if (msg.type === "widget:position") {
        console.log("option:", msg.data);
        
        broadcastToAllTabs({ type: "position", data: msg.data });
        sendResponse({ ok: true });
      }
if (msg.type === "widget:sync") {
        sendResponse({ ok: true, data: lastSong });
      }
      if (msg.type === "setRoomId") {
        roomCode = msg.roomId;
        console.log("Room ID set:", roomCode);
        sendResponse({ status: "ok" });
      }

      if (msg.type === "getRoomId") {
        sendResponse({ roomId: roomCode });
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

// --- Socket.IO ---
const SERVER_ADDRESS = "localhost"; // Or LAN IP

console.log("Connecting to server:", SERVER_ADDRESS);

const socket = io(`ws://${SERVER_ADDRESS}:3000`, {
  transports: ["websocket"],
  autoConnect: true,
  forceNew: true,
});

socket.on("connect", () => {
  console.log("Connected to server");
  socket.emit("createRoom");
});

socket.on("roomCreated", (data) => {
  console.log("Room created:", data);
  roomCode = data.roomCode;
  startPolling(); // ✅ start polling only after room exists
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
  console.log("Fetching synced lyrics for:", title, artist);
  
  const query = { track_name: title, artist_name: artist };
  try {
    const response = await fetch(`https://lrclib.net/api/get?${new URLSearchParams(query)}`);
    const data = await response.json();
   
    if (data.id) {
      return data.syncedLyrics;
    } else {
      throw new Error("No synced lyrics found");
    }
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return null;
  }
}
