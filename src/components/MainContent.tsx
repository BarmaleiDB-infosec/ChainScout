import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Globe, Activity, AlertTriangle, CheckCircle, Download, Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import cyberNetworkBg from "@/assets/cyber-network-bg.jpg";
import securityHologram from "@/assets/security-hologram.jpg";

const MainContent = () => {
  const { t } = useTranslation();
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleCards(prev => [...prev, index]);
          }
        });
      },
      { threshold: 0.2 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const vulnerabilityData = [
    { name: t('critical'), value: 0, color: '#ef4444' },
    { name: t('high'), value: 0, color: '#f97316' },
    { name: t('medium'), value: 0, color: '#eab308' },
    { name: t('low'), value: 0, color: '#22c55e' },
  ];

  return (
    <div className="container mx-auto px-4 py-12 space-y-12 relative">
      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((index) => (
          <Card 
            key={index}
            ref={el => cardRefs.current[index] = el}
            data-index={index}
            className={`transition-all duration-700 hover:scale-105 hover-glow glow-card interactive-button relative overflow-hidden ${
              visibleCards.includes(index) ? 'animate-bounce-in' : 'opacity-0 translate-y-10'
            }`}
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-cyber-blue/5 opacity-50"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-primary">
                {index === 0 ? t('totalScans') : index === 1 ? t('totalVulnerabilities') : t('projectsScanned')}
              </CardTitle>
              {index === 0 && <Activity className="h-5 w-5 text-primary transition-transform hover:scale-125 hover:rotate-12" />}
              {index === 1 && <AlertTriangle className="h-5 w-5 text-cyber-blue transition-transform hover:scale-125 hover:rotate-12" />}
              {index === 2 && <CheckCircle className="h-5 w-5 text-cyber-green transition-transform hover:scale-125 hover:rotate-12" />}
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-foreground">0</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* About Us */}
        <Card 
          ref={el => cardRefs.current[3] = el}
          data-index={3}
          className={`transition-all duration-700 hover-glow glow-card auth-card relative overflow-hidden ${
            visibleCards.includes(3) ? 'animate-slide-in-left' : 'opacity-0 -translate-x-10'
          }`}
        >
          <div className="absolute inset-0 opacity-10">
            <img src={cyberNetworkBg} alt="" className="w-full h-full object-cover" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="w-6 h-6 transition-transform hover:scale-110 hover:rotate-12" />
              {t('aboutUs')}
              <Zap className="w-4 h-4 text-cyber-blue transition-transform hover:scale-125" />
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-muted-foreground leading-relaxed">{t('aboutDescription')}</p>
          </CardContent>
        </Card>

        {/* Our Mission */}
        <Card 
          ref={el => cardRefs.current[7] = el}
          data-index={7}
          className={`transition-all duration-700 hover-glow glow-card auth-card relative overflow-hidden ${
            visibleCards.includes(7) ? 'animate-slide-in-left' : 'opacity-0 translate-x-10'
          }`}
        >
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText className="w-6 h-6 transition-transform hover:scale-110 hover:rotate-6" />
              {t('ourMission')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-muted-foreground leading-relaxed">{t('missionDescription')}</p>
          </CardContent>
        </Card>

        {/* Vulnerability Chart */}
        <Card 
          ref={el => cardRefs.current[4] = el}
          data-index={4}
          className={`transition-all duration-700 hover-glow glow-card auth-card relative overflow-hidden ${
            visibleCards.includes(4) ? 'animate-slide-in-left' : 'opacity-0 translate-x-10'
          }`}
          style={{ animationDelay: '0.3s' }}
        >
          <div className="absolute inset-0 opacity-10">
            <img src={securityHologram} alt="" className="w-full h-full object-cover" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-primary">{t('vulnerabilities')}</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center group cursor-default">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50 text-cyber-blue transition-all duration-300 group-hover:scale-110 group-hover:opacity-70" />
                <p className="text-lg text-primary font-semibold transition-colors group-hover:text-primary-glow">{t('noResults')}</p>
                <p className="text-sm mt-2 text-muted-foreground">{t('runAnalysisResultsMsg')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results Table */}
      <Card 
        ref={el => cardRefs.current[5] = el}
        data-index={5}
        className={`transition-all duration-700 hover-glow glow-card auth-card ${
          visibleCards.includes(5) ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'
        }`}
        style={{ animationDelay: '0.5s' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="w-6 h-6 transition-transform hover:scale-110 hover:rotate-6" />
            {t('analysisResults')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center group cursor-default">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50 text-cyber-green transition-all duration-300 group-hover:scale-110 group-hover:opacity-70" />
              <p className="text-lg text-primary font-semibold transition-colors group-hover:text-primary-glow">{t('noResults')}</p>
              <p className="text-sm mt-2 text-muted-foreground">Запустите анализ для просмотра результатов</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Reports Section */}
      <Card 
        ref={el => cardRefs.current[6] = el}
        data-index={6}
        className={`transition-all duration-700 hover-glow glow-card auth-card ${
          visibleCards.includes(6) ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'
        }`}
        style={{ animationDelay: '0.7s' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Download className="w-6 h-6 transition-transform hover:scale-110 hover:-translate-y-1" />
            {t('yourReports')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center group cursor-default">
              <Download className="w-16 h-16 mx-auto mb-4 opacity-50 text-cyber-pink transition-all duration-300 group-hover:scale-110 group-hover:opacity-70 group-hover:-translate-y-1" />
              <p className="text-lg text-primary font-semibold transition-colors group-hover:text-primary-glow">{t('noReports')}</p>
              <p className="text-sm mt-2 text-muted-foreground">Отчёты появятся после завершения анализа</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainContent;