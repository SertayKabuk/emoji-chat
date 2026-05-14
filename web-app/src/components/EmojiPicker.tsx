import { useState, useMemo } from "react";
import { emojiCategories } from "@/lib/emojis";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

export function EmojiPicker({ onSelect, onClose, compact = false }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState("");

  const filteredEmojis = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return emojiCategories.flatMap((c) =>
      c.emojis.filter(() => c.name.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className={`emoji-picker ${compact ? "emoji-picker-compact" : ""}`}>
      {/* Search */}
      <div className="emoji-picker-search">
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="emoji-picker-tabs">
          {emojiCategories.map((cat, i) => (
            <button
              key={cat.name}
              className={`emoji-picker-tab ${i === activeCategory ? "active" : ""}`}
              onClick={() => setActiveCategory(i)}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="emoji-picker-grid">
        {search ? (
          filteredEmojis && filteredEmojis.length > 0 ? (
            filteredEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                className="emoji-picker-item"
                onClick={() => {
                  onSelect(emoji);
                  onClose?.();
                }}
              >
                {emoji}
              </button>
            ))
          ) : (
            <div className="emoji-picker-empty">No emojis found</div>
          )
        ) : (
          <>
            <div className="emoji-picker-category-label">
              {emojiCategories[activeCategory].name}
            </div>
            {emojiCategories[activeCategory].emojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                className="emoji-picker-item"
                onClick={() => {
                  onSelect(emoji);
                  onClose?.();
                }}
              >
                {emoji}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
