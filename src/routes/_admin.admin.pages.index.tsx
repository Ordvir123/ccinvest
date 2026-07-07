import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, Pencil, Copy, CopyPlus, ExternalLink, Archive, ArchiveRestore, Trash2 } from "lucide-react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listPages, setPageStatus, deletePage, duplicatePage, type PageListItem } from "@/lib/pages";

export const Route = createFileRoute("/_admin/admin/pages/")({
  component: PagesList,
});

function PagesList() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [toDelete, setToDelete] = useState<PageListItem | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: listPages,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-pages"] });

  const archiveMut = useMutation({
    mutationFn: (id: string) => setPageStatus(id, "archived"),
    onSuccess: () => {
      toast.success("Page moved to archive.");
      setShowArchived(true);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to archive."),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => setPageStatus(id, "draft"),
    onSuccess: () => {
      toast.success("Page restored as a draft.");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to restore."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: () => {
      toast.success("Page permanently deleted.");
      setToDelete(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete."),
  });

  const all = data ?? [];
  const rows = all.filter((p) =>
    showArchived ? p.status === "archived" : p.status !== "archived",
  );
  const archivedCount = all.filter((p) => p.status === "archived").length;

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

      <div className="mt-6 flex gap-2">
        <Button
          variant={showArchived ? "outline" : "default"}
          size="sm"
          onClick={() => setShowArchived(false)}
        >
          Active
        </Button>
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(true)}
        >
          <Archive className="h-4 w-4" /> Archive{archivedCount ? ` (${archivedCount})` : ""}
        </Button>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              Could not load pages. Check the Supabase connection.
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {showArchived ? "No archived pages." : "No pages yet."}
            </div>
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
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "published"
                            ? "default"
                            : p.status === "archived"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {p.status === "published"
                          ? "Published"
                          : p.status === "archived"
                            ? "Archived"
                            : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-end">
                      {p.status === "archived" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreMut.mutate(p.id)}
                            disabled={restoreMut.isPending}
                          >
                            <ArchiveRestore className="h-4 w-4" /> Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setToDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </>
                      ) : (
                        <>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveMut.mutate(p.id)}
                            disabled={archiveMut.isPending}
                          >
                            <Archive className="h-4 w-4" /> Archive
                          </Button>

                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this page permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? (
                <>
                  “{toDelete.title}” (/{toDelete.slug}) will be permanently removed. This action
                  cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) deleteMut.mutate(toDelete.id);
              }}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
