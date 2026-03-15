import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { SustainabilityReport } from "../types/ecolens";

interface EvidenceSectionProps {
  report: SustainabilityReport | null;
}

export function EvidenceSection({ report }: EvidenceSectionProps) {
  if (!report) {
    return null;
  }

  const hasEvidence = report.evidence && Object.values(report.evidence).some(
    (arr) => arr && arr.length > 0
  );

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <h2 className="text-xl font-semibold mb-4">Evidence & Alternatives</h2>

      {hasEvidence && (
        <Tabs defaultValue="carbon" className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="carbon">Carbon</TabsTrigger>
            <TabsTrigger value="water">Water</TabsTrigger>
            <TabsTrigger value="deforestation">Deforestation</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
          </TabsList>

          {["carbon", "water", "deforestation", "labor"].map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="space-y-2">
                {report.evidence?.[category as keyof typeof report.evidence]?.map(
                  (item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-accent/50 rounded-lg border border-border"
                    >
                      <p className="text-sm text-foreground">{item}</p>
                    </div>
                  )
                )}
                {(!report.evidence?.[category as keyof typeof report.evidence] ||
                  report.evidence[category as keyof typeof report.evidence]
                    ?.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No evidence available
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {report.alternatives && report.alternatives.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Sustainable Alternatives</h3>
          <div className="space-y-2">
            {report.alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="p-3 bg-green-500/10 rounded-lg border border-green-500/20"
              >
                <p className="text-sm text-foreground">{alt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasEvidence && (!report.alternatives || report.alternatives.length === 0) && (
        <div className="text-center text-muted-foreground py-8">
          No additional evidence or alternatives available
        </div>
      )}
    </Card>
  );
}