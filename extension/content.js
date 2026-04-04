// Listen for messages from popup.js or background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Use a switch statement for better readability and logic flow
  switch (message.action) {
    case "getCurrentlyPlaying": {
     


        const video = document.querySelector("video");
        const titleElement = document.querySelector(
          "yt-formatted-string.ytmusic-player-bar"
        );
        const imageElement = document.querySelector(
          ".image.style-scope.ytmusic-player-bar"
        );
        const artistElement = document.querySelector(
          "yt-formatted-string.byline.style-scope.ytmusic-player-bar.complex-string"
        );
        const playPauseButton = document.querySelector("#play-pause-button");
  
        if (titleElement && imageElement && artistElement && playPauseButton) {
          const title = titleElement.textContent.trim() || "Unknown Title";
          const image = imageElement.getAttribute("src") || "Unknown Image";
          const artist = artistElement.getAttribute("title") || "Unknown Artist";
          const playPauseButtonLabel = playPauseButton.getAttribute("title");
          const playing = playPauseButtonLabel !== "Play";
          const slider = document.querySelector("#progress-bar");
          
          const currentTime = video ? video.currentTime : 0;
          const duration = video ? video.duration : 0;
        
          sendResponse({
            title: title,
            artist: artist,
            image: image,
            playing: playing,
            slider: slider.getAttribute("aria-valuetext") || "0:00 of 0:00",
            currentTimeSeconds: Math.floor(currentTime),
            durationSeconds: Math.floor(duration),
            progressPct: duration > 0 ? (currentTime / duration) : 0,
          });
        }
      else {
        sendResponse({
          error: "Could not find song data",
        });
      }
     // Keep the channel open for the async response
     break;
    }

    case "nextSong": {
      const nextButton = document.querySelector(".next-button");
      console.log("Next button:");
      
      if (nextButton) {
        nextButton.click();
        sendResponse({ status: "success", action: "nextSong" });
      } else {
        sendResponse({ status: "error", message: "Next button not found" });
      }
      // return true;
      break;
    }

    case "play_pause": {
      const playPauseButton = document.querySelector("#play-pause-button");
      if (playPauseButton) {
        playPauseButton.click();
        sendResponse({ status: "success", action: "play_pause" });
      } else {
        sendResponse({ status: "error", message: "Play/pause button not found" });
      }
      // return true;
      break;
    }

    case "pauseOnly": {
      const video = document.querySelector("video");
      if (video) {
        video.pause();
      }
      sendResponse({ status: "success", action: "pauseOnly" });
      break;
    }

    case "prevSong": {
      const prevButton = document.querySelector(".previous-button");
      if (prevButton) {
        prevButton.click();
        sendResponse({ status: "success", action: "prevSong" });
      } else {
        sendResponse({ status: "error", message: "Previous button not found" });
      }
      // return true;
      break;
    }

    case "slider": {
      const progressBar = document.querySelector("#progress-bar #progressContainer");
      const sliderBar = document.querySelector("#progress-bar #sliderBar");

      if (progressBar && sliderBar) {
        const rect = progressBar.getBoundingClientRect();
        const width = rect.width;
        // The data passed from the background script is a percentage (0 to 1)
        const clickX = rect.left + message.data * width;

        const mousedownEvent = new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: clickX,
          clientY: rect.top + rect.height / 2,
        });
        sliderBar.dispatchEvent(mousedownEvent);

        const mouseupEvent = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          clientX: clickX,
          clientY: rect.top + rect.height / 2,
        });
        sliderBar.dispatchEvent(mouseupEvent);

        console.log("Slider position updated to:", message.data);
        sendResponse({ status: "success", action: "slider" });
      } else {
        console.error("Progress bar or slider element not found.");
        sendResponse({ status: "error", message: "Slider element not found" });
      }
      // return true;
      break;
    }
    case "playQueue": {
      const song = document.querySelectorAll("a.ytmusic-player-queue-item")[message.data];
      console.log("song", song);
      injectPlay(message.data);
      function injectPlay(href) {
        const s = document.createElement("script");
        s.textContent = `
          (function() {
            const el = document.querySelector("a[href='${href}']");
            if (el) {
              el.click(); // now it's in page context, handled normally
            }
          })();
        `;
        document.documentElement.appendChild(s);
        s.remove();
      }
      
      if (song) {
        const evt = new PointerEvent("click", {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window
        });
        console.log("evt", evt);
        
        song.dispatchEvent(evt);
        sendResponse({ status: "success", action: "playQuick" });
      } else {
        sendResponse({ status: "failed", action: "playQuick", error: "Song not found" });
      }
      break;
    }
    
    case "updateQueue": {
      const queueList = document.querySelector("ytmusic-player-queue");
      if (queueList) {
        const playlist = [...queueList.querySelectorAll("ytmusic-player-queue-item")].map((e) => {
          const title = e.querySelector("yt-formatted-string")?.textContent.trim() || "Unknown Title";
          const artist = e.querySelector(".byline.ytmusic-player-queue-item")?.textContent.trim() || "Unknown Artist";
          const duration = e.querySelector(".duration")?.textContent.trim() || "Unknown Duration";
          const cover = e.querySelector("img")?.src || "Unknown Cover";
          
          return {
            cover: cover,
            title: title,
            duration: duration,
            artist: [{ artist: artist, href: "" }],
          };
        });
        sendResponse({ queue: playlist, status: "success", action: "updateQueue" });
      } else {
        sendResponse({ status: "error", message: "Queue list not found" });
      }
      break;
    }
case "toggleWidget":{ 
 console.log("toggleWidget",message.data);
 
  // return true;
  break;}
    case "quickPicks": {
      console.log("Quick picks");
      
      const quickPicks = document.querySelector("#items-wrapper");
      if (quickPicks) {
        const quickSongs = [...quickPicks.querySelectorAll("ytmusic-responsive-list-item-renderer")].map((e,index) => {
          const title = e.querySelector("yt-formatted-string.title.style-scope.ytmusic-responsive-list-item-renderer.complex-string")?.innerText || "Unknown Title";
          const artist = e.querySelector("span.style-scope.yt-formatted-string")?.innerText || "Unknown Artist";
          const cover = e.querySelector("img")?.src || "Unknown Cover";
          const href = e.querySelector("a.yt-simple-endpoint.style-scope.ytmusic-responsive-list-item-renderer")?.getAttribute("href") || "";
          return {
            index:index,
            href: href,
            cover: cover,
            title: title,
            artist: [{ artist: artist, href: "" }],
    }});
        sendResponse({ quickSongs: quickSongs, status: "success", action: "quickPicks" });
      } else {
        sendResponse({ status: "error", message: "Quick picks not found" });
      }
      break;
    }
    
    case "getHomeShelves": {
      const shelves = document.querySelectorAll("ytmusic-carousel-shelf-renderer");
      const result = [];
      
      shelves.forEach((shelf, shelfIdx) => {
          const titleEl = shelf.querySelector("h2 yt-formatted-string") || shelf.querySelector(".title");
          const shelfTitle = titleEl ? titleEl.textContent.trim() : "";
          if (!shelfTitle) return;
          
          const items = [...shelf.querySelectorAll("ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer")];
          if (items.length === 0) return;
          
          const parsedItems = items.map((e, index) => {
              let title = e.querySelector(".title")?.textContent.trim() || e.querySelector("a.yt-simple-endpoint")?.textContent.trim();
              let artist = e.querySelector(".secondary-flex-columns yt-formatted-string")?.textContent.trim() || e.querySelector(".subtitle")?.textContent.trim();
              let cover = e.querySelector("img")?.src;
              
              if (!title) title = e.querySelector("yt-formatted-string.title")?.textContent.trim() || "Unknown Title";
              if (!artist) artist = e.querySelector("yt-formatted-string.subtitle")?.textContent.trim() || "Unknown Artist";
              
              return {
                  shelfIdx: shelfIdx,
                  itemIdx: index,
                  title: title,
                  artist: [{ artist: artist, href: "" }],
                  cover: cover || "Unknown Cover"
              };
          });
          
          result.push({
             title: shelfTitle,
             items: parsedItems
          });
      });
      
      sendResponse({ shelves: result, status: "success", action: "getHomeShelves" });
      break;
    }

    case "playShelfItem": {
      const { shelfIdx, itemIdx } = message.data;
      const shelves = document.querySelectorAll("ytmusic-carousel-shelf-renderer");
      const shelf = shelves[shelfIdx];
      
      if (shelf) {
          const items = shelf.querySelectorAll("ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer");
          const item = items[itemIdx];
          
          if (item) {
              const playBtn = item.querySelector("ytmusic-play-button-renderer") || item.querySelector("a.yt-simple-endpoint") || item;
              
              // We simulate click via pointer event or direct click
              const evt = new PointerEvent("click", {
                bubbles: true, cancelable: true, composed: true, view: window
              });
              playBtn.dispatchEvent(evt);
              sendResponse({ status: "success" });
              break;
          }
      }
      sendResponse({ status: "error", message: "Shelf item not found" });
      break;
    }

    default:
      // Always handle unknown messages
      sendResponse({ status: "error", message: "Unknown action" });
     break;
  }
});

let lastScrapedCount = 0;
function scrapeLikedSongsFromDOM() {
    const items = document.querySelectorAll("ytmusic-responsive-list-item-renderer");
    if (items.length === 0 || items.length === lastScrapedCount) return;
    
    const songs = [...items].map((e, index) => {
          let title = e.querySelector(".title")?.textContent.trim() || "";
          let artist = e.querySelector(".secondary-flex-columns yt-formatted-string")?.textContent.trim() || "";
          let cover = e.querySelector("img")?.src || "";
          let href = e.querySelector("a.yt-simple-endpoint")?.href || "";
          let videoIdMatch = href.match(/v=([a-zA-Z0-9_-]+)/);
          let videoId = videoIdMatch ? videoIdMatch[1] : "";
          
          return {
             itemIdx: index,
             videoId: videoId,
             title: title,
             artist: [{ artist: artist, href: "" }],
             cover: cover
          };
    }).filter(s => s.videoId && s.title);
    
    if (songs.length > 0) {
        lastScrapedCount = items.length;
        chrome.storage.local.set({ likedSongsCache: songs }, () => {
            console.log("Saved", songs.length, "liked songs to cache");
        });
    }
}

// Check every few seconds if user is on Liked Songs page to passively build the cache
setInterval(() => {
    if (window.location.href.includes("list=LM")) {
        scrapeLikedSongsFromDOM();
    } else {
        lastScrapedCount = 0; // reset so if they return, it rescrapes
    }
}, 3000);
