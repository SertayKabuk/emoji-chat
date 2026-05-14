import { useRef, useEffect } from "react";
import type { MessageDto } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: MessageDto[];
  currentUserId: string;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onAddReaction: (targetId: string, targetType: "message" | "reaction", emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
  onAddReaction,
  onRemoveReaction,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && prevLengthRef.current === 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);

  // Infinite scroll up
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || isLoading || !hasMore) return;
    if (container.scrollTop < 100) {
      onLoadMore();
    }
  };

  return (
    <div
      className="message-list"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {hasMore && (
        <div className="message-list-loader">
          {isLoading ? (
            <div className="spinner" />
          ) : (
            <button className="load-more-btn" onClick={onLoadMore}>
              Load earlier messages
            </button>
          )}
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div className="message-list-empty">
          <div className="empty-emoji">💬</div>
          <p>No messages yet. Send the first emoji!</p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          currentUserId={currentUserId}
          isOwn={msg.user.id === currentUserId}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
