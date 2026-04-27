import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IntegrationsManager from "@/components/IntegrationsManager";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Integrations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Интеграции
            </h1>
            <p className="text-muted-foreground">
              Подключите Web3 сервисы для расширенного анализа безопасности
            </p>
          </div>

          <IntegrationsManager />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Integrations;