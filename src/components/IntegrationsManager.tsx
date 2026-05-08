import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Github, Code, Zap, AlertCircle, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Integration {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

const PROVIDERS = [
  { id: 'github', name: 'GitHub', icon: Github, description: 'Сканирование репозиториев' },
  { id: 'etherscan', name: 'Etherscan', icon: Code, description: 'Анализ смарт-контрактов Ethereum' },
  { id: 'infura', name: 'Infura', icon: Zap, description: 'Ethereum/IPFS провайдер' },
  { id: 'alchemy', name: 'Alchemy', icon: Zap, description: 'Web3 API платформа' },
];

const IntegrationsManager = () => {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const loadIntegrations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: Error | unknown) {
      console.error('Error loading integrations:', error);
      const message = error instanceof Error ? error.message : t('loadError');
      toast({
        title: t('authErrorTitle'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleAddIntegration = async (provider: string) => {
    if (!apiKey.trim()) {
      toast({
        title: t('authErrorTitle'),
        description: t('enterApiKeyError'),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: t('authErrorTitle'),
          description: t('loginRequired'),
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('integrations')
        .insert({
          user_id: user.id,
          provider,
          api_key: apiKey,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: t('successTitle'),
        description: t('addedSuccess'),
      });

      setApiKey("");
      setAddingProvider(null);
      loadIntegrations();
    } catch (error: Error | unknown) {
      console.error('Error adding integration:', error);
      const message = error instanceof Error ? error.message : t('addError');
      toast({
        title: t('authErrorTitle'),
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('successTitle'),
        description: t('deleteSuccess'),
      });

      loadIntegrations();
    } catch (error: Error | unknown) {
      console.error('Error deleting integration:', error);
      toast({
        title: t('authErrorTitle'),
        description: t('deleteError'),
        variant: "destructive",
      });
    }
  };

  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find(p => p.id === providerId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('integrations')}</CardTitle>
        <CardDescription>
          {t('integrationsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('apiKeysWarning')}
          </AlertDescription>
        </Alert>

        {/* Список провайдеров */}
        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const integration = integrations.find(i => i.provider === provider.id);

            return (
              <div key={provider.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="w-8 h-8 text-primary mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{provider.name}</h4>
                        {integration && (
                          <Badge variant="default" className="text-xs">
                            {t('connectedBadge')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {provider.description}
                      </p>

                      {!integration && addingProvider === provider.id && (
                        <div className="space-y-2 mt-3">
                          <Label htmlFor={`api-key-${provider.id}`}>{t('apiKeyLabel')}</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`api-key-${provider.id}`}
                              type="password"
                              placeholder={t('enterApiKey')}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                            <Button onClick={() => handleAddIntegration(provider.id)}>
                              {t('save')}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setAddingProvider(null);
                                setApiKey("");
                              }}
                            >
                              {t('cancel')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {integration && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{t('apiKeyLabel')}: •••••••••{integration.api_key.slice(-4)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {integration ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteIntegration(integration.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      !addingProvider && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddingProvider(provider.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t('addIntegration')}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationsManager;