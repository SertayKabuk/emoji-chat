import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { RoomSidebar } from "@/components/RoomSidebar";
import { MessageList } from "@/components/MessageList";
import { EmojiPicker } from "@/components/EmojiPicker";
import { UserAvatar } from "@/components/UserAvatar";

const quickSendEmojis = ["😀", "😂", "❤️", "🔥", "👍", "😍", "🎉", "🤔", "😢", "👋", "✨", "🙏"];

export function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const {
    rooms, discoverRooms, activeRoomId, messages,
    isConnected, isLoadingMessages, hasMoreMessages,
    setActiveRoomId, loadRooms, loadDiscoverRooms, loadMoreMessages,
    sendEmoji, addReaction, removeReaction, createRoom, joinRoom, leaveRoom,
  } = useChat();

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  if (!user) return null;

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="chat-page">
      <RoomSidebar
        rooms={rooms}
        discoverRooms={discoverRooms}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onLoadRooms={loadRooms}
        onLoadDiscover={loadDiscoverRooms}
      />

      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            {activeRoom ? (
              <>
                <span className="chat-room-emoji">{activeRoom.emoji}</span>
                <h2 className="chat-room-name">{activeRoom.name}</h2>
                <span className="chat-room-members">{activeRoom.memberCount} members</span>
              </>
            ) : (
              <h2 className="chat-room-name">Select a room</h2>
            )}
          </div>
          <div className="chat-header-right">
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? "online" : "offline"}`} />
              <span className="status-text">{isConnected ? "Connected" : "Reconnecting..."}</span>
            </div>
            <div className="user-menu">
              <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
              <span className="user-name">{user.displayName}</span>
              <button className="btn-logout" onClick={logout}>Sign out</button>
            </div>
          </div>
        </header>

        {/* Messages */}
        {activeRoom ? (
          <>
            <MessageList
              messages={messages}
              currentUserId={user.id}
              isLoading={isLoadingMessages}
              hasMore={hasMoreMessages}
              onLoadMore={loadMoreMessages}
              onAddReaction={addReaction}
              onRemoveReaction={removeReaction}
            />

            {/* Input bar */}
            <div className="chat-input-bar">
              <div className="input-bar-hint">Tap an emoji to send</div>
              <div className="quick-send-row">
                {quickSendEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    className="quick-send-btn"
                    onClick={() => sendEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  className={`quick-send-more ${showEmojiPicker ? "active" : ""}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Browse all emojis"
                >
                  {showEmojiPicker ? "✕" : "＋"}
                </button>
              </div>

              {showEmojiPicker && (
                <div className="chat-emoji-picker">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      sendEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>Welcome to Emoji Chat!</h3>
            <p>Select a room from the sidebar or create a new one to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
}
