import { useLayoutEffect, useRef, useState } from "react";
import type { MessageDto } from "@/lib/api";
import { UserAvatar } from "./UserAvatar";
import { ReactionBar } from "./ReactionBar";
import { quickReactions } from "@/lib/emojis";
import { EmojiPicker } from "./EmojiPicker";

interface MessageBubbleProps {
  message: MessageDto;
  currentUserId: string;
  onAddReaction: (targetId: string, targetType: "message" | "reaction", emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
  isOwn: boolean;
}

export function MessageBubble({
  message,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  isOwn,
}: MessageBubbleProps) {
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [quickReactPlacement, setQuickReactPlacement] = useState<"above" | "below">("above");
  const [quickReactAlignment, setQuickReactAlignment] = useState<"center" | "start" | "end">(
    isOwn ? "end" : "center"
  );
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPlacement, setPickerPlacement] = useState<"above" | "below">("above");
  const [pickerAlignment, setPickerAlignment] = useState<"start" | "end">(
    isOwn ? "end" : "start"
  );
  const emojiWrapRef = useRef<HTMLDivElement>(null);
  const quickReactRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  useLayoutEffect(() => {
    if (!showQuickReact) return;

    const updateQuickReactPosition = () => {
      if (!emojiWrapRef.current || !quickReactRef.current) return;

      const anchorRect = emojiWrapRef.current.getBoundingClientRect();
      const overlayRect = quickReactRef.current.getBoundingClientRect();
      const container = emojiWrapRef.current.closest('.message-list');
      const containerRect = container 
        ? container.getBoundingClientRect() 
        : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
      
      const margin = 12;

      const fitsAbove = anchorRect.top - overlayRect.height >= containerRect.top + margin;
      const fitsBelow = anchorRect.bottom + overlayRect.height <= containerRect.bottom - margin;

      const nextPlacement = fitsAbove || (!fitsBelow && anchorRect.top - containerRect.top >= containerRect.bottom - anchorRect.bottom)
          ? "above"
          : "below";

      let nextAlignment: "center" | "start" | "end" = isOwn ? "end" : "center";
      if (anchorRect.left + (overlayRect.width / 2) > containerRect.right - margin) {
        nextAlignment = "end";
      } else if (anchorRect.right - (overlayRect.width / 2) < containerRect.left + margin) {
        nextAlignment = "start";
      }

      setQuickReactPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));
      setQuickReactAlignment((prev) => (prev === nextAlignment ? prev : nextAlignment));
    };

    updateQuickReactPosition();
    window.addEventListener("resize", updateQuickReactPosition);

    return () => {
      window.removeEventListener("resize", updateQuickReactPosition);
    };
  }, [isOwn, showQuickReact]);

  useLayoutEffect(() => {
    if (!showPicker) return;

    const updatePickerPosition = () => {
      if (!emojiWrapRef.current || !pickerRef.current) return;

      const anchorRect = emojiWrapRef.current.getBoundingClientRect();
      const popoverRect = pickerRef.current.getBoundingClientRect();
      const container = emojiWrapRef.current.closest('.message-list');
      const containerRect = container 
        ? container.getBoundingClientRect() 
        : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
        
      const margin = 12;

      const fitsAbove = anchorRect.top - popoverRect.height >= containerRect.top + margin;
      const fitsBelow = anchorRect.bottom + popoverRect.height <= containerRect.bottom - margin;

      const nextPlacement = fitsAbove || (!fitsBelow && anchorRect.top - containerRect.top >= containerRect.bottom - anchorRect.bottom)
          ? "above"
          : "below";

      let nextAlignment: "start" | "end" = isOwn ? "end" : "start";
      if (anchorRect.left + popoverRect.width > containerRect.right - margin) {
        nextAlignment = "end";
      }
      if (anchorRect.right - popoverRect.width < containerRect.left + margin) {
        nextAlignment = "start";
      }

      setPickerPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));
      setPickerAlignment((prev) => (prev === nextAlignment ? prev : nextAlignment));
    };

    updatePickerPosition();
    window.addEventListener("resize", updatePickerPosition);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
    };
  }, [isOwn, showPicker]);

  const closeHoverUi = () => {
    setShowQuickReact(false);
    setShowPicker(false);
  };

  const addReaction = (emoji: string) => {
    onAddReaction(message.id, "message", emoji);
    closeHoverUi();
  };

  return (
    <div
      className={`message-bubble ${isOwn ? "own" : ""}`}
      onMouseEnter={() => setShowQuickReact(true)}
      onMouseLeave={closeHoverUi}
    >
      {!isOwn && (
        <div className="message-avatar">
          <UserAvatar
            src={message.user.avatarUrl}
            name={message.user.displayName}
            size="sm"
          />
        </div>
      )}

      <div className="message-content">
        {!isOwn && (
          <div className="message-sender">{message.user.displayName}</div>
        )}

        <div className="message-emoji-wrap" ref={emojiWrapRef}>
          <span className="message-emoji">{message.emoji}</span>

          {/* Quick reaction overlay */}
          {showQuickReact && (
            <div
              ref={quickReactRef}
              className={`message-quick-react ${quickReactPlacement} ${quickReactAlignment}`}
            >
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  className="quick-react-btn"
                  onClick={() => addReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                className={`quick-react-btn quick-react-more ${showPicker ? "active" : ""}`}
                onClick={() => setShowPicker((prev) => !prev)}
                title="More reactions"
              >
                ＋
              </button>
            </div>
          )}

          {showPicker && (
            <div
              ref={pickerRef}
              className={`message-picker-popover ${pickerPlacement} ${pickerAlignment}`}
            >
              <EmojiPicker
                compact
                onSelect={addReaction}
                onClose={() => setShowPicker(false)}
              />
            </div>
          )}
        </div>

        <div className="message-time">{time}</div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <ReactionBar
            reactions={message.reactions}
            targetId={message.id}
            targetType="message"
            currentUserId={currentUserId}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        )}
      </div>
    </div>
  );
}
