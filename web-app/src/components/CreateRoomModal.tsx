import { useState } from "react";
import { EmojiPicker } from "./EmojiPicker";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string) => void;
}

export function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [showPicker, setShowPicker] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), emoji);
    setName("");
    setEmoji("💬");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Room</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="room-emoji-select">
              <button type="button" className="room-emoji-btn" onClick={() => setShowPicker(!showPicker)}>
                {emoji}
              </button>
              {showPicker && (
                <div className="room-emoji-picker-wrapper">
                  <EmojiPicker compact onSelect={(e) => { setEmoji(e); setShowPicker(false); }} onClose={() => setShowPicker(false)} />
                </div>
              )}
            </div>
            <input type="text" className="modal-input" placeholder="Room name..." value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={50} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
