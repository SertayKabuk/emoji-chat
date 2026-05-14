import * as signalR from "@microsoft/signalr";

export function createConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl("/hubs/chat", {
      accessTokenFactory: () => localStorage.getItem("emoji-chat-token") || "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();
}
