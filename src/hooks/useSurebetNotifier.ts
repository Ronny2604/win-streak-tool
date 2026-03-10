import { useEffect, useRef, useCallback } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { detectSurebets, SurebetOpportunity } from "@/lib/surebet-detector";
import { toast } from "sonner";

const NOTIFICATION_SOUND_ENABLED = true;

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const options: NotificationOptions & Record<string, unknown> = {
        body,
        icon: "/favicon.ico",
        tag: "surebet-alert",
      };
      new Notification(title, options);
    } catch {
      // Notification constructor may fail on some mobile browsers
    }
  }
}

function playAlertSound() {
  if (!NOTIFICATION_SOUND_ENABLED) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext may not be available
  }
}

export function useSurebetNotifier(fixtures: NormalizedFixture[] | undefined) {
  const previousSurebetIds = useRef<Set<string>>(new Set());
  const hasRequestedPermission = useRef(false);

  // Request permission on first call
  useEffect(() => {
    if (!hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      requestNotificationPermission();
    }
  }, []);

  const checkForSurebets = useCallback(() => {
    if (!fixtures || fixtures.length === 0) return;

    const opportunities = detectSurebets(fixtures);
    const realSurebets = opportunities.filter((o) => o.rating === "surebet");

    const newSurebets: SurebetOpportunity[] = [];
    for (const sb of realSurebets) {
      if (!previousSurebetIds.current.has(sb.fixture.id)) {
        newSurebets.push(sb);
      }
    }

    // Update tracked IDs
    const currentIds = new Set(realSurebets.map((s) => s.fixture.id));
    previousSurebetIds.current = currentIds;

    if (newSurebets.length === 0) return;

    // Play alert sound
    playAlertSound();

    // In-app toast notifications
    for (const sb of newSurebets) {
      const matchName = `${sb.fixture.teams.home.name} vs ${sb.fixture.teams.away.name}`;
      toast.success(`🚨 SUREBET: ${matchName}`, {
        description: `Lucro garantido de +${sb.profitPercent}% | Odds: ${sb.bestOdds.home.toFixed(2)} / ${sb.bestOdds.draw.toFixed(2)} / ${sb.bestOdds.away.toFixed(2)}`,
        duration: 15000,
        action: {
          label: "Ver detalhes",
          onClick: () => {
            // Scroll to surebet section or navigate
            document.getElementById("surebet-panel")?.scrollIntoView({ behavior: "smooth" });
          },
        },
      });
    }

    // Browser push notification (works even when tab is in background)
    if (newSurebets.length === 1) {
      const sb = newSurebets[0];
      sendBrowserNotification(
        "🚨 Surebet Detectada!",
        `${sb.fixture.teams.home.name} vs ${sb.fixture.teams.away.name} — Lucro: +${sb.profitPercent}%`
      );
    } else {
      sendBrowserNotification(
        `🚨 ${newSurebets.length} Surebets Detectadas!`,
        newSurebets.map((s) => `${s.fixture.teams.home.name} vs ${s.fixture.teams.away.name}`).join(", ")
      );
    }
  }, [fixtures]);

  useEffect(() => {
    checkForSurebets();
  }, [checkForSurebets]);
}
