interface UserAvatarProps {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  showOnline?: boolean;
}

export function UserAvatar({
  src,
  name,
  size = "md",
  showOnline = false,
}: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "avatar-sm",
    md: "avatar-md",
    lg: "avatar-lg",
  };

  return (
    <div className={`avatar ${sizeClasses[size]}`}>
      {src ? (
        <img src={src} alt={name} referrerPolicy="no-referrer" />
      ) : (
        <div className="avatar-fallback">{initials}</div>
      )}
      {showOnline && <div className="avatar-online" />}
    </div>
  );
}
