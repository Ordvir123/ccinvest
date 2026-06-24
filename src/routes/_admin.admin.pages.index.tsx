import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, Pencil, Copy, ExternalLink } from "lucide-react";

const SITE_ORIGIN = "https://ccinvest.lovable.app";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPages } from "@/lib/pages";

export const Route = createFileRoute("/_admin/admin/pages/")({
  component: PagesList,
});

function PagesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: listPages,
  });

  return (
    <Section>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Pages</h1>
          <p className="mt-2 text-muted-foreground">Manage your real-estate project pages.</p>
        </div>
        <Button asChild>
          <Link to="/admin/pages/new">
            <FilePlus2 className="h-4 w-4" /> New page
          </Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              Could not load pages. Check the Supabase connection.
            </div>
          ) : !data || data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No pages yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-end">
                      {p.status === "published" && (
                        <>
                          <Button asChild variant="ghost" size="sm">
                            <a href={`${SITE_ORIGIN}/${p.slug}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" /> View
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${SITE_ORIGIN}/${p.slug}`);
                              toast.success("Share link copied.");
                            }}
                          >
                            <Copy className="h-4 w-4" /> Link
                          </Button>
                        </>
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/admin/pages/$id" params={{ id: p.id }}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
