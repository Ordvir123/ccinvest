import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/ui/section";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_admin/admin/new")({
  component: NewPage,
});

function NewPage() {
  const { t } = useTranslation();
  return (
    <Section>
      <h1 className="text-3xl text-foreground">{t("newPage.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("newPage.subtitle")}</p>
      <Card className="mt-8">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("common.comingSoon")}
        </CardContent>
      </Card>
    </Section>
  );
}
