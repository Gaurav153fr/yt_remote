// Listen for messages from popup.js or background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Use a switch statement for better readability and logic flow
  switch (message.action) {
    case "getCurrentlyPlaying": {
     


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
    
        // Make sure the required elements are found
        if (titleElement && imageElement && artistElement && playPauseButton) {
          const title = titleElement.textContent.trim() || "Unknown Title";
          const image = imageElement.getAttribute("src") || "Unknown Image";
          const artist = artistElement.getAttribute("title") || "Unknown Artist";
          const playPauseButtonLabel = playPauseButton.getAttribute("title");
          const playing = playPauseButtonLabel !== "Play"; // If the label is "Play", it means the song is paused.
          const slider = document.querySelector("#progress-bar");
          // Send the response with all song data
        
          sendResponse({
            title: title,
            artist: artist,
            image: image,
            playing: playing,
            slider: slider.getAttribute("aria-valuetext")||0.3,
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

    case "updateQueue": {
      const queueList = document.querySelector("ytmusic-player-queue");
      if (queueList) {
        const playlist = [...queueList.querySelectorAll("ytmusic-player-queue-item")].map((e) => {
          const title = e.querySelector(".title.ytmusic-player-queue-item")?.textContent.trim() || "Unknown Title";
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

    default:
      // Always handle unknown messages
      sendResponse({ status: "error", message: "Unknown action" });
     break;
  }
});
