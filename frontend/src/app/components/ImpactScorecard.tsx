import { Card } from "./ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Skeleton } from "./ui/skeleton";
import type { SustainabilityReport } from "../types/ecolens";

interface ImpactScorecardProps {
  report: SustainabilityReport | null;
  isLoading?: boolean;
}

export function ImpactScorecard({ report, isLoading }: ImpactScorecardProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Impact Scorecard</h2>
        <div className="space-y-4">
          <div>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-10 w-1/3" />
          </div>
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-4">Impact Scorecard</h2>
        <div className="text-center text-muted-foreground py-8">
          Results will appear here after analysis
        </div>
      </Card>
    );
  }

  const radarData = [
    { category: "Carbon", score: report.carbon_score },
    { category: "Water", score: report.water_score },
    { category: "Deforestation", score: report.deforestation_score },
    { category: "Labor", score: report.labor_score },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Good";
    if (score >= 40) return "Moderate";
    return "Poor";
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <h2 className="text-xl font-semibold mb-4">Impact Scorecard</h2>
      
      <div className="mb-6">
        <h3 className="font-medium text-lg mb-1">{report.product_name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">{report.overall_score}</span>
          <span className={`font-medium ${getScoreColor(report.overall_score)}`}>
            {getScoreLabel(report.overall_score)}
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="currentColor" className="stroke-border" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "currentColor", fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.5}
              className="stroke-primary fill-primary"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Individual Scores */}
      <div className="grid grid-cols-2 gap-4">
        {radarData.map((item) => (
          <div key={item.category} className="bg-accent/50 rounded-lg p-3 border border-border">
            <div className="text-sm text-muted-foreground mb-1">{item.category}</div>
            <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
              {item.score}
            </div>
          </div>
        ))}
      </div>

      {report.summary && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground">{report.summary}</p>
        </div>
      )}
    </Card>
  );
}