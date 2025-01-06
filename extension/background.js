import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.7.1/+esm";



const SERVER_ADDRESS = "your_ip_address"






console.log("Connecting...","address:",SERVER_ADDRESS);

const socket = io(`ws://${SERVER_ADDRESS}:3000`, {
  transports: ["websocket"],
  autoConnect: true,
  forceNew: true,
}); // Replace with your server URL if needed

socket.on("connect", () => {
  console.log("Connected to WebSocket server");

  // Set an interval to emit the 'song' event every second
  setInterval(() => {
    // Request currently playing song info from the active tab
    chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "getCurrentlyPlaying" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message:",
                chrome.runtime.lastError.message
              );
            } else if (response) {
              console.log("Currently playing response:", response);
              socket.emit("song", response); // Emit the response to the server
            } else {
              console.warn("No response received from content script.");
            }
          }
        );
      } else {
        console.error("No active tabs found.");
      }
    });
  }, 1000); // Emit song data every second

  // Handle the 'nextSong' event from the server
  socket.on("nextSong", () => {
    chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "nextSong" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message:",
                chrome.runtime.lastError.message
              );
            } else if (response) {
              console.log("Next song response:", response);
              socket.emit("song", response); // Emit the response to the server
            } else {
              console.warn("No response received from content script.");
            }
          }
        );
      } else {
        console.error("No active tabs found.");
      }
    });
  });

  socket.on("prevSong", () => {
    chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "prevSong" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message:",
                chrome.runtime.lastError.message
              );
            } else if (response) {
              console.log("Next song response:", response);
              socket.emit("song", response); // Emit the response to the server
            } else {
              console.warn("No response received from content script.");
            }
          }
        );
      } else {
        console.error("No active tabs found.");
      }
    });
  });
});
socket.on("updateQueue", () => {
  chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "updateQueue" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message:",
              chrome.runtime.lastError.message
            );
          } else if (response) {
            console.log("Next song response:", response);
           socket.emit("queue", response);
          } else {
            console.warn("No response received from content script.");
          }}
      );
    } else {
      console.error("No active tabs found.");

  }})}
);
socket.on("liked", () => {
  chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "liked" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message:",
              chrome.runtime.lastError.message
            );
          } else if (response) {
            console.log("Next song response:", response);
           socket.emit("queue", response);
          } else {
            console.warn("No response received from content script.");
          }}
      );
    } else {
      console.error("No active tabs found.");

  }})}
);  
socket.on("slider", (data) => {
  chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "slider", data: data },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message:",
              chrome.runtime.lastError.message
            );
          } else if (response) {
            console.log("Next song response:", response);
            socket.emit("song", response);
            true // Emit the response to the server
          } else {
            console.warn("No response received from content script.");
          }
        }
      );
    } else {
      console.error("No active tabs found.");
    }
  })
})
socket.on("play_pause", () => {
  chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "play_pause" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message:",
              chrome.runtime.lastError.message
            );
          } else if (response) {
            console.log("Next song response:", response);
            socket.emit("song", response); // Emit the response to the server
          } else {
            console.warn("No response received from content script.");
          }
        }
      );
    } else {
      console.error("No active tabs found.");
    }
  });
});
socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server");
});
