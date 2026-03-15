import { X, Star } from "lucide-react";
import { Button } from "./ui/button";
import { LiveResearchFeed } from "./LiveResearchFeed";
import { ImpactScorecard } from "./ImpactScorecard";
import { EvidenceSection } from "./EvidenceSection";
import type { StreamEvent, SustainabilityReport } from "../types/ecolens";
import { useEffect } from "react";

interface ResultsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  events: StreamEvent[];
  report: SustainabilityReport | null;
  isSearching: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export function ResultsOverlay({
  isOpen,
  onClose,
  productName,
  events,
  report,
  isSearching,
  isBookmarked,
  onToggleBookmark,
}: ResultsOverlayProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div className="fixed inset-y-0 right-0 w-[80%] bg-background border-l border-border z-50 animate-in slide-in-from-right duration-500">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-1">
                Analysis Results
              </h2>
              <p className="text-muted-foreground">{productName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleBookmark}
                className="rounded-full"
              >
                <Star
                  className={`h-5 w-5 ${
                    isBookmarked
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="sr-only">
                  {isBookmarked ? "Remove bookmark" : "Add bookmark"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Live Research Feed */}
                <div className="min-h-[500px]">
                  <LiveResearchFeed events={events} isSearching={isSearching} />
                </div>

                {/* Right Column: Scorecard & Evidence */}
                <div className="space-y-6">
                  <ImpactScorecard
                    report={report}
                    isLoading={isSearching && !report}
                  />
                  <EvidenceSection report={report} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
