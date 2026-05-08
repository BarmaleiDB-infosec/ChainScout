import { Card } from "@/components/ui/card";
import { Shield, Scan, GitBranch, Zap, Bug, FileSearch } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const Features = () => {
  const { t } = useTranslation();

  const steps = [
    {
      number: "01",
      titleKey: "connect",
      descriptionKey: "aiAutomaticSelects",
      icon: GitBranch
    },
    {
      number: "02", 
      titleKey: "startAnalysis_",
      descriptionKey: "aiAutomaticSelects",
      icon: Zap
    },
    {
      number: "03",
      titleKey: "getReport",
      descriptionKey: "aiCreatesDetailed",
      icon: FileSearch
    }
  ];

  const capabilities = [
    { key: "staticCodeAnalysis" },
    { key: "vulnerabilitySearch" },
    { key: "web3Audit" },
    { key: "automatedTests" },
    { key: "automatedTests" },
    { key: "realtimeMonitoring" }
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* How it works */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 glow-text">
              {t('howItWorks')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('threeSimpleSteps')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div 
                key={step.number}
                className="relative group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <Card className="glow-card p-8 text-center h-full bg-gradient-card group-hover:scale-105 transition-all duration-300">
                  <div className="relative mb-6">
                    <div className="text-6xl font-bold text-primary/20 mb-4">{step.number}</div>
                    <step.icon className="w-16 h-16 mx-auto text-primary animate-float" style={{ animationDelay: `${index * 0.5}s` }} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-primary">{t(step.titleKey as any)}</h3>
                  <p className="text-muted-foreground">{t(step.descriptionKey as any)}</p>
                </Card>
                
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30 z-10"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Functionality */}
        <div>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 glow-text">
              {t('functionality')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('fullSpectrumTools')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((capability, index) => (
              <Card 
                key={`${capability.key}-${index}`}
                className="glow-card p-6 bg-gradient-card group hover:scale-105 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-primary group-hover:animate-glow-pulse" />
                  <span className="font-medium">{t(capability.key as any)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;