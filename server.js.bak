const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os"); // Import the os module

// Create an Express server
const app = express();
const server = http.createServer(app);

// Set up Socket.IO and CORS configuration
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow any origin (you can replace "*" with specific domains like "http://localhost:8080")
    methods: ["GET", "POST"],
  },
});

// Serve static files from the "public" directory
app.use(express.static("public"));
app.set("view engine", "ejs");

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("A client connected");
  socket.emit("message", "Welcome to the WebSocket server!");

  socket.on("message", (msg) => {
    console.log("Received from client:", msg);
    socket.emit("message", `Server received: ${msg}`);
  });

  socket.on("song", (data) => {
    console.log("Received song data:", data);
    socket.broadcast.emit("song", data);
  });

  socket.on("nextSong", () => {
    console.log("nextSong");
    socket.broadcast.emit("nextSong");
  });

  socket.on("prevSong", () => {
    console.log("prevSong");
    socket.broadcast.emit("prevSong");
  });

  socket.on("play_pause", () => {
    console.log("play_pause");
    socket.broadcast.emit("play_pause");
  });

  socket.on("slider", (data) => {
    console.log("Received slider data:", data);
    socket.broadcast.emit("slider", data);
  });

  socket.on("updateQueue", () => {
    console.log("updateQueue");
    socket.broadcast.emit("updateQueue");
  });

  socket.on("queue", (data) => {
    console.log("Received queue data:", data);
    socket.broadcast.emit("queue", data);
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Serve the main HTML file
app.get("/", (req, res) => {
  res.render("index", { ipAddress: LOCAL_IP, port: 3000 });
});
// Get local IP dynamically
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Check if it's IPv4 and not an internal (127.0.0.1) address
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1"; // Fallback
}

// Start the server
const LOCAL_IP = getLocalIP();
const PORT = 3000;
const HOST = LOCAL_IP;

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
