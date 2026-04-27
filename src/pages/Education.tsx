import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, Clock, Users, Shield, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Education = () => {
  const courses = [
    {
      title: "Основы безопасности Web3",
      description: "Изучите фундаментальные принципы безопасности в блокчейне и DeFi",
      duration: "4 часа",
      level: "Начинающий",
      students: "1,200+",
      color: "text-cyber-green"
    },
    {
      title: "Аудит смарт-контрактов",
      description: "Профессиональные методы поиска уязвимостей в Solidity коде",
      duration: "8 часов",
      level: "Продвинутый", 
      students: "800+",
      color: "text-primary"
    },
    {
      title: "Автоматизация тестирования",
      description: "Настройка CI/CD пайплайнов для непрерывного аудита безопасности",
      duration: "6 часов",
      level: "Средний",
      students: "600+",
      color: "text-cyber-blue"
    }
  ];

  const vulnerabilities = [
    {
      title: "Reentrancy атаки",
      severity: "critical",
      description: "Как злоумышленники могут повторно вызывать функции до завершения предыдущих вызовов",
      examples: "DAO Hack 2016",
      prevention: ["Использование модификатора nonReentrant", "Паттерн Checks-Effects-Interactions"]
    },
    {
      title: "Integer Overflow/Underflow",
      severity: "high",
      description: "Переполнение чисел может привести к неожиданному поведению контракта",
      examples: "BeautyChain (BEC) Token",
      prevention: ["Использование библиотеки SafeMath", "Solidity 0.8+ встроенная защита"]
    },
    {
      title: "Access Control",
      severity: "medium",
      description: "Неправильное управление доступом к критическим функциям",
      examples: "Parity Multi-Sig Wallet",
      prevention: ["OpenZeppelin AccessControl", "Принцип минимальных привилегий"]
    },
    {
      title: "Front-running",
      severity: "medium",
      description: "Злоумышленники могут видеть транзакции в mempool и опережать их",
      examples: "DEX арбитраж",
      prevention: ["Commit-Reveal схемы", "Временные блокировки"]
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'high': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'medium': return 'bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30';
      default: return 'bg-cyber-green/20 text-cyber-green border-cyber-green/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Shield className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/30 rounded-full px-6 py-2 mb-8">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">Обучение безопасности</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 glow-text">
                Обучение
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Изучите лучшие практики безопасности Web3 и станьте экспертом по аудиту смарт-контрактов
              </p>
            </div>
          </div>
        </section>

        {/* Courses */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 glow-text">
                Курсы безопасности
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Комплексные программы обучения от базовых принципов до продвинутых техник аудита
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, index) => (
                <Card 
                  key={course.title}
                  className="glow-card p-6 bg-gradient-card group hover:scale-105 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="mb-6">
                    <BookOpen className={`w-12 h-12 ${course.color} group-hover:animate-glow-pulse`} />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3">{course.title}</h3>
                  <p className="text-muted-foreground mb-6">{course.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{course.duration}</span>
                    </Badge>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{course.students}</span>
                    </Badge>
                    <Badge className={course.level === 'Начинающий' ? 'bg-cyber-green/20 text-cyber-green' : course.level === 'Средний' ? 'bg-cyber-blue/20 text-cyber-blue' : 'bg-primary/20 text-primary'}>
                      {course.level}
                    </Badge>
                  </div>
                  
                  <Button className="w-full btn-cyber">
                    <Play className="w-4 h-4 mr-2" />
                    Начать курс
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Security Guidelines */}
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 glow-text">
                Гайды по безопасности Web3
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Изучите наиболее распространённые уязвимости и методы их предотвращения
              </p>
            </div>

            <div className="space-y-8">
              {vulnerabilities.map((vuln, index) => (
                <Card 
                  key={vuln.title}
                  className="glow-card p-8 bg-gradient-card animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Vulnerability Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center space-x-3 mb-4">
                        <Badge className={getSeverityColor(vuln.severity)}>
                          {getSeverityIcon(vuln.severity)}
                          <span className="ml-1 capitalize">{vuln.severity}</span>
                        </Badge>
                        <h3 className="text-2xl font-bold">{vuln.title}</h3>
                      </div>
                      
                      <p className="text-muted-foreground mb-4 text-lg">
                        {vuln.description}
                      </p>
                      
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2 text-primary">Известные примеры:</h4>
                        <p className="text-muted-foreground">{vuln.examples}</p>
                      </div>
                    </div>

                    {/* Prevention Methods */}
                    <div>
                      <h4 className="font-semibold mb-4 text-primary flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Методы защиты:
                      </h4>
                      <ul className="space-y-2">
                        {vuln.prevention.map((method, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-cyber-green mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{method}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 glow-text">
                Дополнительные ресурсы
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Чек-лист аудита", icon: CheckCircle, description: "Полный список проверок для аудита" },
                { title: "Библиотека атак", icon: AlertTriangle, description: "База данных известных уязвимостей" },
                { title: "Инструменты", icon: Shield, description: "Рекомендуемые инструменты безопасности" },
                { title: "Сообщество", icon: Users, description: "Присоединяйтесь к экспертам" }
              ].map((resource, index) => (
                <Card 
                  key={resource.title}
                  className="glow-card p-6 text-center bg-gradient-card group hover:scale-105 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <resource.icon className="w-12 h-12 mx-auto mb-4 text-primary group-hover:animate-glow-pulse" />
                  <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                  <p className="text-muted-foreground text-sm">{resource.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Education;