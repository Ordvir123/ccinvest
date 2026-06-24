import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/ui/section";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_admin/admin")({
  component: PagesList,
});

function PagesList() {
  const { t } = useTranslation();
  return (
    <Section>
      <h1 className="text-3xl text-foreground">{t("pages.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("pages.subtitle")}</p>
      <Card className="mt-8">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("pages.empty")}
        </CardContent>
      </Card>
    </Section>
  );
}
