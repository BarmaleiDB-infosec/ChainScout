import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createScan, pollScan, type CreateScanRequest, type ScanJob, type ScanTargetType } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Bot, FileText, Globe, Loader2, Shield, Upload, Wallet, Zap } from "lucide-react";

const targetTypes: Array<{
  id: ScanTargetType;
  label: string;
  description: string;
  icon: typeof Globe;
  placeholder: string;
  acceptsFile?: boolean;
}> = [
  {
    id: "contract_address",
    label: "smartContract", // translation key
    description: "contractDescription",
    icon: Wallet,
    placeholder: "0x742d35Cc6634C0532925a3b8D4C9db96590b5aF3",
  },
  {
    id: "solana_program",
    label: "solanaProgram", // translation key  
    description: "Solana program ID for on-chain program security analysis",
    icon: Zap,
    placeholder: "Enter Solana program ID",
  },
  {
    id: "web3_project",
    label: "dapp", // translation key
    description: "dappDescription",
    icon: Globe,
    placeholder: "https://app.example.xyz",
  },
];

const ScannerSelector = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTarget, setSelectedTarget] = useState<ScanTargetType>("contract_address");
  const [scanLevel, setScanLevel] = useState("comprehensive");
  const [targetUrl, setTargetUrl] = useState("");
  const [isPrefilledUrl, setIsPrefilledUrl] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeScan, setActiveScan] = useState<ScanJob | null>(null);

  const selectedTypeConfig = useMemo(
    () => targetTypes.find((type) => type.id === selectedTarget),
    [selectedTarget]
  );

  useEffect(() => {
    const prefillTarget = localStorage.getItem("chainscout.prefillTarget");
    const prefillType = localStorage.getItem("chainscout.prefillTargetType") as ScanTargetType | null;
    if (prefillTarget) {
      setTargetUrl(prefillTarget);
      setIsPrefilledUrl(true);
      localStorage.removeItem("chainscout.prefillTarget");
    }
    if (prefillType && targetTypes.some((type) => type.id === prefillType)) {
      setSelectedTarget(prefillType);
      localStorage.removeItem("chainscout.prefillTargetType");
    }
  }, []);

  const handleStartScan = async () => {
    if (!localStorage.getItem("access_token")) {
      toast({
        title: t('requiresLogin'),
        description: t('loginToRun'),
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (selectedTypeConfig?.acceptsFile && !selectedFile) {
      toast({
        title: t('selectFile'),
        description: t('uploadFileArchive'),
        variant: "destructive",
      });
      return;
    }

    if (!selectedTypeConfig?.acceptsFile && !targetUrl.trim()) {
      toast({
        title: t('enterTarget'),
        description: t('enterTargetAddress'),
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setActiveScan(null);

    const request: CreateScanRequest = {
      targetType: selectedTarget,
      targetUrl: selectedTypeConfig?.acceptsFile ? undefined : targetUrl.trim(),
      level: scanLevel,
      file: selectedFile,
    };

    try {
      toast({
        title: t('startingJob'),
        description: t('preparingArtifacts'),
      });

      const job = await createScan(request);
      setActiveScan(job);

      const finishedJob = await pollScan(job.id, { intervalMs: 10000, timeoutMs: 180000 });
      setActiveScan(finishedJob);

      if (finishedJob.status === "failed") {
        throw new Error(finishedJob.error || t('unknownError'));
      }

      toast({
        title: t('analysisComplete'),
        description: t('reportReady'),
      });

      navigate("/dashboard", {
        state: {
          apiScan: finishedJob,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('unknownError');
      toast({
        title: t('analysisError'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section id="scanner-section" className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 glow-text">
              {t('scannerTitle')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('scannerDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-8">
            <Card className="glow-card bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Shield className="w-6 h-6 text-primary" />
                  {t('startScan')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('source')}</p>
                  <RadioGroup
                    value={selectedTarget}
                    onValueChange={(value) => {
                      setSelectedTarget(value as ScanTargetType);
                      setSelectedFile(null);
                      setTargetUrl("");
                    }}
                    className="grid gap-3 md:grid-cols-2"
                  >
                    {targetTypes.map((type) => (
                      <Label
                        key={type.id}
                        htmlFor={type.id}
                        className="flex items-start gap-3 rounded-xl border border-border/60 p-4 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                        <type.icon className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-semibold">{t(type.label as any)}</div>
                          <div className="text-sm text-muted-foreground">{t(type.description as any)}</div>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('analysisTarget')}</p>
                  {selectedTypeConfig?.acceptsFile ? (
                    <div className="rounded-xl border border-dashed border-primary/40 bg-background/40 p-4">
                      <Input
                        type="file"
                        accept=".sol,.json,.txt"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                        disabled={isScanning}
                        className="bg-transparent"
                      />
                      <p className="mt-3 text-sm text-muted-foreground">
                        {selectedFile ? `${t('filePlaceholder')}${selectedFile.name}` : selectedTypeConfig?.placeholder}
                      </p>
                    </div>
                  ) : isPrefilledUrl && targetUrl.trim() ? (
                    <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex flex-col gap-3">
                      <div className="text-sm text-muted-foreground">{t('urlFromSection')}</div>
                      <div className="break-words font-medium text-foreground">{targetUrl}</div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setTargetUrl("");
                          setIsPrefilledUrl(false);
                        }}
                        className="w-fit px-4 py-2"
                      >
                        {t('changeUrl')}
                      </Button>
                    </div>
                  ) : (
                    <Input
                      placeholder={selectedTypeConfig?.placeholder}
                      value={targetUrl}
                      onChange={(event) => {
                        setTargetUrl(event.target.value);
                        if (isPrefilledUrl) {
                          setIsPrefilledUrl(false);
                        }
                      }}
                      disabled={isScanning}
                      className="bg-background/50 border-border/60 focus:border-primary"
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{t('analysisDepth')}</p>
                  <RadioGroup value={scanLevel} onValueChange={setScanLevel} className="grid gap-3 grid-cols-2">
                    <Label
                      htmlFor="standard"
                      className="flex items-start gap-3 rounded-xl border border-border/60 p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <RadioGroupItem value="standard" id="standard" className="mt-1" />
                      <Shield className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-semibold">{t('standard')}</div>
                        <div className="text-sm text-muted-foreground">{t('standardDescription')}</div>
                      </div>
                    </Label>
                    <Label
                      htmlFor="comprehensive"
                      className="flex items-start gap-3 rounded-xl border border-border/60 p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <RadioGroupItem value="comprehensive" id="comprehensive" className="mt-1" />
                      <Zap className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-semibold">{t('comprehensive')}</div>
                        <div className="text-sm text-muted-foreground">{t('comprehensiveDescription')}</div>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                <Button onClick={handleStartScan} disabled={isScanning} className="w-full btn-cyber text-lg py-6">
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('selectingEngine')}
                    </>
                  ) : (
                    <>
                      <Bot className="w-5 h-5 mr-2" />
                      {t('startScanning')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="glow-card bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Bot className="w-5 h-5 text-primary" />
                    {t('whatAIDoesTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{t('aiLayerDescription')}</p>
                  <p>{t('aiSignalsDescription')}</p>
                </CardContent>
              </Card>

              <Card className="glow-card bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="w-5 h-5 text-primary" />
                    Статус текущего job
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeScan ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Job ID</span>
                        <span className="font-mono text-xs">{activeScan.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Статус</span>
                        <span className="font-semibold capitalize">{activeScan.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Источник</span>
                        <span>{activeScan.sourceKind}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                          style={{ width: `${activeScan.progress}%` }}
                        />
                      </div>
                      {activeScan.report && (
                        <div className="rounded-lg bg-background/60 border border-border/60 p-4 text-sm">
                          <p className="font-semibold mb-2">Готово:</p>
                          <p>Риск: {activeScan.report.summary.riskScore}/100</p>
                          <p>Findings: {activeScan.report.summary.totalFindings}</p>
                          <p>Tools: {activeScan.report.summary.toolsUsed.join(", ") || "heuristics"}</p>
                        </div>
                      )}
                      {activeScan.error && (
                        <p className="text-sm text-destructive">{activeScan.error}</p>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-3">
                      <p>Job-based поток уже готов: ссылка или файл отправляются на backend, затем дашборд показывает живой статус и итоговый отчёт.</p>
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-primary" />
                        <span>Поддержаны URL и upload прямо в браузере.</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScannerSelector;