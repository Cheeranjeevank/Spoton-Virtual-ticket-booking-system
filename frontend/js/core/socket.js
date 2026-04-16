import { getApiBase } from "./config.js";

export const socket = io(getApiBase().replace("/api", ""), {
  transports: ["websocket"]
});