document.addEventListener('DOMContentLoaded', function() {
  const createRoomBtn = document.getElementById("createRoom");
  const newRoomBtn = document.getElementById("newRoomBtn");
  const roomCodeEl = document.getElementById("roomCode");
  const roomUrlEl = document.getElementById("roomUrl");
  const noRoomView = document.getElementById("noRoomView");
  const activeRoomView = document.getElementById("activeRoomView");
  const feedback = document.getElementById("feedback");
  const updateQueueBtn = document.getElementById("updateQueue");
  let qrCodeInstance = null;

  // 1. Check for existing room on open
  chrome.runtime.sendMessage({ type: "getRoomId" }, (response) => {
    if (response && response.roomId) {
      updateUI(response.roomId);
    }
  });

  // 2. Click to Copy Room Code
  roomCodeEl.addEventListener('click', () => copyToClipboard(roomCodeEl.textContent));
  updateQueueBtn.addEventListener('click', () => {
    getQueue().then(queue => {
      showToast("Queue Updated!");
    });})
  // 3. Click to Copy/Open URL
  roomUrlEl.addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard(roomUrlEl.textContent);
    window.open(roomUrlEl.textContent, '_blank');
  });

  // 4. Create Room Handlers
  createRoomBtn.onclick = () => createRoom();
  newRoomBtn.onclick = () => createRoom();

  function createRoom() {
    chrome.runtime.sendMessage({ type: "createRoom" }, (response) => {
      if (response && response.roomId) {
        updateUI(response.roomId);
        showToast("Room Created!");
      }
    });
  }

  async function getQueue() {
    // Use a Promise-based wrapper for the message
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getQueue" }, resolve);
    });
  
    if (!response || !response.queue) {
      console.error("Queue not found");
      return [];
    }
  
    const container = document.getElementById("queueData");
    container.innerHTML = ""; // Clear existing list to prevent duplicates
  
    response.queue.forEach((item, index) => {
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${item.title} - ${item.artist[0].artist}`;
      li.style.cursor = "pointer"; // Visual cue that it's clickable
  
      // Add the click listener
      li.addEventListener("click", () => {
        chrome.runtime.sendMessage(
          { type: "playQueue", data: index },
          (res) => {
            if (res?.status === "success") {
              showToast(`Playing: ${item.title}`);
            } else {
              showToast(`Failed to play: ${item.title}`);
            }
          }
        );
      });
  
      container.appendChild(li);
    });
  
    return response.queue;
  }
  getQueue();
  function updateUI(roomId) {
    const cleanCode = roomId.slice(-6).toUpperCase();
    const fullUrl = `https://yt-remote.onrender.com/room/${roomId}`;

    roomCodeEl.textContent = cleanCode;
    roomUrlEl.textContent = fullUrl;

    noRoomView.classList.add("hidden");
    activeRoomView.classList.remove("hidden");

    // Generate or Update QR
    const qrTarget = document.getElementById("qrcode");
    if (!qrCodeInstance) {
      qrCodeInstance = new QRCode(qrTarget, {
        text: fullUrl,
        width: 140,
        height: 140,
        colorDark: "#0f172a",
        colorLight: "#ffffff"
      });
    } else {
      qrCodeInstance.makeCode(fullUrl);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  }

  function showToast(msg) {
    feedback.textContent = msg;
    feedback.classList.remove("hidden");
    setTimeout(() => feedback.classList.add("hidden"), 2000);
  }
});