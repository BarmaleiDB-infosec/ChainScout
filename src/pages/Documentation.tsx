import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, FileText, Zap, Shield, BookOpen, Terminal } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Documentation = () => {
  const apiEndpoints = [
    {
      method: "POST",
      endpoint: "/api/v1/scan",
      description: "Запустить новый анализ",
      params: ["repository_url", "scan_type", "webhook_url"]
    },
    {
      method: "GET", 
      endpoint: "/api/v1/scan/{id}",
      description: "Получить результаты анализа",
      params: ["id"]
    },
    {
      method: "GET",
      endpoint: "/api/v1/scan/{id}/report",
      description: "Скачать детальный отчёт",
      params: ["id", "format"]
    }
  ];

  const sdkExamples = [
    {
      language: "JavaScript",
      code: `import { ChainScout } from '@chainscout/sdk';

const scout = new ChainScout({
  apiKey: 'your-api-key'
});

// Запуск анализа
const analysis = await scout.scan({
  repository: 'https://github.com/user/repo',
  type: 'smart-contract'
});

console.log(analysis.id);`
    },
    {
      language: "Python",
      code: `from chainscout import ChainScout

scout = ChainScout(api_key='your-api-key')

# Запуск анализа
analysis = scout.scan(
    repository='https://github.com/user/repo',
    type='smart-contract'
)

print(analysis.id)`
    }
  ];

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
                <span className="text-primary font-medium">Документация API</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 glow-text">
                Документация
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Полное руководство по интеграции ChainScout API и SDK в ваши проекты
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="api" className="max-w-6xl mx-auto">
              <TabsList className="grid w-full grid-cols-4 mb-12">
                <TabsTrigger value="api" className="flex items-center space-x-2">
                  <Code className="w-4 h-4" />
                  <span>API</span>
                </TabsTrigger>
                <TabsTrigger value="sdk" className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>SDK</span>
                </TabsTrigger>
                <TabsTrigger value="webhooks" className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <span>Webhooks</span>
                </TabsTrigger>
                <TabsTrigger value="guides" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Руководства</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="api" className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-primary">REST API</h2>
                  <p className="text-muted-foreground mb-8">
                    ChainScout предоставляет мощный REST API для интеграции анализа безопасности в ваши рабочие процессы.
                  </p>
                </div>

                <Card className="glow-card p-6 bg-gradient-card">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-primary" />
                    Аутентификация
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <code className="text-cyber-green">
                      Authorization: Bearer your-api-key
                    </code>
                  </div>
                </Card>

                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold">Основные эндпоинты</h3>
                  {apiEndpoints.map((endpoint, index) => (
                    <Card key={index} className="glow-card p-6 bg-gradient-card">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Badge className={endpoint.method === 'GET' ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-blue/20 text-cyber-blue'}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-lg font-mono">{endpoint.endpoint}</code>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">{endpoint.description}</p>
                      <div>
                        <h4 className="font-semibold mb-2">Параметры:</h4>
                        <div className="flex flex-wrap gap-2">
                          {endpoint.params.map((param) => (
                            <Badge key={param} variant="outline" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sdk" className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-primary">SDK</h2>
                  <p className="text-muted-foreground mb-8">
                    Официальные SDK для быстрой интеграции ChainScout в ваши приложения.
                  </p>
                </div>

                <div className="space-y-6">
                  {sdkExamples.map((example, index) => (
                    <Card key={index} className="glow-card p-6 bg-gradient-card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">{example.language}</h3>
                        <Badge className="bg-primary/20 text-primary">
                          Пример кода
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">
                          <code className="text-cyber-green">{example.code}</code>
                        </pre>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="webhooks" className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-primary">Webhooks</h2>
                  <p className="text-muted-foreground mb-8">
                    Получайте уведомления о завершении анализа в реальном времени.
                  </p>
                </div>

                <Card className="glow-card p-6 bg-gradient-card">
                  <h3 className="text-xl font-semibold mb-4">Настройка Webhook</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <pre className="text-sm">
                      <code className="text-cyber-green">{`{
  "url": "https://your-app.com/webhook",
  "events": ["scan.completed", "scan.failed"],
  "secret": "your-webhook-secret"
}`}</code>
                    </pre>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="guides" className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6 text-primary">Руководства</h2>
                  <p className="text-muted-foreground mb-8">
                    Пошаговые инструкции по интеграции и использованию ChainScout.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: "Быстрый старт", description: "Первые шаги с ChainScout API" },
                    { title: "Анализ смарт-контрактов", description: "Как анализировать Solidity код" },
                    { title: "Интеграция с CI/CD", description: "Автоматизация в GitHub Actions" },
                    { title: "Обработка результатов", description: "Работа с отчётами анализа" }
                  ].map((guide, index) => (
                    <Card key={index} className="glow-card p-6 bg-gradient-card group hover:scale-105 transition-all duration-300">
                      <FileText className="w-8 h-8 text-primary mb-4 group-hover:animate-glow-pulse" />
                      <h3 className="text-xl font-semibold mb-2">{guide.title}</h3>
                      <p className="text-muted-foreground">{guide.description}</p>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Documentation;