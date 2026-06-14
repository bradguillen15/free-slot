import { Link } from "react-router-dom";
import { Home, LayoutGrid } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function PublicHeader({ showAppLink = true }: { showAppLink?: boolean }) {
  const { t } = useTranslation();
  return (
    <header className="w-full px-5 sm:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
      <Link to="/" className="flex items-center gap-2 group">
        <BrandLogo size={32} className="rounded-lg shadow-glow" />
        <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t("common.home")}>
            <Home className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("common.home")}</span>
          </Button>
        </Link>
        {showAppLink && (
          <Link to="/app">
            <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t("common.openApp")}>
              <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("common.openApp")}</span>
            </Button>
          </Link>
        )}
        <LanguageSwitcher compact />
      </div>
    </header>
  );
}

