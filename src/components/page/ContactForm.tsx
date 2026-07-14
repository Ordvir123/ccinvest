import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitLead, validateLead } from "@/lib/leads";
import { isRtlReading, type ReadingLang } from "@/types/page";
import contactBg from "@/assets/contact-bg.jpg.asset.json";


type Labels = {
  name: string;
  phone: string;
  email: string;
  message: string;
  send: string;
  sending: string;
  success: string;
  error: string;
};

const COPY: Record<ReadingLang, Labels> = {
  fr: {
    name: "Nom",
    phone: "Téléphone",
    email: "Email",
    message: "Message",
    send: "Envoyer",
    sending: "Envoi…",
    success: "Merci ! Nous vous recontacterons bientôt.",
    error: "Échec de l'envoi. Veuillez réessayer.",
  },
  he: {
    name: "שם",
    phone: "טלפון",
    email: "אימייל",
    message: "הודעה",
    send: "שליחה",
    sending: "שולח…",
    success: "תודה! ניצור איתך קשר בקרוב.",
    error: "השליחה נכשלה. נסה שוב.",
  },
  en: {
    name: "Name",
    phone: "Phone",
    email: "Email",
    message: "Message",
    send: "Send",
    sending: "Sending…",
    success: "Thank you! We'll be in touch soon.",
    error: "Could not send. Please try again.",
  },
};

interface Props {
  heading?: string;
  subheading?: string;
  /** When false (editor preview), the form is inert. */
  interactive?: boolean;
  pageId?: string | null;
  slug?: string;
  projectTitle?: string;
  lang?: ReadingLang;
  /** Override background image (from template settings). */
  backgroundUrl?: string;
}

export function ContactForm({
  heading,
  subheading,
  interactive = false,
  pageId,
  slug,
  projectTitle,
  lang = "fr",
  backgroundUrl,
}: Props) {
  const t = COPY[lang] ?? COPY.fr;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  const [company, setCompany] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactive) return;
    setError(null);
    const input = {
      name,
      phone,
      email,
      lang,
      page_id: pageId ?? null,
      page_slug: slug,
      project_title: projectTitle,
      company,
    };
    const invalid = validateLead(input);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSending(true);
    try {
      await submitLead(input);
      setDone(true);
      setName("");
      setPhone("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden text-primary-foreground"
      dir={isRtlReading(lang) ? "rtl" : "ltr"}
    >
      <img
        src={backgroundUrl?.trim() ? backgroundUrl : contactBg.url}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/85" />
      <Section className="relative z-10 pb-48 md:pb-64">
        <div className="mx-auto max-w-xl pb-8 md:pb-12">

          <h2 className="text-center text-3xl text-primary-foreground md:text-4xl">
            {heading ?? "Contact"}
          </h2>
          {subheading && (
            <p className="mt-3 text-center text-primary-foreground/85">{subheading}</p>
          )}

          {done ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-lg bg-card/95 p-8 text-center text-card-foreground">
              <Check className="h-10 w-10 text-primary" />
              <p className="text-lg">{t.success}</p>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onSubmit} aria-label="Contact form">
              {/* Honeypot — visually hidden, ignored by humans */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.name}
                  aria-label={t.name}
                  className="bg-card text-card-foreground placeholder:text-muted-foreground"
                  required
                />
                <Input
                  id="c-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phone}
                  aria-label={t.phone}
                  className="bg-card text-card-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email}
                aria-label={t.email}
                className="bg-card text-card-foreground placeholder:text-muted-foreground"
                required
              />


              {error && (
                <p className="text-sm font-medium text-destructive-foreground bg-destructive/80 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={sending || !interactive}
                className="w-full bg-cta uppercase tracking-wider text-cta-foreground hover:bg-cta/90"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t.sending}
                  </>
                ) : (
                  t.send
                )}
              </Button>
            </form>
          )}
        </div>
      </Section>
    </section>
  );
}
