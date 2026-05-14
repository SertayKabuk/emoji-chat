import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { type UserDto } from "@/lib/api";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { MessageList } from "@/components/MessageList";
import { EmojiPicker } from "@/components/EmojiPicker";
import { UserAvatar } from "@/components/UserAvatar";

const quickSendEmojis = ["😀", "😂", "❤️", "🔥", "👍", "😍", "🎉", "🤔", "😢", "👋", "✨", "🙏"];

export function ChatPage() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [isLoading, navigate, user]);

  if (isLoading || !user) return null;

  return <AuthenticatedChatPage user={user} onLogout={logout} />;
}

function AuthenticatedChatPage({
  user,
  onLogout,
}: {
  user: UserDto;
  onLogout: () => void;
}) {
  const {
    rooms, discoverRooms, activeRoomId, messages,
    isConnected, isLoadingMessages, hasMoreMessages,
    setActiveRoomId, loadRooms, loadDiscoverRooms, loadMoreMessages,
    sendEmoji, addReaction, removeReaction, createRoom, joinRoom, leaveRoom,
  } = useChat();

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const [showCreate, setShowCreate] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadRooms();
    loadDiscoverRooms();
  }, [loadRooms, loadDiscoverRooms]);

  return (
    <div className="chat-page">
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            {activeRoom ? (
              <>
                <button 
                  onClick={() => setActiveRoomId(null)}
                  className="btn-back"
                  title="Back to rooms"
                >
                  ←
                </button>
                <span className="chat-room-emoji">{activeRoom.emoji}</span>
                <h2 className="chat-room-name">{activeRoom.name}</h2>
                <span className="chat-room-members">{activeRoom.memberCount} members</span>
              </>
            ) : (
              <h1 className="sidebar-title" style={{ margin: 0 }}>
                <span className="sidebar-logo">💬</span> Emoji Chat
              </h1>
            )}
          </div>
          <div className="chat-header-right">
            <div className="desktop-header-actions">
              <div className="connection-status">
                <span className={`status-dot ${isConnected ? "online" : "offline"}`} />
                <span className="status-text">{isConnected ? "Connected" : "Reconnecting..."}</span>
              </div>
              <div className="user-menu">
                <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
                <span className="user-name">{user.displayName}</span>
                <button className="btn-logout" onClick={onLogout}>Sign out</button>
              </div>
            </div>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title="Menu"
            >
              ☰
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="mobile-menu-dropdown">
            <div className="mobile-menu-item">
              <div className="connection-status">
                <span className={`status-dot ${isConnected ? "online" : "offline"}`} />
                <span className="status-text">{isConnected ? "Connected" : "Reconnecting..."}</span>
              </div>
            </div>
            <div className="mobile-menu-item">
              <div className="user-menu">
                <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
                <span className="user-name">{user.displayName}</span>
              </div>
            </div>
            <div className="mobile-menu-item">
              <button className="btn-logout w-full" onClick={onLogout}>Sign out</button>
            </div>
          </div>
        )}

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
              <ChatComposer key={activeRoomId} isConnected={isConnected} onSend={sendEmoji} />
            </div>
          </>
        ) : (
          <div className="home-dashboard">
            <div className="dashboard-header-actions">
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                ＋ New Room
              </button>
            </div>
            
            <div className="dashboard-content">
              <div className="dashboard-section">
                <h3 className="dashboard-section-title">Your Rooms</h3>
                {rooms.length === 0 ? (
                  <p className="dashboard-empty">No rooms yet. Create or join one!</p>
                ) : (
                  <div className="room-grid">
                    {rooms.map((room) => (
                      <div key={room.id} className="room-card" onClick={() => setActiveRoomId(room.id)}>
                        <div className="room-card-header">
                          <span className="room-card-emoji">{room.emoji}</span>
                          <button
                            className="btn-leave-card"
                            onClick={(e) => { e.stopPropagation(); leaveRoom(room.id); }}
                            title="Leave room"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="room-card-body">
                          <h4 className="room-card-name">{room.name}</h4>
                          <span className="room-card-members">{room.memberCount} members</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dashboard-section">
                <h3 className="dashboard-section-title">Discover Rooms</h3>
                {discoverRooms.length === 0 ? (
                  <p className="dashboard-empty">No public rooms to discover.</p>
                ) : (
                  <div className="room-grid">
                    {discoverRooms.map((room) => (
                      <div key={room.id} className="room-card discover-card">
                        <div className="room-card-header">
                          <span className="room-card-emoji">{room.emoji}</span>
                        </div>
                        <div className="room-card-body">
                          <h4 className="room-card-name">{room.name}</h4>
                          <span className="room-card-members">{room.memberCount} members</span>
                        </div>
                        <button className="btn-join-card" onClick={() => joinRoom(room.id)}>
                          Join Room
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <CreateRoomModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createRoom}
      />
    </div>
  );
}

function ChatComposer({
  isConnected,
  onSend,
}: {
  isConnected: boolean;
  onSend: (emoji: string) => Promise<boolean>;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [draftEmojis, setDraftEmojis] = useState<string[]>([]);
  const [isSendingDraft, setIsSendingDraft] = useState(false);

  const draftMessage = draftEmojis.join("");
  const canSendDraft = draftEmojis.length > 0 && isConnected && !isSendingDraft;

  const appendEmoji = useCallback((emoji: string) => {
    setDraftEmojis((prev) => [...prev, emoji]);
  }, []);

  const removeLastEmoji = useCallback(() => {
    setDraftEmojis((prev) => prev.slice(0, -1));
  }, []);

  const clearDraft = useCallback(() => {
    setDraftEmojis([]);
  }, []);

  const handleSendDraft = useCallback(async () => {
    if (!canSendDraft) return;

    setIsSendingDraft(true);
    try {
      const sent = await onSend(draftMessage);
      if (sent) {
        setDraftEmojis([]);
        setShowEmojiPicker(false);
      }
    } finally {
      setIsSendingDraft(false);
    }
  }, [canSendDraft, draftMessage, onSend]);

  return (
    <>
      <div className="input-bar-hint">Queue emojis, then send</div>
      <div className="chat-composer">
        <div
          className={`chat-composer-preview ${draftEmojis.length === 0 ? "empty" : ""}`}
        >
          {draftEmojis.length === 0 ? "Pick emojis to build a message" : draftMessage}
        </div>
        <div className="chat-composer-actions">
          <button
            type="button"
            className="btn-secondary composer-control-btn"
            onClick={removeLastEmoji}
            disabled={draftEmojis.length === 0}
            title="Remove last emoji"
          >
            ⌫
          </button>
          <button
            type="button"
            className="btn-secondary composer-control-btn"
            onClick={clearDraft}
            disabled={draftEmojis.length === 0}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn-primary composer-send-btn"
            onClick={() => void handleSendDraft()}
            disabled={!canSendDraft}
          >
            {isSendingDraft ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
      <div className="quick-send-row">
        {quickSendEmojis.map((emoji) => (
          <button
            type="button"
            key={emoji}
            className="quick-send-btn"
            onClick={() => appendEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
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
            onSelect={appendEmoji}
            onClose={() => setShowEmojiPicker(false)}
            closeOnSelect={false}
          />
        </div>
      )}
    </>
  );
}
