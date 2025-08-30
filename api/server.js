const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");
const { log } = require("console");

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static("public"));
app.set("view engine", "ejs");

// In-memory room storage
let rooms = {}; // { roomCode: { members: [socketId,...] } }

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  // Create a new room
  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // random 6-char
    rooms[roomCode] = { members: [] };

    socket.join(roomCode);
    rooms[roomCode].members.push(socket.id);

    socket.emit("roomCreated", { roomCode });
    console.log(`Room created: ${roomCode}`);
  });

// Server: accept roomCode as string (not object)
socket.on("joinRoom", (roomCode) => {
  if (rooms[roomCode]) {
    if (!rooms[roomCode].members.includes(socket.id)) {
      socket.join(roomCode);
      rooms[roomCode].members.push(socket.id);

      io.to(roomCode).emit("roomUpdate", {
        members: rooms[roomCode].members.length,
        message: `A new user joined room ${roomCode}`,
      });

      socket.emit("joinedRoom", { roomCode });
      console.log(`User ${socket.id} joined room: ${roomCode}`);
    } else {
      socket.emit("errorMessage", "You are already in this room!");
    }
  } else {
    socket.emit("errorMessage", "Room not found!");
  }
});
socket.on("song", ({ roomCode, text }) => {
console.log("Received song data:", text);

  // Broadcast to everyone else in the room
  socket.to(roomCode).emit("song", { text });
});
socket.on("nextSong", ({ roomCode }) => {
  console.log(`Next song in room ${roomCode}`);
  
  // Broadcast to everyone else in the room
  socket.to(roomCode).emit("nextSong");
});
socket.on("prevSong", ({ roomCode }) => {
  
  // Broadcast to everyone else in the room
  socket.to(roomCode).emit("prevSong");
});
socket.on("play_pause", ({ roomCode }) => {
  
  // Broadcast to everyone else in the room
  socket.to(roomCode).emit("play_pause");
});
socket.on("slider", ({ roomCode, value }) => {
  
  // Broadcast to everyone else in the room
  socket.to(roomCode).emit("slider", value);
});
socket.on("message", (msg) => {
  console.log("Received:", msg);

  // Send message back to all in the same rooms
  const roomsJoined = Array.from(socket.rooms).filter(r => r !== socket.id);
  roomsJoined.forEach(roomCode => {
    io.to(roomCode).emit("message", msg);
  });
});

  // Handle disconnection
  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const index = rooms[roomCode].members.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomCode].members.splice(index, 1);
        io.to(roomCode).emit("roomUpdate", {
          members: rooms[roomCode].members.length,
          message: "A user left the room",
        });

        if (rooms[roomCode].members.length === 0) {
          setTimeout(() => {
            if (rooms[roomCode] && rooms[roomCode].members.length === 0) {
              delete rooms[roomCode];
              console.log(`Room ${roomCode} deleted after timeout`);
            }
          }, 10000); // wait 10 seconds before deleting
        }
        
      }
    }
    console.log("A client disconnected:", socket.id);
  });
});


// Home page
app.get("/", (req, res) => {
  res.render("index", { ipAddress: LOCAL_IP, port: 3000 });
});

// Dynamic room page
app.get("/room/:roomCode", (req, res) => {
  const { roomCode } = req.params;
  if (rooms[roomCode]) {
    res.render("room", { roomCode });
  } else {
    res.send("Room not found!");
  }
});

// Get local IP dynamically

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});