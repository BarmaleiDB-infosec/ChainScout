import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Send, Mail } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleTelegram = () => {
    window.open("https://t.me/chainscoutsecurity", "_blank");
  };

  const handleEmail = () => {
    window.open("mailto:barmacrpt534@gmail.com", "_blank");
  };

  return (
    <footer className="border-t border-border/50 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <div className="text-center md:text-left text-xs text-muted-foreground">
            © ChainScout 2026
          </div>
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Shield className="w-4 h-4" />
            {t("orderManualAudit")}
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("manualAuditTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-semibold text-base">
              {t("manualAuditDescription")}
            </p>
            
            <div>
              <p className="font-semibold mb-3">{t("contactUs")}</p>
              <div className="flex gap-3">
                <Button
                  onClick={handleTelegram}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </Button>
                <Button
                  onClick={handleEmail}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              </div>
            </div>

            <div className="pt-2 text-sm text-muted-foreground border-t">
              <p>{t("telegramContact")}</p>
              <p>{t("emailContact")}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;