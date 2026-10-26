import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, Pencil, Copy, CopyPlus, ExternalLink, Archive, ArchiveRestore, Trash2, Loader2, Send, FileClock, X } from "lucide-react";

import { SITE_ORIGIN } from "@/lib/site";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [toDelete, setToDelete] = useState<PageListItem | null>(null);
  const [toDuplicate, setToDuplicate] = useState<PageListItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicatePage(id),
    onSuccess: async (newId) => {
      toast.success("Page duplicated as a draft.");
      setToDuplicate(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      navigate({ to: "/admin/pages/$id", params: { id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to duplicate."),
  });



  const bulkMut = useMutation({
    mutationFn: async (status: "published" | "draft" | "archived") => {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((id) => setPageStatus(id, status)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { status, done: ids.length - failed, failed };
    },
    onSuccess: ({ status, done, failed }) => {
      const verb = status === "published" ? "published" : status === "archived" ? "archived" : "moved to draft";
      if (done) toast.success(`${done} page${done > 1 ? "s" : ""} ${verb}.`);
      if (failed) toast.error(`${failed} page${failed > 1 ? "s" : ""} failed.`);
      setSelected(new Set());
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed."),
  });

  const all = data ?? [];
  const rows = all.filter((p) =>
    showArchived ? p.status === "archived" : p.status !== "archived",
  );
  const archivedCount = all.filter((p) => p.status === "archived").length;
  const visibleSelected = rows.filter((p) => selected.has(p.id));
  const allChecked = rows.length > 0 && visibleSelected.length === rows.length;
  const someChecked = visibleSelected.length > 0 && !allChecked;
  const toggleAll = (on: boolean) => setSelected(on ? new Set(rows.map((p) => p.id)) : new Set());
  const toggleOne = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const switchView = (archived: boolean) => {
    setShowArchived(archived);
    setSelected(new Set());
  };

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
          onClick={() => switchView(false)}
        >
          Active
        </Button>
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => switchView(true)}
        >
          <Archive className="h-4 w-4" /> Archive{archivedCount ? ` (${archivedCount})` : ""}
        </Button>
      </div>

      {visibleSelected.length > 0 && (
        <div className="sticky top-2 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
          <span className="px-2 text-sm font-medium">{visibleSelected.length} selected</span>
          {showArchived ? (
            <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => bulkMut.mutate("draft")}>
              <ArchiveRestore className="h-4 w-4" /> Restore as draft
            </Button>
          ) : (
            <>
              <Button size="sm" disabled={bulkMut.isPending} onClick={() => bulkMut.mutate("published")}>
                <Send className="h-4 w-4" /> Publish
              </Button>
              <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => bulkMut.mutate("draft")}>
                <FileClock className="h-4 w-4" /> Move to draft
              </Button>
              <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => bulkMut.mutate("archived")}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            </>
          )}
          {bulkMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setSelected(new Set())} aria-label="Clear selection">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked ? true : someChecked ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={(v) => toggleOne(p.id, v === true)}
                        aria-label={`Select ${p.title}`}
                      />
                    </TableCell>
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
                            size="icon"
                            title="Restore"
                            aria-label="Restore"
                            onClick={() => restoreMut.mutate(p.id)}
                            disabled={restoreMut.isPending}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete permanently"
                            aria-label="Delete permanently"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setToDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {p.status === "published" && (
                            <>
                              <Button asChild variant="ghost" size="icon" title="View" aria-label="View">
                                <a href={`${SITE_ORIGIN}/${p.slug}`} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Copy link"
                                aria-label="Copy link"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(`${SITE_ORIGIN}/${p.slug}`);
                                  toast.success("Share link copied.");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button asChild variant="ghost" size="icon" title="Edit" aria-label="Edit">
                            <Link to="/admin/pages/$id" params={{ id: p.id }}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              duplicateMut.isPending && duplicateMut.variables === p.id
                                ? "Duplicating…"
                                : "Duplicate"
                            }
                            aria-label={
                              duplicateMut.isPending && duplicateMut.variables === p.id
                                ? "Duplicating…"
                                : "Duplicate"
                            }
                            onClick={() => setToDuplicate(p)}
                            disabled={
                              duplicateMut.isPending && duplicateMut.variables === p.id
                            }
                          >
                            {duplicateMut.isPending && duplicateMut.variables === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CopyPlus className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Archive"
                            aria-label="Archive"
                            onClick={() => archiveMut.mutate(p.id)}
                            disabled={archiveMut.isPending}
                          >
                            <Archive className="h-4 w-4" />
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

      <AlertDialog open={!!toDuplicate} onOpenChange={(open) => !open && setToDuplicate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate this page?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDuplicate ? (
                <>
                  A copy of “{toDuplicate.title}” will be created as a draft.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicateMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={duplicateMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toDuplicate) duplicateMut.mutate(toDuplicate.id);
              }}
            >
              {duplicateMut.isPending ? "Duplicating…" : "Duplicate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
