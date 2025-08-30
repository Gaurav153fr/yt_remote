document.addEventListener('DOMContentLoaded', function() {
  const sendMessageBtn = document.getElementById("sendMessage");
  const createRoomBtn = document.getElementById("createRoom");
  const feedbackDiv = document.getElementById("feedback");
  const roomStatusSpan = document.getElementById("roomStatus");

  // Initial sync when the popup is opened
  getRoomIdAndDisplay();

  // Button handlers
  sendMessageBtn.addEventListener("click", getRoomIdAndDisplay);

  createRoomBtn.addEventListener("click", () => {
    // This button could be used to trigger a room creation if needed
    // For now, it's just a placeholder to show the logic.
    // A real implementation would send a message to background.js
    // to create a new room, and the response would update the UI.
    chrome.runtime.sendMessage({ type: "createRoom" }, (response) => {
      console.log("Room creation requested:", response);
      if (response && response.status === "ok") {
        feedbackDiv.innerText = "New room created successfully!";
      } else {
        feedbackDiv.innerText = "Failed to create a new room.";
      }
    });
  });

  // Listen for real-time updates from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "roomUpdate") {
      updateRoomStatus(message.roomId);
    }
  });

  function getRoomIdAndDisplay() {
    chrome.runtime.sendMessage({ type: "getRoomId" }, (response) => {
      console.log("Got roomId from background:", response.roomId);
      updateRoomStatus(response.roomId);
    });
  }

  function updateRoomStatus(roomId) {
    if (roomId) {
      roomStatusSpan.innerText = `Current room: ${roomId}`;
      feedbackDiv.innerText = ""; // Clear any previous feedback
    } else {
      roomStatusSpan.innerText = `No active room.`;
      feedbackDiv.innerText = "";
    }
  }
});