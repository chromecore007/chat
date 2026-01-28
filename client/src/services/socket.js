import { io } from "socket.io-client";

const socket = io("https://chat-01rn.onrender.com");

export default socket;
