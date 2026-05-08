import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Shield, Bug } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const Dashboard = () => {
  const { t } = useTranslation();
  const mockAnalyses = [
    {
      id: 1,
      project: "DeFi Protocol V2",
      status: "completed",
      severity: "high",
      vulnerabilities: 12,
      lastScan: "2 часа назад",
      progress: 100
    },
    {
      id: 2,
      project: "NFT Marketplace",
      status: "scanning",
      severity: "medium",
      vulnerabilities: 3,
      lastScan: "Сканируется",
      progress: 67
    },
    {
      id: 3,
      project: "Token Bridge",
      status: "completed",
      severity: "low",
      vulnerabilities: 1,
      lastScan: "1 день назад",
      progress: 100
    },
    {
      id: 4,
      project: "Yield Farm Contract",
      status: "pending",
      severity: "unknown",
      vulnerabilities: 0,
      lastScan: "В очереди",
      progress: 0
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-cyber-green" />;
      case 'scanning': return <Clock className="w-4 h-4 text-cyber-blue animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return <AlertTriangle className="w-4 h-4 text-cyber-pink" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-cyber-green/20 text-cyber-green border-cyber-green/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const stats = [
    { label: t('totalScansLabel'), value: "1,247", icon: Shield, color: "text-primary" },
    { label: t('vulnerabilitiesFoundLabel'), value: "89", icon: Bug, color: "text-destructive" },
    { label: t('fixedCriticalLabel'), value: "45", icon: CheckCircle, color: "text-cyber-green" },
    { label: t('projectsSecurityLabel'), value: "94%", icon: TrendingUp, color: "text-cyber-blue" }
  ];

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 glow-text">
            {t('controlPanel')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('centralizedControl')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label}
              className="glow-card p-6 text-center bg-gradient-card group hover:scale-105 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color} group-hover:animate-glow-pulse`} />
              <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Dashboard Mock */}
        <Card className="glow-card p-8 bg-gradient-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">{t('recentAnalyses')}</h3>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {t('liveDashboard')}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('project')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('status')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('severity')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('vulnerabilities')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('lastScanTime')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('progress')}</th>
                </tr>
              </thead>
              <tbody>
                {mockAnalyses.map((analysis, index) => (
                  <tr 
                    key={analysis.id} 
                    className="border-b border-border/30 hover:bg-muted/10 transition-colors group animate-fade-in-up"
                    style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium">{analysis.project}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(analysis.status)}
                        <span className="capitalize">{analysis.status === 'completed' ? t('completed') : analysis.status === 'scanning' ? t('scanning') : t('pending')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getSeverityColor(analysis.severity)}>
                        {analysis.severity === 'high' ? t('high') : analysis.severity === 'medium' ? t('medium') : analysis.severity === 'low' ? t('low') : t('unknown')}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className={analysis.vulnerabilities > 5 ? 'text-destructive' : analysis.vulnerabilities > 0 ? 'text-yellow-400' : 'text-cyber-green'}>
                        {analysis.vulnerabilities}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {analysis.lastScan}
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-24">
                        <Progress value={analysis.progress} className="h-2" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default Dashboard;