import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;

export function getConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/chat", {
      accessTokenFactory: () => localStorage.getItem("emoji-chat-token") || "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  return connection;
}

export async function startConnection(): Promise<void> {
  const conn = getConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
    console.log("SignalR connected");
  }
}

export async function stopConnection(): Promise<void> {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop();
    connection = null;
    console.log("SignalR disconnected");
  }
}

export function resetConnection(): void {
  connection = null;
}
