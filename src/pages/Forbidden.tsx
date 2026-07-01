import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorPage } from "@/components/ErrorPage";

const Forbidden = () => {
  const { t } = useTranslation();

  return (
    <ErrorPage
      layout="embedded"
      testId="forbidden-page"
      title={t("forbidden.title")}
      message={t("forbidden.message")}
      actions={
        <Button asChild>
          <Link to="/auth">{t("forbidden.signIn")}</Link>
        </Button>
      }
    />
  );
};

export default Forbidden;
