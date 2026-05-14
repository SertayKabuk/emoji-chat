import { useLayoutEffect, useRef, useState } from "react";
import type { ReactionDto } from "@/lib/api";
import { quickReactions } from "@/lib/emojis";
import { EmojiPicker } from "./EmojiPicker";

interface ReactionBarProps {
  reactions: ReactionDto[];
  targetId: string;
  targetType: "message" | "reaction";
  currentUserId: string;
  onAddReaction: (targetId: string, targetType: "message" | "reaction", emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
  depth?: number;
  maxDepth?: number;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  users: { id: string; displayName: string }[];
  reactionIds: string[];
  currentUserReactionId: string | null;
  childReactions: ReactionDto[];
}

export function ReactionBar({
  reactions,
  targetId,
  targetType,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  depth = 0,
  maxDepth = 3,
}: ReactionBarProps) {
  const [expandedReaction, setExpandedReaction] = useState<string | null>(null);

  if (reactions.length === 0 && depth > 0) return null;

  // Group reactions by emoji
  const grouped: GroupedReaction[] = [];
  for (const r of reactions) {
    const existing = grouped.find((g) => g.emoji === r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push({ id: r.user.id, displayName: r.user.displayName });
      existing.reactionIds.push(r.id);
      if (r.user.id === currentUserId) {
        existing.currentUserReactionId = r.id;
      }
      existing.childReactions.push(...r.childReactions);
    } else {
      grouped.push({
        emoji: r.emoji,
        count: 1,
        users: [{ id: r.user.id, displayName: r.user.displayName }],
        reactionIds: [r.id],
        currentUserReactionId: r.user.id === currentUserId ? r.id : null,
        childReactions: [...r.childReactions],
      });
    }
  }

  return (
    <div className={`reaction-bar depth-${Math.min(depth, 3)}`}>
      <div className="reaction-pills">
        {grouped.map((g) => (
          <div key={g.emoji} className="reaction-group">
            <button
              className={`reaction-pill ${g.currentUserReactionId ? "active" : ""}`}
              onClick={() => {
                if (g.currentUserReactionId) {
                  onRemoveReaction(g.currentUserReactionId);
                } else {
                  onAddReaction(targetId, targetType, g.emoji);
                }
              }}
              title={g.users.map((u) => u.displayName).join(", ")}
            >
              <span className="reaction-emoji">{g.emoji}</span>
              <span className="reaction-count">{g.count}</span>
            </button>

            {/* Nested reactions (react to reaction) */}
            {depth < maxDepth && g.childReactions.length > 0 && (
              <div className="reaction-nested">
                {expandedReaction === g.emoji ? (
                  <>
                    <ReactionBar
                      reactions={g.childReactions}
                      targetId={g.reactionIds[0]}
                      targetType="reaction"
                      currentUserId={currentUserId}
                      onAddReaction={onAddReaction}
                      onRemoveReaction={onRemoveReaction}
                      depth={depth + 1}
                      maxDepth={maxDepth}
                    />
                    <button
                      className="reaction-collapse"
                      onClick={() => setExpandedReaction(null)}
                    >
                      ▾
                    </button>
                  </>
                ) : (
                  <button
                    className="reaction-expand"
                    onClick={() => setExpandedReaction(g.emoji)}
                  >
                    +{g.childReactions.length}
                  </button>
                )}
              </div>
            )}

            {depth < maxDepth && g.childReactions.length === 0 && (
              <ReactionAddPicker
                targetId={g.reactionIds[0]}
                targetType="reaction"
                onAddReaction={onAddReaction}
                buttonClassName="reaction-react-btn"
                buttonContent="+"
                buttonTitle="React to this reaction"
              />
            )}
          </div>
        ))}

        {/* Add reaction button */}
        <ReactionAddPicker
          targetId={targetId}
          targetType={targetType}
          onAddReaction={onAddReaction}
          buttonClassName="reaction-add"
          buttonContent={<span>＋</span>}
        />
      </div>

      {depth >= maxDepth && reactions.some((r) => r.childReactions.length > 0) && (
        <div className="reaction-depth-limit">
          <span className="reaction-depth-text">More reactions nested deeper...</span>
        </div>
      )}
    </div>
  );
}

function ReactionAddPicker({
  targetId,
  targetType,
  onAddReaction,
  buttonClassName,
  buttonContent,
  buttonTitle,
}: {
  targetId: string;
  targetType: "message" | "reaction";
  onAddReaction: (targetId: string, targetType: "message" | "reaction", emoji: string) => void;
  buttonClassName: string;
  buttonContent: React.ReactNode;
  buttonTitle?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPlacement, setPickerPlacement] = useState<"above" | "below">("above");
  const [pickerAlignment, setPickerAlignment] = useState<"start" | "end">("start");
  const addWrapperRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!showPicker) return;

    const updatePickerPosition = () => {
      if (!addWrapperRef.current || !pickerRef.current) return;

      const anchorRect = addWrapperRef.current.getBoundingClientRect();
      const popoverRect = pickerRef.current.getBoundingClientRect();
      const container = addWrapperRef.current.closest('.message-list');
      const containerRect = container 
        ? container.getBoundingClientRect() 
        : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
        
      const margin = 12;

      const fitsAbove = anchorRect.top - popoverRect.height >= containerRect.top + margin;
      const fitsBelow = anchorRect.bottom + popoverRect.height <= containerRect.bottom - margin;

      const nextPlacement = fitsAbove || (!fitsBelow && anchorRect.top - containerRect.top >= containerRect.bottom - anchorRect.bottom)
          ? "above"
          : "below";

      let nextAlignment: "start" | "end" = "start";
      if (anchorRect.left + popoverRect.width > containerRect.right - margin) {
        nextAlignment = "end";
      }

      setPickerPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));
      setPickerAlignment((prev) => (prev === nextAlignment ? prev : nextAlignment));
    };

    updatePickerPosition();
    window.addEventListener("resize", updatePickerPosition);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
    };
  }, [showPicker]);

  return (
    <div className="reaction-add-wrapper" ref={addWrapperRef}>
      <button
        className={`${buttonClassName} ${showPicker ? "active" : ""}`}
        onClick={() => setShowPicker(!showPicker)}
        title={buttonTitle}
      >
        {buttonContent}
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className={`reaction-picker-popover ${pickerPlacement} ${pickerAlignment}`}
        >
          <div className="quick-reactions">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                className="quick-reaction-btn"
                onClick={() => {
                  onAddReaction(targetId, targetType, emoji);
                  setShowPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <EmojiPicker
            compact
            onSelect={(emoji) => {
              onAddReaction(targetId, targetType, emoji);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </div>
  );
}
