import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { Globe } from "lucide-react";
import { Language } from '@/lib/translations';

const LanguageSwitch = () => {
  const { language, setLanguage } = useTranslation();

  const next = language === 'en' ? 'ru' : 'en';
  const label = next === 'en' ? 'English' : 'Русский';

  return (
    <Button
      variant="ghost"
      size="sm"
  onClick={() => setLanguage(next as Language)}
      aria-label={`Switch language to ${label}`}
      title={`Switch language to ${label}`}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </Button>
  );
};

export default LanguageSwitch;