import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function InstallAppCard() {
  const { t } = useTranslation();
  const { canInstall, isInstalled, isIos, install } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card data-testid="install-app-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> {t("settings.installApp.title")}
        </CardTitle>
        <CardDescription>{t("settings.installApp.desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isInstalled ? (
          <p className="text-sm text-muted-foreground">{t("settings.installApp.installed")}</p>
        ) : canInstall ? (
          <Button
            type="button"
            className="gap-2"
            disabled={installing}
            onClick={() => void handleInstall()}
            data-testid="install-app-button"
          >
            <Download className="h-4 w-4" />
            {installing ? t("settings.installApp.installing") : t("settings.installApp.install")}
          </Button>
        ) : isIos ? (
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t("settings.installApp.iosStep1")}</li>
            <li>{t("settings.installApp.iosStep2")}</li>
            <li>{t("settings.installApp.iosStep3")}</li>
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t("settings.installApp.unsupported")}</p>
        )}
      </CardContent>
    </Card>
  );
}
