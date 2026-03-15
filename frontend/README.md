# EcoLens Frontend

A modern, futuristic UI for the EcoLens sustainability research app. Built with React, TypeScript, and Tailwind CSS with full dark/light mode support.

## Features

- **Modern Centered Search**: Large, centered search bar with futuristic glassmorphism design
- **80% Overlay Panel**: Results slide in from the right, covering 80% of the screen with a backdrop
- **Dark/Light Mode**: Full theme support with smooth transitions
- **History Panel**: Track all your previous searches with timestamps and scores
- **Bookmarks**: Save favorite products for quick access
- **Real-time SSE Streaming**: Consumes server-sent events from FastAPI backend
- **Live Research Feed**: Shows analysis progress with collapsible thinking events
- **Impact Scorecard**: Radar chart visualization of sustainability metrics
- **Evidence & Alternatives**: Tabbed view of detailed findings and sustainable alternatives
- **Smooth Animations**: Beautiful slide-in animations and transitions
- **Loading States**: Skeleton loaders provide visual feedback during analysis
- **LocalStorage Persistence**: History and bookmarks persist across sessions

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure backend URL (optional):
```bash
# Create .env file
VITE_API_BASE_URL=http://localhost:8000
```

3. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

1. Enter a product name (e.g., "Nutella", "Coca-Cola", "Beyond Meat")
2. Click "Search" to trigger the analysis
3. Watch live research events stream in real-time
4. View sustainability scores in the radar chart
5. Explore detailed evidence in the tabbed view
6. Check out sustainable alternatives
7. Click "Clear" to reset and start a new search

## API Integration

The frontend expects the following backend endpoints:

### `POST /analyze`

SSE stream endpoint that returns events in this format:

```
event: thinking
data: Analyzing product composition...

event: searching
data: Querying Open Food Facts database...

event: reading
data: Found product: Nutella

event: scoring
data: Calculating sustainability metrics...

event: done
data: {"product_name":"Nutella","carbon_score":45,"water_score":60,...}
```

**Event Types:**
- `thinking` - Agent reasoning steps
- `searching` - Database/API queries
- `reading` - Data retrieval
- `scoring` - Metric calculation
- `done` - Final JSON report
- `error` - Error messages

### Report Schema

```typescript
interface SustainabilityReport {
  product_name: string;
  carbon_score: number;        // 0-100
  water_score: number;         // 0-100
  deforestation_score: number; // 0-100
  labor_score: number;         // 0-100
  overall_score: number;       // 0-100
  summary?: string;
  evidence?: {
    carbon?: string[];
    water?: string[];
    deforestation?: string[];
    labor?: string[];
  };
  alternatives?: string[];
}
```

## Architecture

```
src/
├── app/
│   ├── components/
│   │   ├── SearchBar.tsx           # Search input & buttons
│   │   ├── LiveResearchFeed.tsx    # Event stream display
│   │   ├── ImpactScorecard.tsx     # Radar chart & scores
│   │   ├── EvidenceSection.tsx     # Tabbed evidence view
│   │   └── ui/                     # Shadcn UI components
│   ├── hooks/
│   │   └── useAutoScroll.ts        # Auto-scroll utility
│   ├── types/
│   │   └── ecolens.ts              # TypeScript interfaces
│   ├── utils/
│   │   └── sse-parser.ts           # SSE parsing logic
│   └── App.tsx                     # Main app component
├── styles/
│   ├── index.css
│   ├── tailwind.css
│   └── theme.css
└── ...
```

## Tech Stack

- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **Vite** - Build tool
- **Shadcn UI** - Component library

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_DEMO_MODE` | `false` | Enable demo mode with mock data (set to `"true"`) |

## Development

### Running the Frontend

```bash
npm run dev
```

### Running in Demo Mode

Test the UI without a backend by enabling demo mode:

```bash
# Option 1: Using environment variable
VITE_DEMO_MODE=true npm run dev

# Option 2: Create a .env file
echo "VITE_DEMO_MODE=true" > .env
npm run dev
```

When demo mode is active, a yellow indicator appears in the bottom-right corner.

### Building for Production

```bash
npm run build
```

### SSE Parsing

The frontend handles SSE streams with proper buffering for chunked responses:

- Supports both `\n\n` and `\r\n\r\n` line endings
- Buffers incomplete events across chunks
- Parses `event:` and `data:` fields
- Handles JSON parsing for the final report

### Testing with Mock Data

You can test the UI without a backend by modifying the `handleSearch` function to emit mock events:

```typescript
// Add mock events for testing
setEvents([
  { type: "thinking", message: "Analyzing product..." },
  { type: "searching", message: "Querying database..." },
  { type: "done", message: "Complete" }
]);

setReport({
  product_name: "Test Product",
  carbon_score: 75,
  water_score: 60,
  deforestation_score: 80,
  labor_score: 70,
  overall_score: 71,
  summary: "This is a test product with good sustainability scores.",
  evidence: {
    carbon: ["Low carbon footprint"],
    water: ["Moderate water usage"]
  },
  alternatives: ["Alternative A", "Alternative B"]
});
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure your FastAPI backend includes:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Radar Chart Not Displaying

Ensure the parent container has a fixed height (we use `h-64`). Recharts requires a non-zero container size.

### SSE Connection Drops

Check that your backend is sending proper SSE headers:

```python
return StreamingResponse(
    event_generator(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
)
```

## License

MIT