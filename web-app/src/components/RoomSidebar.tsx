import { useState, useEffect } from "react";
import type { RoomDto } from "@/lib/api";
import { CreateRoomModal } from "./CreateRoomModal";

interface RoomSidebarProps {
  rooms: RoomDto[];
  discoverRooms: RoomDto[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (name: string, emoji: string) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onLoadRooms: () => void;
  onLoadDiscover: () => void;
}

export function RoomSidebar({
  rooms, discoverRooms, activeRoomId,
  onSelectRoom, onCreateRoom, onJoinRoom, onLeaveRoom,
  onLoadRooms, onLoadDiscover,
}: RoomSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);

  useEffect(() => { onLoadRooms(); }, [onLoadRooms]);
  useEffect(() => { if (showDiscover) onLoadDiscover(); }, [showDiscover, onLoadDiscover]);

  return (
    <aside className="room-sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">
          <span className="sidebar-logo">💬</span> Emoji Chat
        </h1>
      </div>

      <div className="sidebar-actions">
        <button className="btn-primary sidebar-btn" onClick={() => setShowCreate(true)}>
          ＋ New Room
        </button>
        <button
          className={`btn-secondary sidebar-btn ${showDiscover ? "active" : ""}`}
          onClick={() => setShowDiscover(!showDiscover)}
        >
          🔍 Discover
        </button>
      </div>

      {showDiscover && (
        <div className="discover-section">
          <h3 className="section-label">Discover Rooms</h3>
          {discoverRooms.length === 0 ? (
            <p className="section-empty">No rooms to discover</p>
          ) : (
            discoverRooms.map((room) => (
              <div key={room.id} className="room-item discover">
                <span className="room-icon">{room.emoji}</span>
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-meta">{room.memberCount} members</span>
                </div>
                <button className="btn-join" onClick={() => onJoinRoom(room.id)}>Join</button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="room-list">
        <h3 className="section-label">Your Rooms</h3>
        {rooms.length === 0 ? (
          <p className="section-empty">No rooms yet. Create or join one!</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className={`room-item ${activeRoomId === room.id ? "active" : ""}`}
              onClick={() => onSelectRoom(room.id)}
            >
              <span className="room-icon">{room.emoji}</span>
              <div className="room-info">
                <span className="room-name">{room.name}</span>
                <span className="room-meta">{room.memberCount} members</span>
              </div>
              <button
                className="btn-leave"
                onClick={(e) => { e.stopPropagation(); onLeaveRoom(room.id); }}
                title="Leave room"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <CreateRoomModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={onCreateRoom}
      />
    </aside>
  );
}
