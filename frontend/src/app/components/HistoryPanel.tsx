import { X, Clock, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import type { HistoryItem } from "../types/ecolens";
import { useEffect } from "react";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

export function HistoryPanel({
  isOpen,
  onClose,
  history,
  onSelectItem,
  onClearHistory,
}: HistoryPanelProps) {
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

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[80%] max-w-2xl bg-background border-l border-border z-50 animate-in slide-in-from-right duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Search History</h2>
            </div>
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

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-lg text-muted-foreground">
                  No search history yet
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your analyzed products will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onSelectItem(item);
                      onClose();
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{item.productName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                        {item.summary && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                      </div>
                      {item.overallScore !== undefined && (
                        <div className="ml-4">
                          <div
                            className={`text-lg font-bold ${
                              item.overallScore >= 70
                                ? "text-green-500"
                                : item.overallScore >= 40
                                ? "text-yellow-500"
                                : "text-red-500"
                            }`}
                          >
                            {item.overallScore}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-6 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={onClearHistory}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
