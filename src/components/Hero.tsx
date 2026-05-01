import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Play, Sparkles, Zap, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import securityHologram from "@/assets/security-hologram.jpg";

const Hero = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomElement = document.querySelector('.floating-particle');
      if (randomElement) {
        randomElement.classList.add('animate-pulse');
        setTimeout(() => randomElement.classList.remove('animate-pulse'), 1000);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async () => {
    if (!localStorage.getItem("access_token")) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, войдите для запуска анализа",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsAnalyzing(true);

    try {
      document.getElementById("scanner-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast({
        title: "Добро пожаловать в сканер",
        description: "Выберите источник и запустите анализ",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="relative py-20 bg-transparent overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/30 blur-3xl animate-float floating-particle"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyber-blue/30 blur-2xl animate-float floating-particle" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full bg-cyber-pink/20 blur-xl animate-float floating-particle" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Scanning Lines */}
      <div className="absolute inset-0 opacity-20">
        <div className="scan-line h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent absolute top-1/4 w-full"></div>
        <div className="scan-line h-0.5 bg-gradient-to-r from-transparent via-cyber-blue to-transparent absolute bottom-1/3 w-full" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Content */}
          <div className="mb-12">
            <div className="flex justify-center mb-6 relative">
              <div className="relative group">
                <img 
                  src={securityHologram} 
                  alt="Security Hologram" 
                  className="w-32 h-32 object-cover rounded-full opacity-90 animate-glow-pulse hover:scale-110 transition-all duration-500 cursor-pointer"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                />
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-spin-slow"></div>
                <Sparkles className={`absolute -top-2 -right-2 w-6 h-6 text-cyber-blue transition-all duration-300 ${isHovered ? 'scale-125 rotate-12' : ''}`} />
                <Zap className={`absolute -bottom-2 -left-2 w-5 h-5 text-cyber-pink transition-all duration-300 ${isHovered ? 'scale-125 -rotate-12' : ''}`} />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground animate-fade-in-up">
              {t('title')}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
              {t('subtitle')}
            </p>

            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-primary hover:bg-primary/90 px-12 py-4 text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] interactive-button animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Запуск...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Перейти к сканеру
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
