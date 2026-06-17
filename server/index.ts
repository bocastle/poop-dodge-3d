import { createServer } from "node:http";
import { Server } from "socket.io";
import { createRoomStore } from "./rooms";
import { registerSocketHandlers } from "./socketHandlers";

const port = process.env.PORT ? Number(process.env.PORT) : 5174;
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
  },
});
const store = createRoomStore();

registerSocketHandlers(io, store);

httpServer.listen(port, () => {
  console.log(`multiplayer server listening on ${port}`);
});
