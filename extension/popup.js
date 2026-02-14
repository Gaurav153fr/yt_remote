document.addEventListener('DOMContentLoaded', function() {
  const createRoomBtn = document.getElementById("createRoom");
  const newRoomBtn = document.getElementById("newRoomBtn");
  const roomCodeEl = document.getElementById("roomCode");
  const roomUrlEl = document.getElementById("roomUrl");
  const noRoomView = document.getElementById("noRoomView");
  const activeRoomView = document.getElementById("activeRoomView");
  const feedback = document.getElementById("feedback");
  
  let qrCodeInstance = null;

  // 1. Check for existing room on open
  chrome.runtime.sendMessage({ type: "getRoomId" }, (response) => {
    if (response && response.roomId) {
      updateUI(response.roomId);
    }
  });

  // 2. Click to Copy Room Code
  roomCodeEl.addEventListener('click', () => copyToClipboard(roomCodeEl.textContent));
  
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