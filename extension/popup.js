document.addEventListener('DOMContentLoaded', function() {
  const sendMessageBtn = document.getElementById("sendMessage");
  const createRoomBtn = document.getElementById("createRoom");
  const feedbackDiv = document.getElementById("feedback");
  const roomStatusSpan = document.getElementById("roomStatus");
const quickPicksBtn = document.getElementById("quickPicks");
const toggleWidgetButton = document.getElementById("toggleWidget");

const toggleWidget = () => {
  const curr = toggleWidgetButton.getAttribute("data-state");

  SendToBackground({type:"toggleWidget",data:!curr});
}
  // Initial sync when the popup is opened
  getRoomIdAndDisplay();
quickPicksBtn.addEventListener("click", quickPicks);
  // Button handlers
  sendMessageBtn.addEventListener("click", getRoomIdAndDisplay);


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

  function quickPicks() {
    chrome.runtime.sendMessage({ type: "quickPicks" }, (response) => {
      console.log("got that response",response);
      
      const pDiv= document.getElementById("quickPicksContainer");
      response.data.forEach((song) => {
        const songDiv = document.createElement("div");

        songDiv.innerHTML = song.title + " - " + song.artist;
        songDiv.style.cursor = "pointer";
        songDiv.style.marginBottom = "8px";
        songDiv.style.backgroundColor = "#f0f0f0";
        songDiv.style.padding = "5px";
        songDiv.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "playQuick", action: "playSong", data: song.href }, (response) => {
            if (response.ok) {
              feedbackDiv.innerText = `Playing: ${song.title} by ${song.artist}`;
            } else {
              feedbackDiv.innerText = `Error: ${response.error}`;
            }
          });
        })
        pDiv.appendChild(songDiv);
      });
    });
  }

});




function SendToBackground({type,data}) {
  chrome.runtime.sendMessage({type:type,data:data},(res)=>{
    return res
  })
}



document.getElementById("saveSettings").addEventListener("click",()=>{
  const miniPlayerEnabled = document.getElementById("toggleMini")
  const data={miniPlayerEnabled:miniPlayerEnabled.checked};
 chrome.storage.local.set({settings:data},()=>{console.log("Settings saved",data); SendToBackground({type:"saveSettings",data:data}); })
})