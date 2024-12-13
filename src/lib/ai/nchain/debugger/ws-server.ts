import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../../../logger";

export type WebSocketMessage = {
	name: string;
	timestamp: number;
	payload: unknown;
};

export class WSServer {
	private static instance: WSServer;
	private wss: WebSocketServer;
	private clients: Set<WebSocket> = new Set();
	private started = false;

	private constructor(private port: number) {
		this.wss = new WebSocketServer({ port });
	}

	public start() {
		if (this.started) {
			logger().warn("Debug WebSocket server already started");
			return;
		}
		this.started = true;
		this.wss.on("connection", (ws) => {
			logger().info("Debug client connected");
			this.clients.add(ws);

			ws.on("close", () => {
				this.clients.delete(ws);
			});
		});
		logger().info("Debug WebSocket server started on port", this.port);
	}

	static getInstance(port: number = 1414): WSServer {
		if (!WSServer.instance) {
			WSServer.instance = new WSServer(port);
		}
		return WSServer.instance;
	}

	dispatch(name: string, data: unknown) {
		const message: WebSocketMessage = {
			name,
			timestamp: performance.now(),
			payload: data,
		};
		const payload = JSON.stringify(message);
		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(payload);
			}
		});
	}
}

export function debug(name: string, data: unknown) {
	WSServer.getInstance().dispatch(name, data);
}

export function remoteLog(...data: unknown[]) {
	WSServer.getInstance().dispatch("log", data);
}
