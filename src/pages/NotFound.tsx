import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorPage } from "@/components/ErrorPage";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <ErrorPage
      testId="not-found-page"
      title="404"
      message={t("notFound.message")}
      actions={
        <Button asChild>
          <Link to="/">{t("notFound.returnHome")}</Link>
        </Button>
      }
    />
  );
};

export default NotFound;
