import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";

interface ScanTemplate {
  id: string;
  name: string;
  description: string;
  scan_type: string;
  configuration: unknown;
  is_public: boolean;
  created_at: string;
}

const ScanTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ScanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    scan_type: "github_repo",
    is_public: false,
  });

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("scan_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки шаблонов';
      toast({
        title: "Ошибка загрузки шаблонов",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название шаблона",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("scan_templates").insert({
        user_id: user?.id,
        name: newTemplate.name,
        description: newTemplate.description,
        scan_type: newTemplate.scan_type,
        is_public: newTemplate.is_public,
        configuration: {},
      });

      if (error) throw error;

      toast({
        title: "Шаблон создан",
        description: "Шаблон успешно добавлен",
      });

      setNewTemplate({
        name: "",
        description: "",
        scan_type: "github_repo",
        is_public: false,
      });

      loadTemplates();
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка создания шаблона';
      toast({
        title: "Ошибка создания шаблона",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("scan_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Шаблон удален",
        description: "Шаблон успешно удален",
      });

      loadTemplates();
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления шаблона';
      toast({
        title: "Ошибка удаления шаблона",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Создать новый шаблон
          </CardTitle>
          <CardDescription>
            Создайте шаблон для быстрого запуска повторяющихся сканирований
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Название шаблона
            </label>
            <Input
              placeholder="Например: Аудит DeFi контрактов"
              value={newTemplate.name}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Описание</label>
            <Textarea
              placeholder="Описание шаблона..."
              value={newTemplate.description}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Тип сканирования</label>
            <Select
              value={newTemplate.scan_type}
              onValueChange={(value) =>
                setNewTemplate({ ...newTemplate, scan_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="github_repo">GitHub Репозиторий</SelectItem>
                <SelectItem value="smart_contract">Смарт-контракт</SelectItem>
                <SelectItem value="web_app">Web приложение</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={createTemplate} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Создать шаблон
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Мои шаблоны</h3>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>У вас пока нет шаблонов</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>
                      {template.description || "Нет описания"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Тип: {template.scan_type}</span>
                  <span>
                    Создан: {new Date(template.created_at).toLocaleDateString('ru-RU')}
                  </span>
                  {template.is_public && (
                    <span className="text-primary">Публичный</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ScanTemplates;
