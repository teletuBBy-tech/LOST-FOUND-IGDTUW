import React from "react";
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"], // ensures websocket preferred
  withCredentials: true,
});

export default socket;
