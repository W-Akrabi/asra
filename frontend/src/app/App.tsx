import { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { HistoryPanel } from "./components/HistoryPanel";
import { BookmarksPanel } from "./components/BookmarksPanel";
import { ResultsOverlay } from "./components/ResultsOverlay";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Clock, BookMarked, Search } from "lucide-react";
import type { StreamEvent, SustainabilityReport, HistoryItem, BookmarkItem } from "./types/ecolens";
import { parseSSEEvent } from "./utils/sse-parser";
import { config } from "./config";

const API_BASE_URL = config.apiBaseUrl;

function AppContent() {
  const [productName, setProductName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string>("");
  const [cache, setCache] = useState<Record<string, { report: SustainabilityReport; timestamp: number }>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"];

  // Load history and bookmarks from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("ecolens-history");
    const savedBookmarks = localStorage.getItem("ecolens-bookmarks");
    const savedCache = localStorage.getItem("ecolens-cache");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    if (savedCache) setCache(JSON.parse(savedCache));
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("ecolens-history", JSON.stringify(history));
  }, [history]);

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem("ecolens-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem("ecolens-cache", JSON.stringify(cache));
  }, [cache]);

  const handleSearch = async (searchTerm?: string) => {
    const term = searchTerm || productName;
    if (!term.trim() || isSearching) return;

    // Reset state
    setIsSearching(true);
    setEvents([]);
    setReport(null);
    setShowResults(true);

    const searchId = Date.now().toString();
    setCurrentSearchId(searchId);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ product: term }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split(/\r?\n\r?\n/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const parsed = parseSSEEvent(line);
            if (!parsed) continue;

            const { type, message, data } = parsed;

            if (type === "done") {
              if (data && typeof data === "object") {
                const reportData = data as SustainabilityReport;
                setReport(reportData);
                setEvents((prev) => [
                  ...prev,
                  { type: "done", message: "Analysis complete" },
                ]);

                // Add to history
                const historyItem: HistoryItem = {
                  id: searchId,
                  productName: term,
                  timestamp: Date.now(),
                  overallScore: reportData.overall_score,
                  summary: reportData.summary,
                };
                setHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
                setCache((prev) => ({
                  ...prev,
                  [searchId]: { report: reportData, timestamp: Date.now() },
                }));
              } else {
                setEvents((prev) => [
                  ...prev,
                  { type: "error", message: "Failed to parse report" },
                ]);
              }
            } else if (type === "error") {
              setEvents((prev) => [...prev, { type: "error", message: message || "Agent error" }]);
            } else {
              setEvents((prev) => [
                ...prev,
                { type: type as StreamEvent["type"], message: message || "" },
              ]);
            }
          }
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          message: error instanceof Error ? error.message : "Search failed",
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarcodeClick = () => {
    fileInputRef.current?.click();
  };

  const handleBarcodeFile = async (file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setEvents([{ type: "error", message: "Please select a PNG or JPG image." }]);
      return;
    }

    setIsSearching(true);
    setEvents([]);
    setReport(null);
    setShowResults(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API_BASE_URL}/barcode`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.found) {
        setEvents([{ type: "error", message: data?.error || "Barcode not found" }]);
        return;
      }

      const productNameFromBarcode = data?.product?.product_name || data?.product?.brand || "";
      if (!productNameFromBarcode) {
        setEvents([{ type: "error", message: "Product not found for this barcode." }]);
        return;
      }

      setProductName(productNameFromBarcode);
      await handleSearch(productNameFromBarcode);
    } catch (error) {
      setEvents([
        {
          type: "error",
          message: error instanceof Error ? error.message : "Barcode lookup failed",
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setProductName(item.productName);
    const cached = cache[item.id];
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
      setReport(cached.report);
      setEvents([{ type: "done", message: "Loaded from cache" }]);
      setShowResults(true);
      setIsSearching(false);
      setCurrentSearchId(item.id);
      return;
    }
    handleSearch(item.productName);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleToggleBookmark = () => {
    if (!report || !currentSearchId) return;

    const isCurrentlyBookmarked = bookmarks.some((b) => b.id === currentSearchId);

    if (isCurrentlyBookmarked) {
      setBookmarks((prev) => prev.filter((b) => b.id !== currentSearchId));
    } else {
      const bookmarkItem: BookmarkItem = {
        id: currentSearchId,
        productName: productName,
        timestamp: Date.now(),
        overallScore: report.overall_score,
        summary: report.summary,
      };
      setBookmarks((prev) => [bookmarkItem, ...prev]);
    }
  };

  const handleRemoveBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSelectBookmarkItem = (item: BookmarkItem) => {
    setProductName(item.productName);
    const cached = cache[item.id];
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
      setReport(cached.report);
      setEvents([{ type: "done", message: "Loaded from cache" }]);
      setShowResults(true);
      setIsSearching(false);
      setCurrentSearchId(item.id);
      return;
    }
    handleSearch(item.productName);
  };

  const isBookmarked = bookmarks.some((b) => b.id === currentSearchId);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const hasActiveResults = isSearching || events.length > 0 || !!report;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Top Navigation Bar */}
      <div className="relative z-10 border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="EcoLens logo"
              className="h-8 w-8 rounded-full"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EcoLens
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(true)}
              className="rounded-full"
            >
              <Clock className="h-5 w-5" />
              <span className="sr-only">History</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBookmarks(true)}
              className="rounded-full"
            >
              <BookMarked className="h-5 w-5" />
              <span className="sr-only">Bookmarks</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content - Centered Search */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)] px-6">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              EcoLens
            </h1>
            <p className="text-xl text-muted-foreground">
              AI-powered sustainability research for everyday products
            </p>
          </div>

          {/* Large Search Bar */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-700" />
            <div className="relative bg-card/80 border border-border/80 rounded-2xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur">
              <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-3 md:p-5">
                <Search className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Enter product name (e.g., Coca-Cola, Nutella)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
                  disabled={isSearching}
                  autoFocus
                />
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleBarcodeClick}
                    disabled={isSearching}
                    className="h-11 w-full rounded-xl border-border/60 bg-background/60 px-4 text-sm font-semibold text-foreground/80 hover:bg-background sm:w-auto"
                  >
                    Scan Barcode
                  </Button>
                  <Button
                    onClick={() => handleSearch()}
                    disabled={!productName.trim() || isSearching}
                    className="h-11 w-full rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-16px_rgba(37,99,235,0.8)] hover:bg-primary/90 sm:w-auto"
                  >
                    {isSearching ? <span className="animate-pulse">Analyzing...</span> : "Analyze"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleBarcodeFile(file);
                e.currentTarget.value = "";
              }
            }}
          />

          {/* Quick Info */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Discover the environmental and social impact of products with AI-powered analysis
            </p>
          </div>

          {!showResults && hasActiveResults && (
            <div className="mt-6 flex items-center justify-center">
              <Button
                variant="outline"
                onClick={() => setShowResults(true)}
                className="rounded-full border-border/60 bg-background/70 px-5 text-sm"
              >
                {isSearching ? "Analysis running — View results" : "View latest results"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results Overlay */}
      <ResultsOverlay
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        productName={productName}
        events={events}
        report={report}
        isSearching={isSearching}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onSelectItem={handleSelectHistoryItem}
        onClearHistory={handleClearHistory}
      />

      {/* Bookmarks Panel */}
      <BookmarksPanel
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        bookmarks={bookmarks}
        onSelectItem={handleSelectBookmarkItem}
        onRemoveBookmark={handleRemoveBookmark}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
