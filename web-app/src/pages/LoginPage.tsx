import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const floatingEmojis = ["😀", "❤️", "🎉", "🔥", "✨", "🌈", "🚀", "💬", "👋", "🎶", "🌟", "😎"];

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/chat", { replace: true });
    }
  }, [isLoading, navigate, user]);

  if (isLoading) return null;

  return (
    <div className="login-page">
      {/* Floating emoji background */}
      <div className="floating-emojis" aria-hidden="true">
        {floatingEmojis.map((emoji, i) => (
          <span
            key={i}
            className="floating-emoji"
            style={{
              left: `${(i * 8.3) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${6 + (i % 4) * 2}s`,
              fontSize: `${1.5 + (i % 3) * 0.8}rem`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <div className="login-card">
        <div className="login-logo">💬</div>
        <h1 className="login-title">Emoji Chat</h1>
        <p className="login-subtitle">
          Express yourself with emojis only. React, respond, and vibe — no words needed.
        </p>

        <div className="login-google-wrapper">
          <GoogleLogin
            onSuccess={async (response) => {
              if (response.credential) {
                await login(response.credential);
              }
            }}
            onError={() => console.error("Google login failed")}
            theme="filled_black"
            size="large"
            shape="pill"
            text="continue_with"
            width="300"
          />
        </div>

        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <span>Emoji-only messages</span>
          </div>
          <div className="feature">
            <span className="feature-icon">💫</span>
            <span>React to anything</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔄</span>
            <span>Infinite reaction chains</span>
          </div>
        </div>
      </div>
    </div>
  );
}
