export interface EvidenceItem {
  claim: string;
  source?: string;
  url?: string | null;
}

export interface SustainabilityReport {
  product_name: string;
  carbon_score: number;
  water_score: number;
  deforestation_score: number;
  labor_score: number;
  overall_score: number;
  summary?: string;
  evidence?: {
    carbon?: EvidenceItem[];
    water?: EvidenceItem[];
    deforestation?: EvidenceItem[];
    labor?: EvidenceItem[];
  };
  alternatives?: string[];
}

export interface StreamEvent {
  type: "thinking" | "searching" | "reading" | "scoring" | "done" | "error";
  message?: string;
  data?: any;
}

export interface AnalyzeRequest {
  product_name: string;
}

export interface HealthResponse {
  status: string;
}

export interface ProductSearchResponse {
  product_name?: string;
  brands?: string;
  categories?: string;
  ingredients?: string[];
  labels?: string[];
  nutriscore?: string;
  ecoscore?: string;
  [key: string]: any;
}

export interface HistoryItem {
  id: string;
  productName: string;
  timestamp: number;
  overallScore?: number;
  summary?: string;
}

export interface BookmarkItem {
  id: string;
  productName: string;
  timestamp: number;
  overallScore?: number;
  summary?: string;
}
