import { X, BookMarked, Trash2, Star } from "lucide-react";
import { Button } from "./ui/button";
import type { BookmarkItem } from "../types/ecolens";
import { useEffect } from "react";

interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkItem[];
  onSelectItem: (item: BookmarkItem) => void;
  onRemoveBookmark: (id: string) => void;
}

export function BookmarksPanel({
  isOpen,
  onClose,
  bookmarks,
  onSelectItem,
  onRemoveBookmark,
}: BookmarksPanelProps) {
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
              <BookMarked className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Bookmarks</h2>
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
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <BookMarked className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-lg text-muted-foreground">
                  No bookmarks yet
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Save products to easily access them later
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          onSelectItem(item);
                          onClose();
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <h3 className="font-medium">{item.productName}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                        {item.summary && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {item.overallScore !== undefined && (
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
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveBookmark(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove bookmark</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
