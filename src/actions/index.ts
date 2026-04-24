import { ActionError, defineAction } from "astro:actions";
import { Resend } from "resend";
import { z } from "zod";

/** RFC 5321-friendly email; min 3 covers minimal addresses like a@b. */
const emailSchema = z
  .string()
  .trim()
  .min(3, "L'adresse e-mail est trop courte.")
  .max(254, "L'adresse e-mail est trop longue.")
  .email("Adresse e-mail invalide.");

/** Optional: empty or 5–100 chars (scannable inbox subject). */
const subjectSchema = z
  .string()
  .max(100, "L'objet est trop long (100 caractères maximum).")
  .refine(
    (s) => {
      const t = s.trim();
      return t.length === 0 || (t.length >= 5 && t.length <= 100);
    },
    {
      message:
        "L'objet doit comporter entre 5 et 100 caractères, ou rester vide.",
    },
  );

const messageSchema = z
  .string()
  .min(10, "Le message doit contenir au moins 10 caractères.")
  .max(5000, "Le message ne peut pas dépasser 5000 caractères.");

const contactInput = z.object({
  subject: subjectSchema,
  email: emailSchema,
  message: messageSchema,
});

export const server = {
  sendContactEmail: defineAction({
    input: contactInput,
    handler: async ({ subject, email, message }) => {
      const apiKey = import.meta.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Le service d'envoi d'e-mails n'est pas configuré.",
        });
      }

      const to = import.meta.env.CONTACT_TO_EMAIL;
      if (!to) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Le destinataire du formulaire n'est pas configuré.",
        });
      }

      const from = import.meta.env.CONTACT_FROM_EMAIL?.trim();
      if (!from) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "L'adresse d'expéditeur n'est pas configurée.",
        });
      }

      const subjectLine =
        subject.trim() || "Formulaire de contact — Rochat Solaire";

      const resend = new Resend(apiKey);
      const teamSend = await resend.emails.send({
        from,
        to,
        replyTo: email,
        subject: subjectLine,
        text: `From: ${email}\n\n${message}`,
      });

      if (teamSend.error) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Échec de l'envoi : ${teamSend.error.message}`,
        });
      }

      const confirmSend = await resend.emails.send({
        from,
        to: email,
        replyTo: to,
        subject: "Nous avons bien reçu votre message — Rochat Solaire",
        text: [
          "Merci d'avoir contacté Rochat Solaire.",
          "",
          "Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.",
          "",
          "—",
          "Ce message est une confirmation automatique. Pour toute relance, vous pourrez répondre au courrier envoyé depuis notre boîte équipe.",
        ].join("\n"),
      });

      if (confirmSend.error) {
        console.error(
          "[sendContactEmail] Team email sent but confirmation to sender failed:",
          confirmSend.error.message,
        );
      }

      return { sent: true as const };
    },
  }),
};
