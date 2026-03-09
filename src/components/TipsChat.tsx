import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageCircle, Zap, BarChart3, Bell } from "lucide-react";

interface TipMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  tip_type: string;
  fixture_info: string | null;
  created_at: string;
}

const TIP_TYPE_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  tip: { icon: Zap, color: "text-neon", label: "Tip" },
  analysis: { icon: BarChart3, color: "text-badge-star", label: "Análise" },
  alert: { icon: Bell, color: "text-chart-negative", label: "Alerta" },
};

export function TipsChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TipMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [tipType, setTipType] = useState("tip");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("tips_chat_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tips_chat" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TipMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("tips_chat")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) setMessages(data as TipMessage[]);
    setLoading(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    await supabase.from("tips_chat").insert({
      user_id: user.id,
      username: user.email?.split("@")[0] ?? "Anônimo",
      message: newMessage.trim(),
      tip_type: tipType,
    });

    setNewMessage("");
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Chat de Tips</h3>
        <span className="h-2 w-2 rounded-full bg-chart-positive animate-pulse-neon ml-1" />
        <span className="text-[10px] text-muted-foreground">ao vivo</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="rounded-xl bg-card border border-border p-3 h-80 overflow-y-auto space-y-2 scrollbar-none"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground">Seja o primeiro a compartilhar uma tip!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const config = TIP_TYPE_CONFIG[msg.tip_type] ?? TIP_TYPE_CONFIG.tip;
            const Icon = config.icon;
            const isOwn = msg.user_id === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-3 space-y-1 ${
                    isOwn ? "bg-neon/10 border border-neon/20" : "bg-surface border border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3 w-3 ${config.color}`} />
                    <span className={`text-[10px] font-bold ${config.color}`}>{config.label}</span>
                    <span className="text-[10px] font-semibold text-foreground">{msg.username}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={sendMessage} className="flex gap-2">
          {/* Type selector */}
          <div className="flex rounded-xl bg-card border border-border overflow-hidden">
            {Object.entries(TIP_TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipType(key)}
                  className={`p-2.5 transition-colors ${
                    tipType === key ? "bg-neon/10" : "hover:bg-surface"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${tipType === key ? config.color : "text-muted-foreground"}`} />
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Compartilhe sua tip..."
            className="flex-1 rounded-xl bg-card border border-border py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50 transition-all"
          />

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="rounded-xl bg-neon px-4 text-primary-foreground hover:bg-neon-glow transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-3 bg-card rounded-xl border border-border">
          Faça login para participar do chat
        </div>
      )}
    </div>
  );
}
