import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitLead, validateLead } from "@/lib/leads";
import { CONTACT_WHATSAPP } from "@/lib/site";
import { isRtlReading, type ReadingLang } from "@/types/page";


type Labels = {
  name: string;
  phone: string;
  email: string;
  message: string;
  send: string;
  sending: string;
  success: string;
  whatsapp: string;
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
    whatsapp: "Une question urgente ? Écrivez-nous sur WhatsApp",
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
    whatsapp: "שאלה דחופה? כתבו לנו בוואטסאפ",
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
    whatsapp: "Urgent question? Message us on WhatsApp",
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
  const [message, setMessage] = useState("");

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
      message,
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
      setMessage("");

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
        src={backgroundUrl?.trim() ? backgroundUrl : "/brand/contact-bg.jpg"}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/85" />
      <Section className="relative z-10 pb-16 md:pb-24">
        <div className="mx-auto max-w-xl pb-8 md:pb-12">

          <h2 className="section-title text-center !text-primary-foreground">
            {heading ?? "Contact"}
          </h2>
          {subheading && (
            <p className="mt-3 text-center text-primary-foreground/85">{subheading}</p>
          )}

          {done ? (
            <div className="mt-8 flex flex-col items-center gap-3 animate-rise rounded-3xl bg-card/95 p-8 text-center text-card-foreground">
              <Check className="h-10 w-10 text-primary" />
              <p className="text-lg">{t.success}</p>
              <a
                href={`https://wa.me/${CONTACT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {t.whatsapp}
              </a>
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
                  className="h-13 rounded-2xl border-0 bg-white/95 px-4 text-base text-card-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-cta"
                  required
                />
                <Input
                  id="c-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phone}
                  aria-label={t.phone}
                  className="h-13 rounded-2xl border-0 bg-white/95 px-4 text-base text-card-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-cta"
                />
              </div>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email}
                aria-label={t.email}
                className="h-13 rounded-2xl border-0 bg-white/95 px-4 text-base text-card-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-cta"
                required
              />
              <Textarea
                id="c-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.message}
                aria-label={t.message}
                rows={4}
                maxLength={2000}
                className="rounded-2xl py-3 border-0 bg-white/95 px-4 text-base text-card-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-cta"
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
                className="h-13 w-full rounded-full bg-cta text-base font-medium text-cta-foreground shadow-lg shadow-black/15 transition-transform hover:-translate-y-0.5 hover:bg-cta/90 active:scale-[0.98]"
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
