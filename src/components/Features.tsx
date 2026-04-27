import { Card } from "@/components/ui/card";
import { Shield, Scan, GitBranch, Zap, Bug, FileSearch } from "lucide-react";

const Features = () => {
  const steps = [
    {
      number: "01",
      title: "Подключите проект",
      description: "Загрузите репозиторий или подключите через GitHub/GitLab",
      icon: GitBranch
    },
    {
      number: "02", 
      title: "Запустите анализ",
      description: "ИИ автоматически подбирает и запускает оптимальные инструменты",
      icon: Zap
    },
    {
      number: "03",
      title: "Получите отчёт",
      description: "ИИ создаёт детальный PDF-отчёт с рекомендациями",
      icon: FileSearch
    }
  ];

  const capabilities = [
    "Статический анализ кода",
    "Поиск уязвимостей в смарт-контрактах",
    "Аудит Web3 проектов",
    "Интеграции с GitHub/GitLab",
    "Автоматизированные тесты безопасности",
    "Мониторинг в реальном времени"
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* How it works */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 glow-text">
              Как это работает
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Три простых шага до полного анализа безопасности вашего проекта
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
                  <h3 className="text-2xl font-semibold mb-4 text-primary">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
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
              Функциональность
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Полный спектр инструментов для обеспечения безопасности Web3 проектов
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((capability, index) => (
              <Card 
                key={capability}
                className="glow-card p-6 bg-gradient-card group hover:scale-105 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-primary group-hover:animate-glow-pulse" />
                  <span className="font-medium">{capability}</span>
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