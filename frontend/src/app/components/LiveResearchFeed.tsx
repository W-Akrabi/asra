import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import type { StreamEvent } from "../types/ecolens";
import { useAutoScroll } from "../hooks/useAutoScroll";

interface LiveResearchFeedProps {
  events: StreamEvent[];
  isSearching: boolean;
}

const EVENT_ICONS = {
  thinking: "💭",
  searching: "🔍",
  reading: "📖",
  scoring: "📊",
  done: "✅",
  error: "❌",
};

const EVENT_LABELS = {
  thinking: "Thinking",
  searching: "Searching",
  reading: "Reading",
  scoring: "Scoring",
  done: "Complete",
  error: "Error",
};

export function LiveResearchFeed({ events, isSearching }: LiveResearchFeedProps) {
  const [showAllThinking, setShowAllThinking] = useState(false);

  // Separate thinking events from others
  const thinkingEvents = events.filter((e) => e.type === "thinking");
  const otherEvents = events.filter((e) => e.type !== "thinking");

  // Limit thinking events to 5 unless expanded
  const visibleThinkingEvents = showAllThinking
    ? thinkingEvents
    : thinkingEvents.slice(0, 5);
  const hasMoreThinking = thinkingEvents.length > 5;

  const allVisibleEvents = [...visibleThinkingEvents, ...otherEvents].sort(
    (a, b) => {
      // Maintain original order from events array
      return events.indexOf(a) - events.indexOf(b);
    }
  );

  return (
    <Card className="p-6 h-full flex flex-col bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Live Research Feed</h2>
        {isSearching && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {allVisibleEvents.map((event, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border animate-in slide-in-from-left duration-300"
          >
            <span className="text-2xl">{EVENT_ICONS[event.type]}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-foreground">
                {EVENT_LABELS[event.type]}
              </div>
              {event.message && (
                <div className="text-sm text-muted-foreground mt-1">{event.message}</div>
              )}
            </div>
          </div>
        ))}

        {hasMoreThinking && !showAllThinking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllThinking(true)}
            className="w-full"
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            Show {thinkingEvents.length - 5} more thinking events
          </Button>
        )}

        {hasMoreThinking && showAllThinking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllThinking(false)}
            className="w-full"
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            Show less
          </Button>
        )}

        {!isSearching && events.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Research events will appear here
          </div>
        )}
      </div>
    </Card>
  );
}