import { useEffect, useState, useRef } from "react";
import API from "../services/api"; 
import axios from "axios";
import io from "socket.io-client";
import "./Chat.css";

const socket = io("https://chat-01rn.onrender.com");

export default function Chat() {
  const token = sessionStorage.getItem("token");
  const bottomRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState({});

  const [notify, setNotify] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
const [previewFiles, setPreviewFiles] = useState([]);
const [previewUrl, setPreviewUrl] = useState(null);
const [isRecording, setIsRecording] = useState(false);
const [audioBlob, setAudioBlob] = useState(null);
const [audioUrl, setAudioUrl] = useState(null);
const [recordTime, setRecordTime] = useState(0);
const timerRef = useRef(null);
const [viewImage, setViewImage] = useState(null);



const mediaRecorderRef = useRef(null);
const audioChunksRef = useRef([]);



  // 🔥 sidebar view control
  const [sideView, setSideView] = useState(null);
  // null | "requests" | "users"

  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const getConversationId = (a, b) => [a, b].sort().join("_");

  /* ================= AUTH ================= */
  useEffect(() => {
    if (!token) {
      window.location.href = "/";
      return;
    }

    axios
      .get("https://chat-01rn.onrender.com/api/users/me", authHeader)
      .then((res) => setCurrentUser(res.data))
      .catch(() => {
        sessionStorage.clear();
        window.location.href = "/";
      });
  }, []);

  /* ================= USERS ================= */
  useEffect(() => {
    if (!currentUser) return;

    axios
      .get("https://chat-01rn.onrender.com/api/users", authHeader)
      .then((res) =>
        setUsers(res.data.filter((u) => u._id !== currentUser._id))
      );
  }, [currentUser]);

  /* ================= CONNECTIONS & REQUESTS ================= */
  useEffect(() => {
    if (!currentUser) return;

    axios
      .get("https://chat-01rn.onrender.com/api/follow/connections", authHeader)
      .then((res) => setConnections(res.data || []));

    axios
      .get("https://chat-01rn.onrender.com/api/follow/requests", authHeader)
      .then((res) => setRequests(res.data || []));
      
      axios
  .get("https://chat-01rn.onrender.com/api/follow/sent", authHeader)
  .then((res) => {
    console.log("SENT REQUESTS 👉", res.data); // 🔥
    setSentRequests(res.data || []);
  });

  }, [currentUser]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!currentUser) return;

    socket.emit("join", currentUser._id);

    socket.on("newMessage", (msg) => {
      const cid = getConversationId(msg.sender, msg.receiver);

      setMessages((prev) => ({
        ...prev,
        [cid]: [...(prev[cid] || []), msg],
      }));

      if (
        selectedUser?._id !== msg.sender &&
        msg.sender !== currentUser._id
      ) {
        setUnread((prev) => ({
          ...prev,
          [msg.sender]: (prev[msg.sender] || 0) + 1,
        }));
      }
    });

    socket.on("messageSeen", ({ conversationId }) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) =>
          m.sender === currentUser._id
            ? { ...m, status: "seen" }
            : m
        ),
      }));
    });

    socket.on("onlineUsers", (u) => setOnlineUsers(u || []));

    return () => socket.off();
  }, [currentUser, selectedUser]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const cid = getConversationId(currentUser._id, selectedUser._id);

    axios
      .get(
        `https://chat-01rn.onrender.com/api/messages/${selectedUser._id}`,
        authHeader
      )
      .then((res) => {
        const msgs = res.data || [];

        setMessages((prev) => ({
          ...prev,
          [cid]: msgs,
        }));

        const shouldEmitSeen = msgs.some(
          (m) =>
            m.sender === selectedUser._id &&
            m.receiver === currentUser._id &&
            m.status !== "seen"
        );

        if (shouldEmitSeen) {
          socket.emit("seenMessage", {
            sender: selectedUser._id,
            receiver: currentUser._id,
          });
        }
      });

    setUnread((prev) => ({ ...prev, [selectedUser._id]: 0 }));
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const cid = getConversationId(currentUser._id, selectedUser._id);
    const msgs = messages[cid] || [];

    const hasUnseenIncoming = msgs.some(
      (m) =>
        m.sender === selectedUser._id &&
        m.receiver === currentUser._id &&
        m.status !== "seen"
    );

    if (hasUnseenIncoming) {
      socket.emit("seenMessage", {
        sender: selectedUser._id,
        receiver: currentUser._id,
      });
    }
  }, [messages, selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  /* ================= HELPERS ================= */
  const isConnected = (id) =>
    connections.some(
      (c) =>
        (c.sender?._id === id || c.receiver?._id === id) &&
        c.status !== "disconnected"
    );

const isRequested = (id) =>
  sentRequests.some(
    (r) =>
      r.receiver === id ||
      r.receiver?._id === id
  );



  const isOnline = (id) => onlineUsers.includes(id);

  const isConnectedWithSelectedUser = () =>
    selectedUser && isConnected(selectedUser._id);

  /* ================= ACTIONS ================= */
  const sendFollow = async (id) => {
    try {
      await axios.post(
        `https://chat-01rn.onrender.com/api/follow/send/${id}`,
        {},
        authHeader
      );
       setSentRequests((prev) =>
  prev.some((r) => r.receiver?._id === id)
    ? prev
    : [...prev, { receiver: { _id: id } }]
);

      setNotify("Follow request sent ✅");
    } catch {
      setNotify("Something went wrong ❌");
    }
    setTimeout(() => setNotify(""), 3000);
  };

  const acceptRequest = (id) =>
    axios
      .post(`https://chat-01rn.onrender.com/api/follow/accept/${id}`, {}, authHeader)
      .then(() => window.location.reload());

  const rejectRequest = (id) =>
    axios
      .post(`https://chat-01rn.onrender.com/api/follow/reject/${id}`, {}, authHeader)
      .then(() => window.location.reload());

  const disconnectUser = async (id) => {
    try {
      await axios.post(
        `https://chat-01rn.onrender.com/api/follow/disconnect/${id}`,
        {},
        authHeader
      );

      setNotify("Disconnected ❌");
      setSelectedUser(null);

      const res = await axios.get(
        "https://chat-01rn.onrender.com/api/follow/connections",
        authHeader
      );
      setConnections(res.data || []);
    } catch {
      setNotify("Failed to disconnect ❌");
    }
    setTimeout(() => setNotify(""), 3000);
  };

const sendMessage = () => {
  if (!selectedUser || !isConnectedWithSelectedUser()) return;

  // 🎤 VOICE SEND
  if (audioBlob) {
    sendAudioToServer(audioBlob);
    setAudioBlob(null);
    setAudioUrl(null);
    return;
  }

  // 🖼 images (already handled)
  if (previewFiles?.length > 0) {
    previewFiles.forEach((p) => sendFileToServer(p.file));
    setPreviewFiles([]);
    return;
  }

  // 📝 text
  if (!message.trim()) return;

  socket.emit("privateMessage", {
    sender: currentUser._id,
    receiver: selectedUser._id,
    text: message,
  });

  setMessage("");
};

const sendAudioToServer = async (blob) => {
  try {
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");

    const res = await API.post("/upload", formData);

    socket.emit("privateMessage", {
      sender: currentUser._id,
      receiver: selectedUser._id,
      text: "",
      file: res.data.url,       // 🔥 CLOUDINARY
      fileType: res.data.fileType,
    });
  } catch (err) {
    console.log("Audio upload error", err);
  }
};



const downloadImage = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = blobUrl;
    a.download = "image.jpg"; // ya dynamic name
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    alert("Download failed");
  }
};




const handleFile = (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const images = files.filter((f) =>
    f.type.startsWith("image")
  );

  const others = files.filter(
    (f) => !f.type.startsWith("image")
  );

  // image preview
  const previews = images.map((file) => ({
    file,
    url: URL.createObjectURL(file),
  }));

  setPreviewFiles((prev) => [...prev, ...previews]);

  // non-image → direct send
  others.forEach((file) => sendFileToServer(file));
};



const sendFileToServer = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await API.post("/upload", formData);
    console.log("UPLOAD RESPONSE 👉", res.data);


    socket.emit("privateMessage", {
      sender: currentUser._id,
      receiver: selectedUser._id,
      text: "",
      file: res.data.url,       // 🔥 CLOUDINARY URL
      fileType: res.data.fileType,
    });
  } catch (err) {
    console.log("Upload error", err);
  }
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current.start();

    // ⏱️ TIMER START
    setRecordTime(0);
    timerRef.current = setInterval(() => {
      setRecordTime((t) => t + 1);
    }, 1000);

    setIsRecording(true);
  } catch (err) {
    alert("Microphone permission denied");
  }
};


const stopRecording = () => {
  if (mediaRecorderRef.current && isRecording) {
    mediaRecorderRef.current.stop();
    setIsRecording(false);

    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};

const getInlinePdfUrl = (url) => {
  if (!url) return url;

  if (url.endsWith(".pdf")) {
    return `${url}?response-content-disposition=inline`;
  }

  return url;
};









  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  if (!currentUser) return null;

  const convId =
    selectedUser &&
    getConversationId(currentUser._id, selectedUser._id);

  return (
    <div className="app">
      {notify && <div className="notification">{notify}</div>}

      {/* ================= SIDEBAR ================= */}
      <div className={`sidebar ${showSidebar ? "show" : ""}`}>
        <div className="profile">
          👋 {currentUser.name}
          <div className="username">@{currentUser.username}</div>
        </div>

        {/* ===== MAIN SIDEBAR : CHATS ===== */}
       {sideView === null && (
  <>
    {/* ===== HEADER ===== */}
    <div className="user-header">
      <span className="heading">Chats</span>
      <input
        className="search"
        placeholder="Search users"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* ===== BUTTONS (ABOVE CHATS) ===== */}
    {requests.length > 0 && (
      <div
        className="open-side-btn"
        onClick={() => setSideView("requests")}
      >
        Requests ({requests.length})
      </div>
    )}

    <div
      className="open-side-btn"
      onClick={() => setSideView("users")}
    >
      Find  All Users
    </div>

    {/* ===== CONNECTED CHATS (LAST) ===== */}
    {users
      .filter(
        (u) =>
          isConnected(u._id) &&
          u.username
            ?.toLowerCase()
            .includes(search.toLowerCase())
      )
      .map((u) => (
        <div
          key={u._id}
          className="user-card"
          onClick={() => {
            setSelectedUser(u);
            setShowSidebar(false);
          }}
        >
          <div className="side-avatar">
            {u.name.charAt(0).toUpperCase()}
          </div>

          <div className="user-info">
            <div className="uname">@{u.username}</div>
            <div className="name">{u.name}</div>
          </div>

          {unread[u._id] > 0 && (
            <span className="unread-badge">
              {unread[u._id]}
            </span>
          )}
        </div>
      ))}
  </>
)}


        {/* ===== REQUESTS SIDEBAR ===== */}
        {sideView === "requests" && (
          <div className="side-panel">
            <div className="side-header">
              <button onClick={() => setSideView(null)}>←</button>
              <span>Requests</span>
            </div>

            {requests.map((r) => (
              <div key={r._id} className="user-card">
                <div className="side-avatar">
                  {r.sender.name.charAt(0).toUpperCase()}
                </div>

                <div className="user-info">
                  <div className="uname">@{r.sender.username}</div>
                  <div className="name">{r.sender.name}</div>
                </div>

                <div className="request-actions">
                  <button onClick={() => acceptRequest(r._id)}>✓</button>
                  <button onClick={() => rejectRequest(r._id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== FIND USERS SIDEBAR ===== */}
        {sideView === "users" && (
          <div className="side-panel">
            <div className="side-header">
              <button onClick={() => setSideView(null)}>←</button>
              <span>Find Users</span>
            </div>

            <input
              className="search"
              placeholder="Search users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {users
              .filter((u) =>
                !isConnected(u._id) &&
                u.username
                  ?.toLowerCase()
                  .includes(search.toLowerCase())
              )
              .map((u) => (
                <div key={u._id} className="user-card">
                  <div className="side-avatar">
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="user-info">
                    <div className="uname">@{u.username}</div>
                    <div className="name">{u.name}</div>
                  </div>

                  {!isConnected(u._id) && !isRequested(u._id) && (
                    <button
                      className="follow"
                      onClick={() => sendFollow(u._id)}
                    >
                      Follow
                    </button>
                  )}

                 {isRequested(u._id) && (
  <button className="requested-btn" disabled>
    Requested
  </button>
)}

                </div>
              ))}
          </div>
        )}

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      {/* ================= CHAT ================= */}
      <div className={`chat ${!showSidebar ? "show" : ""}`}>
        {selectedUser ? (
          <>
            <div className="chat-header">
              <div className="chat-user">
                <button
                  className="back-btn"
                  onClick={() => setShowSidebar(true)}
                >
                  ←
                </button>

                <div className="chat-avatar-wrapper">
                  <div className="chat-avatar">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  {isOnline(selectedUser._id) && (
                    <span className="chat-online-dot"></span>
                  )}
                </div>

                <span className="chat-username">
                  {selectedUser.name}
                </span>
              </div>

              {isConnectedWithSelectedUser() && (
                <button
                  className="disconnect-btn"
                  onClick={() =>
                    disconnectUser(selectedUser._id)
                  }
                >
                  Unfollow
                </button>
              )}
            </div>

            <div className="messages">
  {(messages[convId] || []).map((m, i) => (
    <div
      key={i}
      className={`bubble ${
        m.sender === currentUser._id ? "me" : ""
      }`}
    >
     {/* TEXT */}
{m.text && <span>{m.text}</span>}

{/* IMAGE */}
{m.file && m.fileType === "image" && (
  <img
    src={m.file}
    alt="img"
    className="chat-image"
    onClick={() => setViewImage(m.file)}
  />
)}

{/* VIDEO */}
{m.file && m.fileType === "video" && (
  <video controls className="chat-video">
    <source src={m.file} />
  </video>
)}

{/* 🎤 AUDIO */}
{m.file && m.fileType === "audio" && (
  <CustomAudio src={m.file} />
)}

{/* 📄 PDF / DOC / OTHER */}
{/* 📄 PDF FILE */}
{m.file &&
  m.fileType === "raw" &&
  m.file.endsWith(".pdf") && (
    <a
      href={m.file.replace("/raw/upload/", "/raw/upload/fl_inline/")}
      target="_blank"
      rel="noreferrer"
      className="chat-doc"
    >
      📄 Open PDF
    </a>
  )}






      {/* SEEN STATUS */}
      {m.sender === currentUser._id && (
        <span className={`seen ${m.status}`}>
          {m.status === "sent"
            ? "✔"
            : m.status === "delivered"
            ? "✔✔"
            : "✔✔"}
        </span>
      )}
    </div>
  ))}
  <div ref={bottomRef} />
</div>

{previewFiles.length > 0 && (
  <div className="image-preview-list">
    {previewFiles.map((p, index) => (
      <div key={index} className="image-preview-item">
        <img src={p.url} alt="preview" />

        <button
          className="preview-cancel"
          onClick={() =>
            setPreviewFiles((prev) =>
              prev.filter((_, i) => i !== index)
            )
          }
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}

{audioUrl && (
  <div className="audio-preview">
    <audio controls src={audioUrl}></audio>

    <button
      className="preview-cancel"
      onClick={() => {
        setAudioBlob(null);
        setAudioUrl(null);
      }}
    >
      ✕
    </button>
  </div>
)}





       <div className="input-box">
       {isRecording && (
  <div className="recording-ui">
    <span className="record-dot"></span>
    Recording {Math.floor(recordTime / 60)}:
    {(recordTime % 60).toString().padStart(2, "0")}
  </div>
)}

  {isConnectedWithSelectedUser() ? (
    <div className="chat-input-row">
      
      {/* INPUT + PLUS */}
      <div className="input-wrapper">
        <input
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
        />

     <span
  className={`mic-icon 
    ${message.trim() ? "hide" : ""} 
    ${isRecording ? "recording" : ""}
  `}
  onPointerDown={startRecording}
  onPointerUp={stopRecording}
>
  🎙️
</span>

<span
  className={`plus-icon ${message.trim() ? "hide" : ""}`}
  onClick={() => document.getElementById("fileInput").click()}
>
  +
</span>



       <input
  type="file"
  id="fileInput"
  hidden
  multiple
  accept="image/*,video/*,.pdf,.doc,.docx"
  onChange={handleFile}
/>

      </div>

      {/* SEND BUTTON OUTSIDE */}
      <button className="send-outside" onClick={sendMessage}>
        ➤
      </button>

    </div>
  ) : (
    <div className="chat-disabled">
      You are disconnected. Follow again to chat.
    </div>
  )}
</div>


          </>
        ) : (
          <div className="empty">
            Select a user to start chatting 💬
          </div>
        )}
      </div>
      {viewImage && (
  <div className="image-viewer">
    <button
      className="close-btn"
      onClick={() => setViewImage(null)}
    >
      ✕
    </button>

  <button
  className="download-btn"
  onClick={(e) => {
    e.stopPropagation();
    downloadImage(viewImage);
  }}
>
  ⬇
</button>


    <img src={viewImage} alt="full" />
  </div>
)}

    </div>
  );
}

function CustomAudio({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const onLoaded = () => {
    setDuration(audioRef.current.duration);
  };

  const format = (t) =>
    `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  return (
    <div className="audio-bubble custom-audio">
      <button onClick={togglePlay}>
        {playing ? "⏸" : "▶"}
      </button>

      <div className="audio-bar">
        <div
          className="audio-progress"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="audio-time">
        {audioRef.current
          ? format(audioRef.current.currentTime)
          : "0:00"}{" "}
        / {format(duration)}
      </span>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
