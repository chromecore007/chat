const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const Message = require("./models/Message");
const path = require("path");
const uploadRoutes = require("./routes/uploadRoutes");


dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/follow", require("./routes/followRoutes"));
app.use("/api/upload", uploadRoutes);


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://chat-black-gamma-80.vercel.app",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join", (userId) => {
    socket.userId = userId;
    socket.join(userId);
    onlineUsers.add(userId);
    io.emit("onlineUsers", Array.from(onlineUsers));
  });

  // ================= SEND MESSAGE =================
  socket.on(
  "privateMessage",
  async ({ sender, receiver, text = "", file, fileType }) => {
    try {
      const conversationId = [sender, receiver].sort().join("_");

      const msg = await Message.create({
        sender,
        receiver,
        conversationId,
        text,
        file,
        fileType,
        status: "sent",
      });

      io.to(sender).emit("newMessage", {
        ...msg._doc,
        status: "sent",
      });

      io.to(receiver).emit("newMessage", {
        ...msg._doc,
        status: "delivered",
      });
    } catch (err) {
      console.error("❌ Message error:", err.message);
    }
  }
);


  // ================= SEEN =================
  socket.on("seenMessage", async ({ sender, receiver }) => {
    try {
      const conversationId = [sender, receiver].sort().join("_");

      const updated = await Message.updateMany(
        {
          conversationId,
          receiver,              // jo dekh raha hai
          status: { $ne: "seen" },
        },
        { $set: { status: "seen" } }
      );

      // 🔥 agar kuch actually seen hua tabhi emit
      if (updated.modifiedCount > 0) {
        io.to(sender).emit("messageSeen", { conversationId });
      }
    } catch (err) {
      console.error("❌ Seen error:", err.message);
    }
  });

  

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("onlineUsers", Array.from(onlineUsers));
    }
    console.log("❌ Disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on ${PORT}`)
);
