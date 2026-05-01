import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { Shield, Plus, ExternalLink, Plug } from "lucide-react";
import ScanResults from "@/components/ScanResults";
import { listRecentApiScans, type ScanJob } from "@/lib/api";
import { useLocation, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  type DashboardScan = {
    id: string;
    target_url: string;
    scan_type: string;
    status: string;
    results?: Record<string, unknown> | null;
    ai_analysis?: string | null;
    created_at: string;
    source: "api";
  };

  const [recentScans, setRecentScans] = useState<DashboardScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<DashboardScan | null>(null);
  const [loadingScans, setLoadingScans] = useState(true);

  const loadRecentScans = useCallback(async () => {
    try {
      const apiScans = await listRecentApiScans().catch(() => [] as ScanJob[]);

      const apiRows: DashboardScan[] = apiScans.map((scan) => ({
        id: scan.id,
        target_url: scan.target_url || scan.report?.target.originalFilename || "Uploaded artifact",
        scan_type: scan.target_type,
        status: scan.status,
        results: scan.report
          ? {
              summary: {
                riskScore: scan.report.summary.riskScore,
                totalFindings: scan.report.summary.totalFindings,
              },
              vulnerabilities: scan.report.summary.severityBreakdown,
              findings: scan.report.findings,
              report: scan.report,
              limitations: scan.report.limitations,
            }
          : null,
        ai_analysis: scan.report?.ai_analysis?.executiveSummary || scan.error || null,
        created_at: scan.created_at,
        source: "api",
      }));

      const sorted = apiRows.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRecentScans(sorted);

      const routeScan = (location.state as { apiScan?: ScanJob } | null)?.apiScan;
      if (routeScan?.id) {
        const matched = sorted.find((scan) => scan.id === routeScan.id);
        if (matched) {
          setSelectedScan(matched);
        }
      }
    } catch (error) {
      console.error('Error loading scans:', error);
    } finally {
      setLoadingScans(false);
    }
  }, [location.state]);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      loadRecentScans();
    }
  }, []);

  if (loadingScans) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('welcomeBack')}, {localStorage.getItem('user_email')?.split('@')[0] || ''}!
          </h1>
          <p className="text-muted-foreground">
            {t('monitorSecurity')}
          </p>
        </div>

          {/* Quick Actions */}
          <div className="mb-6 flex gap-3">
            <Button 
              onClick={() => navigate('/')}
              className="interactive-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('newScan')}
            </Button>
          </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          {selectedScan ? (
            <div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedScan(null)}
                className="mb-4"
              >
                {t('backToScanList')}
              </Button>
              <ScanResults scan={selectedScan} />
            </div>
          ) : (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t('scanHistory')}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('newScan')}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {t('securityAnalysisResults')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingScans ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : recentScans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('noScansYet')}</p>
                    <p className="text-sm">{t('startFirstSecurityAnalysis')}</p>
                    <Button 
                      onClick={() => navigate('/')}
                      className="mt-4"
                    >
                      {t('runAnalysis')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentScans.map((scan) => (
                      <Card 
                        key={scan.id} 
                        className="cursor-pointer hover:border-primary/50 transition-all"
                        onClick={() => setSelectedScan(scan)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{scan.target_url}</h4>
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Badge variant="outline">{scan.scan_type}</Badge>
                                <Badge variant="secondary">API Job</Badge>
                                <span>{new Date(scan.created_at).toLocaleDateString('ru-RU')}</span>
                              </div>
                              {scan.results?.summary && (
                                <div className="flex items-center gap-2 text-sm mt-2">
                                  <span className="text-muted-foreground">{t('vulnerabilitiesLabel')}</span>
                                  {scan.results?.vulnerabilities?.critical && scan.results.vulnerabilities.critical > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {scan.results.vulnerabilities.critical} {t('critical')}
                                    </Badge>
                                  )}
                                  {scan.results?.vulnerabilities?.high && scan.results.vulnerabilities.high > 0 && (
                                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500">
                                      {scan.results.vulnerabilities.high} {t('high')}
                                    </Badge>
                                  )}
                                  <span className="text-muted-foreground">
                                    Risk: {scan.results?.summary?.riskScore || 0}/100
                                  </span>
                                </div>
                              )}
                            </div>
                            <Badge 
                              variant={scan.status === 'completed' ? 'default' : scan.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {scan.status === 'completed' ? t('completed') : 
                               scan.status === 'processing' || scan.status === 'running' ? t('processing') :
                               scan.status === 'failed' ? t('failed') : t('pending')}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
