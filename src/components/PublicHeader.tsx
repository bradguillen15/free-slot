import { Link } from "react-router-dom";
import { Sparkles, Home, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function PublicHeader({ showAppLink = true }: { showAppLink?: boolean }) {
  const { t } = useTranslation();
  return (
    <header className="w-full px-5 sm:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-semibold tracking-tight">FreeSlot</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Home className="h-3.5 w-3.5" /> {t("common.home")}
          </Button>
        </Link>
        {showAppLink && (
          <Link to="/app">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> {t("common.openApp")}
            </Button>
          </Link>
        )}
        <LanguageSwitcher compact />
      </div>
    </header>
  );
}

