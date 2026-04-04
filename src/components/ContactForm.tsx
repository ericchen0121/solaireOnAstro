import { actions, isInputError } from "astro:actions";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  initLetterReveal,
  letterRevealDurationMs,
} from "../animations/letterReveal";

const TITLE_REVEAL = "Let's Talk";
const DEFAULT_SUBJECT = "RochatSolaire inquiry";
const EMAIL_PLACEHOLDER = "your.email@example.com";
const MESSAGE_PLACEHOLDER = "Your message (at least 10 characters)";

/** 0–3 = reveal that step; 4 = all fields interactive */
type RevealStep = 0 | 1 | 2 | 3 | 4;

const REVEAL_SELECTORS = [
  "#contact-reveal-title",
  "#contact-reveal-subject",
  "#contact-reveal-email",
  "#contact-reveal-message",
] as const;

const REVEAL_LENGTHS = [
  TITLE_REVEAL.length,
  DEFAULT_SUBJECT.length,
  EMAIL_PLACEHOLDER.length,
  MESSAGE_PLACEHOLDER.length,
];

const FIELD_LINE_MIN =
  "min-h-[3.25rem] md:min-h-[3.5rem] flex items-end pb-2";
const INPUT_CLASS =
  "contact-type-field w-full border-0 border-b-0 bg-transparent px-0 py-0 font-f37moon-light text-xl leading-tight tracking-[0.02em] text-white caret-hero-match placeholder:text-white/35 focus:outline-none focus:ring-0 disabled:opacity-50 md:text-2xl md:leading-tight";
const MESSAGE_BLOCK_MIN = "min-h-[6.5rem] md:min-h-[7rem]";
const TEXTAREA_CLASS =
  `contact-type-field ${MESSAGE_BLOCK_MIN} w-full resize-y border-0 border-b-0 bg-transparent px-0 py-0 font-f37moon-light text-xl leading-snug tracking-[0.02em] text-white caret-hero-match placeholder:text-white/35 focus:outline-none focus:ring-0 disabled:opacity-50 md:text-2xl md:leading-snug`;

function ContactFieldSection({
  step,
  activeStep,
  label,
  children,
}: {
  step: RevealStep;
  activeStep: 1 | 2 | 3;
  label: ReactNode;
  children: ReactNode;
}) {
  const visible = step >= activeStep;

  return (
    <div
      className={`transition-opacity duration-500 ease-out motion-reduce:duration-150 motion-reduce:transition-none ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`mb-1 block font-f37moon-light text-xs uppercase tracking-[0.2em] text-white/50 transition-all duration-500 ease-out motion-reduce:duration-150 motion-reduce:transition-none ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-1 opacity-0 motion-reduce:translate-y-0"
        }`}
      >
        {label}
      </div>
      <div className="relative">
        <div className={FIELD_LINE_MIN}>{children}</div>
        <div
          aria-hidden
          className={`pointer-events-none mt-0 h-px origin-left bg-white/30 transition-transform duration-500 ease-out motion-reduce:duration-150 motion-reduce:transition-none ${
            visible ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </div>
    </div>
  );
}

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    email?: string;
    message?: string;
  }>({});
  const [step, setStep] = useState<RevealStep>(0);

  useLayoutEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setStep(4);
    }
  }, []);

  useEffect(() => {
    if (step > 3) return;

    const revealIndex = step as 0 | 1 | 2 | 3;
    const selector = REVEAL_SELECTORS[revealIndex];
    const n = REVEAL_LENGTHS[revealIndex];
    const ms = letterRevealDurationMs(n);

    let cleanup: (() => void) | null = null;
    let raf2 = 0;
    let timeoutId = 0;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        cleanup = initLetterReveal(selector, 0.45, 0.05);
        timeoutId = window.setTimeout(() => {
          cleanup?.();
          cleanup = null;
          setStep((s) => (s < 4 ? ((s + 1) as RevealStep) : s));
        }, ms);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timeoutId);
      cleanup?.();
    };
  }, [step]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    setLoading(true);
    setSuccess(false);
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(form);
    const subject = String(formData.get("subject") ?? "");
    const email = String(formData.get("email") ?? "");
    const message = String(formData.get("message") ?? "");

    const { error } = await actions.sendContactEmail({
      subject,
      email,
      message,
    });

    setLoading(false);

    if (error) {
      if (isInputError(error)) {
        setFieldErrors({
          subject: error.fields.subject?.join(" "),
          email: error.fields.email?.join(" "),
          message: error.fields.message?.join(" "),
        });
      } else {
        setErrorMessage(error.message ?? "Something went wrong. Try again.");
      }
      return;
    }

    setSuccess(true);
    form.reset();
    const subjectInput = form.querySelector<HTMLInputElement>(
      "#contact-subject",
    );
    if (subjectInput) subjectInput.value = DEFAULT_SUBJECT;
  }

  const blockSubmit = step < 4;

  return (
    <form
      className="contact-form-type space-y-10 md:space-y-12"
      onSubmit={onSubmit}
    >
      {success && (
        <p
          className="font-f37moon-light text-base tracking-[0.02em] text-white/90"
          role="status"
        >
          Message sent. We will get back to you soon.
        </p>
      )}

      {errorMessage && (
        <p
          className="font-f37moon-light text-base tracking-[0.02em] text-red-200"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {/* 1. Title — same vertical slot as final */}
      <div>
        {step === 0 ? (
          <h1
            id="contact-reveal-title"
            className="contact-type-title font-f37moon-light text-left"
          >
            <span className="hero-cursor" aria-hidden="true" />
            <span className="hero-headline">{TITLE_REVEAL}</span>
          </h1>
        ) : (
          <h1 className="contact-type-title font-f37moon-light text-left">
            {TITLE_REVEAL}
          </h1>
        )}
      </div>

      {/* 2. Subject — reserved from first paint */}
      <div>
        <ContactFieldSection
          step={step}
          activeStep={1}
          label={
            step > 1 ? (
              <label htmlFor="contact-subject" className="contents">
                Subject{" "}
                <span className="font-normal normal-case tracking-normal text-white/35">
                  (optional)
                </span>
              </label>
            ) : (
              <>
                Subject{" "}
                <span className="font-normal normal-case tracking-normal text-white/35">
                  (optional)
                </span>
              </>
            )
          }
        >
          {step < 1 ? (
            <div className="w-full" aria-hidden />
          ) : step === 1 ? (
            <div
              id="contact-reveal-subject"
              className="contact-subject-reveal font-f37moon-light relative w-full text-left text-xl leading-snug tracking-[0.02em] text-white md:text-2xl"
            >
              <span className="hero-cursor" aria-hidden="true" />
              <span className="hero-headline">{DEFAULT_SUBJECT}</span>
            </div>
          ) : (
            <input
              id="contact-subject"
              name="subject"
              type="text"
              defaultValue={DEFAULT_SUBJECT}
              autoComplete="off"
              maxLength={100}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.subject)}
              aria-describedby={
                fieldErrors.subject ? "contact-subject-error" : undefined
              }
              className={INPUT_CLASS}
              placeholder="Subject line"
            />
          )}
        </ContactFieldSection>
        {fieldErrors.subject && (
          <p
            id="contact-subject-error"
            className="mt-2 font-f37moon-light text-sm tracking-[0.02em] text-red-300/90"
          >
            {fieldErrors.subject}
          </p>
        )}
      </div>

      {/* 3. Email */}
      <div>
        <ContactFieldSection
          step={step}
          activeStep={2}
          label={
            step > 2 ? (
              <label htmlFor="contact-email" className="contents">
                Email
              </label>
            ) : (
              "Email"
            )
          }
        >
        {step < 2 ? (
          <div className="w-full" aria-hidden />
        ) : step === 2 ? (
          <div
            id="contact-reveal-email"
            className="contact-email-reveal font-f37moon-light relative w-full text-left text-xl leading-tight tracking-[0.02em] text-white md:text-2xl md:leading-tight"
          >
            <span className="hero-cursor" aria-hidden="true" />
            <span className="hero-headline">{EMAIL_PLACEHOLDER}</span>
          </div>
        ) : (
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "contact-email-error" : undefined
            }
            className={INPUT_CLASS}
            placeholder={EMAIL_PLACEHOLDER}
          />
        )}
        </ContactFieldSection>
        {fieldErrors.email && (
          <p
            id="contact-email-error"
            className="mt-2 font-f37moon-light text-sm tracking-[0.02em] text-red-300/90"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* 4. Message */}
      <div>
        <ContactFieldSection
          step={step}
          activeStep={3}
          label={
            step > 3 ? (
              <label htmlFor="contact-message" className="contents">
                Message
              </label>
            ) : (
              "Message"
            )
          }
        >
        {step < 3 ? (
          <div className={`${MESSAGE_BLOCK_MIN} w-full`} aria-hidden />
        ) : step === 3 ? (
          <div
            id="contact-reveal-message"
            className={`contact-message-reveal font-f37moon-light relative ${MESSAGE_BLOCK_MIN} w-full text-left text-xl leading-snug tracking-[0.02em] text-white md:text-2xl md:leading-snug`}
          >
            <span className="hero-cursor" aria-hidden="true" />
            <span className="hero-headline">{MESSAGE_PLACEHOLDER}</span>
          </div>
        ) : (
          <textarea
            id="contact-message"
            name="message"
            rows={3}
            autoComplete="on"
            required
            minLength={10}
            maxLength={5000}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={
              fieldErrors.message ? "contact-message-error" : undefined
            }
            className={TEXTAREA_CLASS}
            placeholder={MESSAGE_PLACEHOLDER}
          />
        )}
        </ContactFieldSection>
        {fieldErrors.message && (
          <p
            id="contact-message-error"
            className="mt-2 font-f37moon-light text-sm tracking-[0.02em] text-red-300/90"
          >
            {fieldErrors.message}
          </p>
        )}
      </div>

      <div className="flex w-full justify-center pt-2">
        <button
          type="submit"
          disabled={loading || blockSubmit}
          aria-busy={loading}
          className="font-f37moon-light flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-white bg-white text-sm tracking-[0.06em] text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:h-20 md:w-20 md:text-base"
        >
          {loading ? "…" : "send"}
        </button>
      </div>
    </form>
  );
}
