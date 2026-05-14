const API_BASE = "/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("emoji-chat-token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("emoji-chat-token");
      window.location.href = "/";
    }
    throw new Error(`API error: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Types
export interface UserInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface RoomDto {
  id: string;
  name: string;
  emoji: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  memberCount: number;
}

export interface ReactionDto {
  id: string;
  emoji: string;
  user: UserInfo;
  createdAt: string;
  childReactions: ReactionDto[];
}

export interface MessageDto {
  id: string;
  emoji: string;
  user: UserInfo;
  createdAt: string;
  reactions: ReactionDto[];
}

// API methods
export const api = {
  auth: {
    google: (idToken: string) =>
      apiFetch<AuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      }),
    me: () => apiFetch<UserDto>("/auth/me"),
  },
  rooms: {
    list: () => apiFetch<RoomDto[]>("/rooms"),
    discover: () => apiFetch<RoomDto[]>("/rooms/discover"),
    create: (name: string, emoji: string) =>
      apiFetch<RoomDto>("/rooms", {
        method: "POST",
        body: JSON.stringify({ name, emoji }),
      }),
    join: (roomId: string) =>
      apiFetch<void>(`/rooms/${roomId}/join`, { method: "POST" }),
    leave: (roomId: string) =>
      apiFetch<void>(`/rooms/${roomId}/leave`, { method: "DELETE" }),
  },
  messages: {
    list: (roomId: string, before?: string) =>
      apiFetch<MessageDto[]>(
        `/rooms/${roomId}/messages${before ? `?before=${before}` : ""}`
      ),
  },
};
