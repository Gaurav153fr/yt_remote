// Listen for messages from popup.js or background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCurrentlyPlaying") {
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
	
	const likeButtons = document.querySelector("#like-button-renderer");

    // Make sure the required elements are found
    if (titleElement && imageElement && artistElement && playPauseButton) {
      const title = titleElement.textContent.trim() || "Unknown Title";
      const image = imageElement.getAttribute("src") || "Unknown Image";
      const artist = artistElement.getAttribute("title") || "Unknown Artist";
      const playPauseButtonLabel = playPauseButton.getAttribute("aria-label");
      const playing = playPauseButtonLabel !== "Play"; // If the label is "Play", it means the song is paused.
      const slider = document.querySelector("#progress-bar");
	  const like = likeButtons.getAttribute("like-status");
      // Send the response with all song data
      sendResponse({
        title: title,
        artist: artist,
        image: image,
        playing: playing,
        slider: slider.getAttribute("aria-valuetext"),
		like: like
      });
    } else {
      // Send a response with a default error message if elements aren't found
      sendResponse({
        error: "Could not find song data",
      });
    }

    // Return true to indicate that we're sending an asynchronous response
    return true;
  }

  // Handling actions for next, play/pause, and previous song
  if (message.action === "nextSong") {
    const nextButton = document.querySelector(
      "tp-yt-paper-icon-button.next-button"
    );
    if (nextButton) nextButton.click();
  }

  if (message.action === "play_pause") {
    const playPauseButton = document.querySelector("#play-pause-button");
    if (playPauseButton) playPauseButton.click();
  }
  
  if (message.action === "liked") {
    const likeButton = document.querySelector(
	"yt-button-shape#button-shape-like button"
	);
    if (likeButton) likeButton.click();
  }

  if (message.action === "prevSong") {
    const prevButton = document.querySelector(
      "tp-yt-paper-icon-button.previous-button"
    );
    if (prevButton) prevButton.click();
  }
  if (message.action === "slider") {
    const progressBar = document.querySelector(
      "#progress-bar #progressContainer"
    );
    const sliderBar = document.querySelector("#progress-bar #sliderBar");

    if (progressBar && sliderBar) {
      // Calculate the target click position
      const rect = progressBar.getBoundingClientRect();
      const width = rect.width;
      const clickX = rect.left + message.data * width;

      // Create and dispatch a mousedown event
      const mousedownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: clickX,
        clientY: rect.top + rect.height / 2, // Vertically in the middle of the progress bar
      });
      sliderBar.dispatchEvent(mousedownEvent);

      // Optionally, trigger a mouseup event
      const mouseupEvent = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: clickX,
        clientY: rect.top + rect.height / 2,
      });
      sliderBar.dispatchEvent(mouseupEvent);

      console.log("Slider position updated to:", message.data);
      return true;
    } else {
      console.error("Progress bar or slider element not found.");
    }
  }

  if (message.action === "updateQueue") {
    const side = document.querySelector(".side-panel");
    const playlist = [
      ...side.querySelectorAll("ytmusic-player-queue-item"),
    ].map((e) => {
      const [title, artist, duration] = [
        ...e.querySelectorAll("yt-formatted-string.ytmusic-player-queue-item"),
      ];
      return {
        cover: e.querySelector("img").src,
        title: title.textContent,
        duration: duration.textContent,
        artist: [
          {
            artist: artist.textContent,
            href: "",
          },
        ],
      };
    });
    sendResponse({
      queue: playlist,
    });
  }
});
