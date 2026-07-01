import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorPage } from "@/components/ErrorPage";

export const ErrorBoundaryFallback = () => {
  const { t } = useTranslation();

  return (
    <ErrorPage
      testId="error-boundary-fallback"
      role="alert"
      title={t("errorBoundary.title")}
      message={t("errorBoundary.message")}
      actions={
        <Button onClick={() => window.location.reload()}>
          {t("errorBoundary.reload")}
        </Button>
      }
    />
  );
};
