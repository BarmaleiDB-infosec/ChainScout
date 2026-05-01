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
      </div>
    </div>
  );
};

export default MainContent;