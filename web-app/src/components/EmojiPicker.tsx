import { Suspense, lazy } from "react";
import type { EmojiClickData } from "emoji-picker-react";

interface LazyEmojiPickerProps {
  width: string;
  height: string;
  className: string;
  lazyLoadEmojis: boolean;
  skinTonesDisabled: boolean;
  previewConfig: {
    showPreview: false;
  };
  searchPlaceholder: string;
  onEmojiClick: (emojiData: EmojiClickData) => void;
}

const EmojiPickerReact = lazy(async () => {
  const module = await import("emoji-picker-react");

  return {
    default: (props: LazyEmojiPickerProps) => (
      <module.default
        {...props}
        theme={module.Theme.DARK}
        emojiStyle={module.EmojiStyle.NATIVE}
      />
    ),
  };
});

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  compact?: boolean;
  closeOnSelect?: boolean;
}

export function EmojiPicker({
  onSelect,
  onClose,
  compact = false,
  closeOnSelect = true,
}: EmojiPickerProps) {
  const pickerHeight = compact ? "min(320px, calc(100vh - 180px))" : "min(400px, calc(100vh - 140px))";

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);

    if (closeOnSelect) {
      onClose?.();
    }
  };

  return (
    <div
      className={`emoji-picker-shell ${compact ? "compact" : ""}`}
      style={{ height: pickerHeight }}
    >
      <Suspense fallback={<div className="emoji-picker-loading">Loading emojis...</div>}>
        <EmojiPickerReact
          width="100%"
          height="100%"
          className={`emoji-picker ${compact ? "emoji-picker-compact" : ""}`}
          lazyLoadEmojis
          skinTonesDisabled
          previewConfig={{ showPreview: false }}
          searchPlaceholder="Search emojis..."
          onEmojiClick={handleEmojiClick}
        />
      </Suspense>
    </div>
  );
}
