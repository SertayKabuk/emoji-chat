import { useState, useEffect, useCallback, useRef } from "react";
import { api, type MessageDto, type RoomDto } from "@/lib/api";
import {
  getConnection,
  startConnection,
  stopConnection,
  resetConnection,
} from "@/lib/signalr";

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
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = async () => {
      try {
        // Reset stale connection before retrying
        const conn = getConnection();
        if (conn.state === "Disconnected") {
          await conn.start();
          console.log("SignalR connected");
          if (mounted) setIsConnected(true);
        }
      } catch (err) {
        console.error("SignalR connection failed, retrying in 3s...", err);
        // Reset connection so a fresh one is created on retry
        resetConnection();
        if (mounted) {
          setIsConnected(false);
          retryTimeout = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    // Track reconnection state
    const conn = getConnection();
    conn.onreconnecting(() => mounted && setIsConnected(false));
    conn.onreconnected(() => mounted && setIsConnected(true));
    conn.onclose(() => {
      if (mounted) {
        setIsConnected(false);
        // Try to reconnect after close
        resetConnection();
        retryTimeout = setTimeout(connect, 3000);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      stopConnection();
    };
  }, []);

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
  }, [isConnected]);

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
  }, [_activeRoomId, isConnected]);

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
      if (!_activeRoomId || !isConnected) return;
      const conn = getConnection();
      await conn.invoke("SendEmoji", _activeRoomId, emoji);
    },
    [_activeRoomId, isConnected]
  );

  // Add reaction
  const addReaction = useCallback(
    async (targetId: string, targetType: "message" | "reaction", emoji: string) => {
      if (!isConnected) return;
      const conn = getConnection();
      await conn.invoke("AddReaction", targetId, targetType, emoji);
    },
    [isConnected]
  );

  // Remove reaction
  const removeReaction_ = useCallback(
    async (reactionId: string) => {
      if (!isConnected) return;
      const conn = getConnection();
      await conn.invoke("RemoveReaction", reactionId);
    },
    [isConnected]
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
