import { useState, useEffect } from "react";

interface UserKey {
  id: string;
  key: string;
  user: string;
  plan: "lite" | "pro";
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return segments.join("-");
}

export function useKeyManager() {
  const [keys, setKeys] = useState<UserKey[]>(() => {
    const stored = localStorage.getItem("admin-keys");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("admin-keys", JSON.stringify(keys));
  }, [keys]);

  const createKey = (user: string, plan: "lite" | "pro", daysValid: number) => {
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + daysValid);

    const newKey: UserKey = {
      id: crypto.randomUUID(),
      key: generateKey(),
      user,
      plan,
      active: true,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    setKeys((prev) => [newKey, ...prev]);
    return newKey;
  };

  const toggleKey = (id: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, active: !k.active } : k))
    );
  };

  const deleteKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return { keys, createKey, toggleKey, deleteKey };
}

export type { UserKey };
