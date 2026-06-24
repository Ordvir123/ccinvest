import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Section } from "@/components/ui/section";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listLeads, updateLeadStatus, type Lead, type LeadStatus } from "@/lib/leads";

export const Route = createFileRoute("/_admin/admin/leads")({
  component: LeadsView,
});

const STATUS_VARIANT: Record<LeadStatus, "default" | "secondary" | "outline"> = {
  new: "default",
  contacted: "secondary",
  closed: "outline",
};

function LeadsView() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Lead | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: listLeads,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Status updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  return (
    <Section>
      <div>
        <h1 className="text-3xl text-foreground">Leads</h1>
        <p className="mt-2 text-muted-foreground">
          Enquiries submitted through your project contact forms.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              Could not load leads. Check the connection.
            </div>
          ) : !data || data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No leads yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Lang</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setActive(lead)}
                  >
                    <TableCell className="text-muted-foreground">
                      {new Date(lead.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.page_slug ?? "—"}
                    </TableCell>
                    <TableCell className="uppercase text-muted-foreground">
                      {lead.lang ?? "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={lead.status}
                        onValueChange={(v) =>
                          mutation.mutate({ id: lead.id, status: v as LeadStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead from {active?.name}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Phone:</span> {active.phone ?? "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {active.email}</p>
              <p><span className="text-muted-foreground">Project:</span> {active.page_slug ?? "—"}</p>
              <p><span className="text-muted-foreground">Language:</span> {(active.lang ?? "—").toUpperCase()}</p>
              <p><span className="text-muted-foreground">Received:</span> {new Date(active.created_at).toLocaleString()}</p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={STATUS_VARIANT[active.status]}>{active.status}</Badge>
              </div>
              <div className="pt-2">
                <p className="text-muted-foreground">Message:</p>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3">
                  {active.message || "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}
