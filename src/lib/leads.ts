import { supabase } from "@/integrations/supabase/client";
import { submitLeadFn } from "@/lib/submit-lead.functions";


export type LeadStatus = "new" | "contacted" | "closed";

export type Lead = {
  id: string;
  page_id: string | null;
  page_slug: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  lang: string | null;
  status: LeadStatus;
  created_at: string;
};

export type SubmitLeadInput = {
  name: string;
  phone?: string;
  email: string;
  message?: string;
  lang: string;
  page_id?: string | null;
  page_slug?: string;
  project_title?: string;
  /** Honeypot — must remain empty. */
  company?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side validation mirroring the edge function. */
export function validateLead(input: SubmitLeadInput): string | null {
  if (!input.name?.trim()) return "Name is required.";
  if (!input.email?.trim() || !EMAIL_RE.test(input.email.trim()))
    return "A valid email is required.";
  if (input.name.length > 120) return "Name is too long.";
  if ((input.message ?? "").length > 2000) return "Message is too long.";
  return null;
}

/** Submit a lead via the submit-lead server function (service-role insert + email). */
export async function submitLead(
  input: SubmitLeadInput,
): Promise<{ ok: boolean; emailSent?: boolean }> {
  return submitLeadFn({ data: input });
}

/** Admin: list all leads, newest first (authenticated RLS). */
export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, page_id, page_slug, name, phone, email, message, lang, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

/** Admin: update a lead's status. */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
