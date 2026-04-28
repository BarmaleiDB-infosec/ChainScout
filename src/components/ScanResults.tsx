import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, XCircle, Download, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: string;
  location: string;
  recommendation: string;
  evidence?: string;
  category?: string;
  tool?: string;
  confidence?: string;
  references?: string[];
}

interface ScanResult {
  summary?: {
    riskScore?: number;
    totalFindings?: number;
    severityBreakdown?: Record<string, number>;
    confidenceAverage?: number;
    toolsUsed?: string[];
    scannerCoverage?: string;
  };
  vulnerabilities?: Record<string, number>;
  findings?: Finding[];
  report?: {
    ai_analysis?: {
      executiveSummary?: string;
      criticalRisks?: Array<{ title: string; severity: string; recommendation: string }>;
      remediationRoadmap?: string[];
      trainingSignals?: string[];
    };
    limitations?: string[];
  };
}

interface ScanResultsProps {
  scan: {
    id: string;
    target_url: string;
    scan_type: string;
    status: string;
    results?: ScanResult | null;
    ai_analysis?: string | null;
    created_at: string;
  };
}

const ScanResults = ({ scan }: ScanResultsProps) => {
  const { results, ai_analysis } = scan;
  const { t } = useTranslation();

  if (!results) return null;

  const resultsData: ScanResult = results as ScanResult;
  const severityBreakdown = resultsData.summary?.severityBreakdown || resultsData.vulnerabilities || {};
  const aiSummary = resultsData.report?.ai_analysis?.executiveSummary || ai_analysis || "";
  const criticalRisks = resultsData.report?.ai_analysis?.criticalRisks || [];
  const remediationRoadmap = resultsData.report?.ai_analysis?.remediationRoadmap || [];
  const trainingSignals = resultsData.report?.ai_analysis?.trainingSignals || [];
  const limitations = resultsData.report?.limitations || [];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <Info className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return '';
    }
  };

  const handleDownloadReport = () => {
    const reportData = {
      scan_id: scan.id,
      target: scan.target_url,
      scanner: scan.scan_type,
      date: new Date(scan.created_at).toLocaleString('ru-RU'),
      results: results,
      ai_analysis: aiSummary,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-scan-${scan.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(severityBreakdown).map(([severity, count]) => (
          <Card key={severity} className="hover-lift glow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{severity}</CardTitle>
              {getSeverityIcon(severity)}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Score */}
      <Card className="glow-card">
        <CardHeader>
          <CardTitle>{t('riskAssessment')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-primary">
              {resultsData.summary?.riskScore || 0}
            </div>
            <div className="flex-1">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                  style={{ width: `${(resultsData.summary as Record<string, number>)?.riskScore || 0}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {resultsData.summary && resultsData.summary.riskScore < 30 && t('lowRisk')}
                {resultsData.summary && resultsData.summary.riskScore >= 30 && resultsData.summary.riskScore < 70 && t('mediumRisk')}
                {resultsData.summary && resultsData.summary.riskScore >= 70 && t('highRisk')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {aiSummary && (
        <Card className="glow-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              {t('aiAnalysis')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{aiSummary}</p>
            </div>
            {criticalRisks.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold">{t('criticalRisks')}</h4>
                {criticalRisks.map((risk, index) => (
                  <div key={`${risk.title}-${index}`} className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{risk.title}</p>
                      <Badge variant="outline" className={getSeverityColor(risk.severity)}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{risk.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(remediationRoadmap.length > 0 || trainingSignals.length > 0 || limitations.length > 0) && (
        <Card className="glow-card">
          <CardHeader>
            <CardTitle>{t('remediationCoverage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {remediationRoadmap.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">{t('remediationOrder')}</h4>
                <div className="space-y-2">
                  {remediationRoadmap.map((step, index) => (
                    <div key={`${step}-${index}`} className="rounded-lg bg-muted/40 p-3 text-sm">
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trainingSignals.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">AI feedback loop</h4>
                <div className="space-y-2">
                  {trainingSignals.map((signal, index) => (
                    <p key={`${signal}-${index}`} className="text-sm text-muted-foreground">
                      {signal}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {limitations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">{t('analysisLimitations')}</h4>
                <div className="space-y-2">
                  {limitations.map((limitation, index) => (
                    <p key={`${limitation}-${index}`} className="text-sm text-muted-foreground">
                      {limitation}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      <Card className="glow-card">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>{t('detectedVulnerabilities')} ({resultsData.findings?.length || 0})</CardTitle>
          <Button onClick={handleDownloadReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('downloadReportBtn')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resultsData.findings?.map((finding, index) => (
              <Card key={(finding.id as string) || index} className={`border ${getSeverityColor(finding.severity as string)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(finding.severity as string)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground">{finding.title as string}</h4>
                        <Badge variant="outline" className={getSeverityColor(finding.severity as string)}>
                          {finding.severity as string}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description as string}</p>
                      {finding.evidence && (
                        <div className="rounded-lg bg-background/70 border border-border/50 p-3 text-xs text-muted-foreground">
                          {finding.evidence}
                        </div>
                      )}
                      {finding.location && (
                        <p className="text-xs text-muted-foreground">📍 {finding.location as string}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {finding.category && <Badge variant="secondary">{finding.category}</Badge>}
                        {finding.tool && <Badge variant="outline">{finding.tool}</Badge>}
                        {finding.confidence && <Badge variant="outline">{finding.confidence}</Badge>}
                      </div>
                      {finding.recommendation && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-foreground">💡 Рекомендация:</p>
                          <p className="text-sm text-muted-foreground mt-1">{String(finding.recommendation)}</p>
                        </div>
                      )}
                      {finding.references && finding.references.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          References: {finding.references.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanResults;
