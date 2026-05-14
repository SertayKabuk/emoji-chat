import { useState, useEffect, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { api, type MessageDto, type RoomDto } from "@/lib/api";
import { createConnection } from "@/lib/signalr";

interface MessagePayload {
  id: string;
  emoji: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface ReactionPayload {
  id: string;
  emoji: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  messageId: string | null;
  parentReactionId: string | null;
  createdAt: string;
}

export function useChat() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [discoverRooms, setDiscoverRooms] = useState<RoomDto[]>([]);
  const [_activeRoomId, _setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const prevRoomRef = useRef<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const getConnection = useCallback(() => {
    if (!connectionRef.current) {
      connectionRef.current = createConnection();
    }

    return connectionRef.current;
  }, []);

  const setActiveRoomId = useCallback((id: string | null) => {
    _setActiveRoomId(id);
    if (id) {
      setIsLoadingMessages(true);
      setMessages([]);
      setHasMoreMessages(true);
    }
  }, []);

  // Load rooms
  const loadRooms = useCallback(async () => {
    const data = await api.rooms.list();
    setRooms(data);
  }, []);

  const loadDiscoverRooms = useCallback(async () => {
    const data = await api.rooms.discover();
    setDiscoverRooms(data);
  }, []);

  // Connect to SignalR
  useEffect(() => {
    let mounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    const conn = getConnection();

    const scheduleRetry = () => {
      if (!mounted) return;

      clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => {
        void connect();
      }, 3000);
    };

    const connect = async () => {
      if (!mounted || conn.state !== signalR.HubConnectionState.Disconnected) {
        return;
      }

      try {
        await conn.start();
        if (mounted) {
          console.log("SignalR connected");
          setIsConnected(true);
        }
      } catch (err) {
        if (!mounted) return;

        console.error("SignalR connection failed, retrying in 3s...", err);
        setIsConnected(false);
        scheduleRetry();
      }
    };

    conn.onreconnecting(() => {
      if (mounted) setIsConnected(false);
    });
    conn.onreconnected(() => {
      if (mounted) setIsConnected(true);
    });
    conn.onclose(() => {
      if (!mounted) return;

      setIsConnected(false);
      scheduleRetry();
    });

    void connect();

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      connectionRef.current = null;
      void conn.stop();
    };
  }, [getConnection]);

  // Set up message handlers
  useEffect(() => {
    if (!isConnected) return;

    const conn = getConnection();

    const onReceiveMessage = (payload: MessagePayload) => {
      const msg: MessageDto = {
        id: payload.id,
        emoji: payload.emoji,
        user: {
          id: payload.userId,
          displayName: payload.displayName,
          avatarUrl: payload.avatarUrl,
        },
        createdAt: payload.createdAt,
        reactions: [],
      };
      setMessages((prev) => [...prev, msg]);
    };

    const onReceiveReaction = (payload: ReactionPayload) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (payload.messageId === msg.id) {
            return {
              ...msg,
              reactions: [
                ...msg.reactions,
                {
                  id: payload.id,
                  emoji: payload.emoji,
                  user: {
                    id: payload.userId,
                    displayName: payload.displayName,
                    avatarUrl: payload.avatarUrl,
                  },
                  createdAt: payload.createdAt,
                  childReactions: [],
                },
              ],
            };
          }
          // Check nested reactions
          return {
            ...msg,
            reactions: addNestedReaction(msg.reactions, payload),
          };
        })
      );
    };

    const onReactionRemoved = (reactionId: string) => {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          reactions: removeReaction(msg.reactions, reactionId),
        }))
      );
    };

    conn.on("ReceiveMessage", onReceiveMessage);
    conn.on("ReceiveReaction", onReceiveReaction);
    conn.on("ReactionRemoved", onReactionRemoved);

    return () => {
      conn.off("ReceiveMessage", onReceiveMessage);
      conn.off("ReceiveReaction", onReceiveReaction);
      conn.off("ReactionRemoved", onReactionRemoved);
    };
  }, [getConnection, isConnected]);

  // Join/leave room when active room changes
  useEffect(() => {
    if (!isConnected) return;

    const conn = getConnection();

    if (prevRoomRef.current) {
      conn.invoke("LeaveRoom", prevRoomRef.current).catch(console.error);
    }

    if (_activeRoomId) {
      conn.invoke("JoinRoom", _activeRoomId).catch(console.error);
      
      // Load message history - initialization happens in setActiveRoomId wrapper
      let mounted = true;
      api.messages
        .list(_activeRoomId)
        .then((msgs) => {
          if (mounted) {
            setMessages(msgs);
            setHasMoreMessages(msgs.length >= 50);
          }
        })
        .finally(() => {
          if (mounted) setIsLoadingMessages(false);
        });

      return () => {
        mounted = false;
      };
    }

    prevRoomRef.current = _activeRoomId;
  }, [_activeRoomId, getConnection, isConnected]);

  // Load more messages (infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!_activeRoomId || !hasMoreMessages || isLoadingMessages) return;
    if (messages.length === 0) return;

    setIsLoadingMessages(true);
    const oldest = messages[0];
    const older = await api.messages.list(_activeRoomId, oldest.createdAt);
    setHasMoreMessages(older.length >= 50);
    setMessages((prev) => [...older, ...prev]);
    setIsLoadingMessages(false);
  }, [_activeRoomId, hasMoreMessages, isLoadingMessages, messages]);

  // Send emoji
  const sendEmoji = useCallback(
    async (emoji: string) => {
      if (!_activeRoomId || !isConnected) return false;
      const conn = getConnection();
      await conn.invoke("SendEmoji", _activeRoomId, emoji);
      return true;
    },
    [_activeRoomId, getConnection, isConnected]
  );

  // Add reaction
  const addReaction = useCallback(
    async (targetId: string, targetType: "message" | "reaction", emoji: string) => {
      if (!isConnected) return;
      const conn = getConnection();
      await conn.invoke("AddReaction", targetId, targetType, emoji);
    },
    [getConnection, isConnected]
  );

  // Remove reaction
  const removeReaction_ = useCallback(
    async (reactionId: string) => {
      if (!isConnected) return;
      const conn = getConnection();
      await conn.invoke("RemoveReaction", reactionId);
    },
    [getConnection, isConnected]
  );

  // Create room
  const createRoom = useCallback(
    async (name: string, emoji: string) => {
      const room = await api.rooms.create(name, emoji);
      setRooms((prev) => [room, ...prev]);
      setActiveRoomId(room.id);
    },
    [setActiveRoomId]
  );

  // Join room
  const joinRoom = useCallback(async (roomId: string) => {
    await api.rooms.join(roomId);
    await loadRooms();
    await loadDiscoverRooms();
    setActiveRoomId(roomId);
  }, [loadRooms, loadDiscoverRooms, setActiveRoomId]);

  // Leave room
  const leaveRoom = useCallback(
    async (roomId: string) => {
      await api.rooms.leave(roomId);
      if (_activeRoomId === roomId) {
        setActiveRoomId(null);
        setMessages([]);
      }
      await loadRooms();
    },
    [_activeRoomId, loadRooms, setActiveRoomId]
  );

  return {
    rooms,
    discoverRooms,
    activeRoomId: _activeRoomId,
    messages,
    isConnected,
    isLoadingMessages,
    hasMoreMessages,
    setActiveRoomId,
    loadRooms,
    loadDiscoverRooms,
    loadMoreMessages,
    sendEmoji,
    addReaction,
    removeReaction: removeReaction_,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}


// Helper: add a reaction nested within the reaction tree
function addNestedReaction(
  reactions: MessageDto["reactions"],
  payload: ReactionPayload
): MessageDto["reactions"] {
  return reactions.map((r) => {
    if (payload.parentReactionId === r.id) {
      return {
        ...r,
        childReactions: [
          ...r.childReactions,
          {
            id: payload.id,
            emoji: payload.emoji,
            user: {
              id: payload.userId,
              displayName: payload.displayName,
              avatarUrl: payload.avatarUrl,
            },
            createdAt: payload.createdAt,
            childReactions: [],
          },
        ],
      };
    }
    return {
      ...r,
      childReactions: addNestedReaction(r.childReactions, payload),
    };
  });
}

// Helper: remove a reaction from the tree
function removeReaction(
  reactions: MessageDto["reactions"],
  reactionId: string
): MessageDto["reactions"] {
  return reactions
    .filter((r) => r.id !== reactionId)
    .map((r) => ({
      ...r,
      childReactions: removeReaction(r.childReactions, reactionId),
    }));
}
