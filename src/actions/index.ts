import { ActionError, defineAction } from "astro:actions";
import { Resend } from "resend";
import { z } from "zod";

/** RFC 5321-friendly email; min 3 covers minimal addresses like a@b. */
const emailSchema = z.string().trim().min(3).max(254).email();

/** Optional: empty or 5–100 chars (scannable inbox subject). */
const subjectSchema = z
  .string()
  .max(100)
  .refine(
    (s) => {
      const t = s.trim();
      return t.length === 0 || (t.length >= 5 && t.length <= 100);
    },
    { message: "Subject must be 5–100 characters or left empty." },
  );

const messageSchema = z.string().min(10).max(5000);

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
          message: "Email service is not configured.",
        });
      }

      const to = import.meta.env.CONTACT_TO_EMAIL;
      if (!to) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contact recipient is not configured.",
        });
      }

      const from = import.meta.env.CONTACT_FROM_EMAIL?.trim();
      if (!from) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contact sender address is not configured.",
        });
      }

      const subjectLine =
        subject.trim() || "Contact form — Rochat Solaire";

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
          message: teamSend.error.message,
        });
      }

      const confirmSend = await resend.emails.send({
        from,
        to: email,
        replyTo: to,
        subject: "We received your message — Rochat Solaire",
        text: [
          "Thank you for contacting Rochat Solaire.",
          "",
          "We have received your message and will get back to you soon.",
          "",
          "—",
          "This is an automated confirmation. For follow-up, you can reply to the message we send from our team inbox.",
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
