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
        console.log("Broadcasting song update:", res);  
        
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
      if(msg.type ==="quickPicks"){

                const picks = await sendToYtMusic({ action: "quickPicks" });
        
         console.log("picks",picks);
        
               
        
                sendResponse({ ok: true, data: picks.quickSongs });
        
              }
      if (msg.type === "playQuick") {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          world: "MAIN",
          func: (href) => {
            return new Promise((resolve, reject) => {
              const selector = `a[href='${href}']`;
              console.log("Looking for selector:", selector);
              
              const observer = new MutationObserver((mutations, obs) => {
                const song = document.querySelector(selector);
                if (song) {
                  console.log("Found and clicking song:", song);
                  song.click();
                  obs.disconnect(); // Stop observing once the element is found and clicked
                  resolve({ status: "success", message: "Song clicked successfully." });
                }
              });
      
              // Start observing the body for changes
              observer.observe(document.body, { childList: true, subtree: true });
      
              // Check if the element already exists on initial run
              const song = document.querySelector(selector);
              if (song) {
                console.log("Song found on initial check, clicking:", song);
                song.click();
                observer.disconnect();
                resolve({ status: "success", message: "Song clicked on initial check." });
              }
              
              // Timeout to prevent endless waiting
              setTimeout(() => {
                observer.disconnect();
                reject({ status: "failed", error: "Song element not found within timeout." });
              }, 5000); // 5-second timeout
            });
          },
          args: [msg.data]
        }).then(results => {
          sendResponse(
            {ok: true, ...results[0].result }
          );
        }).catch(err => {
          console.error("Script execution error:", err);
          sendResponse({ok: false, status: "failed", error: String(err) });
        });
      
        return true; // Keeps the sendResponse channel open
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


      if (msg.type === "saveSettings") {
        // Here you would save the settings, e.g., to chrome.storage
        console.log("Saving settings:", msg.data);
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
// 1. Add the port your server is listening on
const SERVER_ADDRESS = "https://yt-remote.onrender.com"; // Change this to your server's address

console.log("Connecting to server:", SERVER_ADDRESS);

// 2. Use the address variable directly
const socket = io(SERVER_ADDRESS, {
  transports: ["websocket"],
  autoConnect: true,
  forceNew: true,
});

socket.on("connect", () => {
  console.log("Connected to server!");
  socket.emit("createRoom");
});

// 3. Add an error listener to see exactly what's wrong
socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
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
