import { useState } from "react";
import type { MessageDto } from "@/lib/api";
import { UserAvatar } from "./UserAvatar";
import { ReactionBar } from "./ReactionBar";
import { quickReactions } from "@/lib/emojis";

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

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`message-bubble ${isOwn ? "own" : ""}`}
      onMouseEnter={() => setShowQuickReact(true)}
      onMouseLeave={() => setShowQuickReact(false)}
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

        <div className="message-emoji-wrap">
          <span className="message-emoji">{message.emoji}</span>

          {/* Quick reaction overlay */}
          {showQuickReact && (
            <div className="message-quick-react">
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  className="quick-react-btn"
                  onClick={() => onAddReaction(message.id, "message", emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="message-time">{time}</div>

        {/* Reactions */}
        {(message.reactions.length > 0 || showQuickReact) && (
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
