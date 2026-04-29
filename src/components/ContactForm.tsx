import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  initLetterReveal,
  letterRevealDurationMs,
} from "../animations/letterReveal";

const TITLE_REVEAL = "Parlons-en";
const DEFAULT_SUBJECT = "Demande Rochat Solaire";
const EMAIL_PLACEHOLDER = "votre.email@exemple.com";
const MESSAGE_PLACEHOLDER = "Votre message (10 caractères minimum)";

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
  "contact-type-field w-full border-0 border-b-0 bg-transparent px-0 py-0 font-f37moon-light text-xl leading-tight tracking-[var(--tracking-neutral)] text-white caret-hero-match placeholder:text-white/50 focus:outline-none focus:ring-0 disabled:opacity-50 md:text-2xl md:leading-tight";
const MESSAGE_BLOCK_MIN = "min-h-[6.5rem] md:min-h-[7rem]";
const TEXTAREA_CLASS =
  `contact-type-field ${MESSAGE_BLOCK_MIN} w-full resize-y border-0 border-b-0 bg-transparent px-0 py-0 font-f37moon-light text-xl leading-snug tracking-[var(--tracking-neutral)] text-white caret-hero-match placeholder:text-white/50 focus:outline-none focus:ring-0 disabled:opacity-50 md:text-2xl md:leading-snug`;

type FormFeedback = "form" | "success" | "error";

function ContactSuccessIcon() {
  return (
    <svg
      aria-hidden
      className="h-16 w-16 shrink-0 md:h-20 md:w-20"
      viewBox="0 0 355 355"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M177.5 355C79.4694 355 -4.28505e-06 275.531 0 177.5C4.28505e-06 79.4694 79.4695 -4.28505e-06 177.5 0C275.531 4.28505e-06 355 79.4695 355 177.5C355 275.531 275.531 355 177.5 355Z"
        fill="white"
      />
      <path
        d="M111.542 167.735C153.549 181.395 198.553 181.473 243.497 167.662L257.836 163.256L266.647 191.933L252.31 196.338C201.794 211.86 150.463 211.938 102.265 196.265L88 191.626L97.2773 163.097L111.542 167.735Z"
        fill="black"
      />
    </svg>
  );
}

function ContactErrorIcon() {
  return (
    <svg
      aria-hidden
      className="h-16 w-16 shrink-0 md:h-20 md:w-20"
      viewBox="0 0 355 355"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M73.2017 281.798C130.804 339.401 224.196 339.401 281.798 281.798C339.401 224.196 339.401 130.804 281.798 73.2018C224.196 15.5994 130.804 15.5994 73.2018 73.2017L51.9886 51.9885C121.307 -17.3295 233.693 -17.3295 303.011 51.9886C372.329 121.307 372.329 233.693 303.011 303.011C233.693 372.329 121.307 372.329 51.9885 303.011C-17.3295 233.693 -17.3295 121.307 51.9886 51.9885L73.2018 73.2017C15.5994 130.804 15.5994 224.196 73.2017 281.798Z"
        fill="white"
      />
      <path
        d="M62.9487 312.557L41.7355 291.344L291.344 41.7355L312.557 62.9487L62.9487 312.557Z"
        fill="white"
      />
      <path
        d="M312.557 292.051L291.344 313.264L41.7355 63.6558L62.9487 42.4426L312.557 292.051Z"
        fill="white"
      />
    </svg>
  );
}

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
        className={`mb-1 block font-f37moon-light text-xs uppercase tracking-[var(--tracking-neutral)] text-white/[0.82] transition-all duration-500 ease-out motion-reduce:duration-150 motion-reduce:transition-none ${
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
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback>("form");
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
        cleanup = initLetterReveal(selector, 0.45, 0.05, {
          skipSpanVisibilityFilter: true,
        });
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
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(form);
    const subject = String(formData.get("subject") ?? "");
    const email = String(formData.get("email") ?? "");
    const message = String(formData.get("message") ?? "");

    const { actions, isInputError } = await import("astro:actions");
    const { error } = await actions.sendContactEmail({
      subject,
      email,
      message,
    });

    setLoading(false);

    if (error) {
      if (isInputError(error)) {
        const fe = {
          subject: error.fields.subject?.join(" "),
          email: error.fields.email?.join(" "),
          message: error.fields.message?.join(" "),
        };
        setFieldErrors(fe);
        const parts = [fe.subject, fe.email, fe.message].filter(Boolean);
        setErrorMessage(
          parts.join(" ") || "Vérifiez les champs et réessayez.",
        );
      } else {
        setErrorMessage(
          error.message ?? "Une erreur s'est produite. Veuillez réessayer.",
        );
      }
      setFeedback("error");
      return;
    }

    setFeedback("success");
    form.reset();
    const subjectInput = form.querySelector<HTMLInputElement>(
      "#contact-subject",
    );
    if (subjectInput) subjectInput.value = DEFAULT_SUBJECT;
  }

  function resetToForm() {
    setFeedback("form");
    setErrorMessage(null);
    setFieldErrors({});
    const form = formRef.current;
    if (form) {
      form.reset();
      const subjectInput = form.querySelector<HTMLInputElement>(
        "#contact-subject",
      );
      if (subjectInput) subjectInput.value = DEFAULT_SUBJECT;
    }
  }

  const blockSubmit = step < 4;

  return (
    <div className="contact-form-feedback-root w-full">
      {feedback === "form" && (
        <form
          ref={formRef}
          className="contact-form-type space-y-10 md:space-y-12"
          onSubmit={onSubmit}
        >
      {/* 1. Title — same vertical slot as final */}
      <div>
        {step === 0 ? (
          <h1
            id="contact-reveal-title"
            className="contact-type-title tracking-[var(--tracking-neutral)] font-f37moon-light text-left"
          >
            <span className="hero-cursor" aria-hidden="true" />
            <span className="hero-headline">{TITLE_REVEAL}</span>
          </h1>
        ) : (
          <h1 className="contact-type-title tracking-[var(--tracking-neutral)] font-f37moon-light text-left">
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
                Sujet{" "}
                <span className="font-normal normal-case tracking-[var(--tracking-neutral)] text-white/[0.62]">
                  (facultatif)
                </span>
              </label>
            ) : (
              <>
                Sujet{" "}
                <span className="font-normal normal-case tracking-[var(--tracking-neutral)] text-white/[0.62]">
                  (facultatif)
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
              className="contact-subject-reveal font-f37moon-light relative w-full text-left text-xl leading-snug tracking-[var(--tracking-neutral)] text-white md:text-2xl"
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
              placeholder="Objet"
            />
          )}
        </ContactFieldSection>
        {fieldErrors.subject && (
          <p
            id="contact-subject-error"
            className="mt-2 font-f37moon-light text-sm tracking-[var(--tracking-neutral)] text-red-300/90"
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
                E-mail
              </label>
            ) : (
              "E-mail"
            )
          }
        >
        {step < 2 ? (
          <div className="w-full" aria-hidden />
        ) : step === 2 ? (
          <div
            id="contact-reveal-email"
            className="contact-email-reveal font-f37moon-light relative w-full text-left text-xl leading-tight tracking-[var(--tracking-neutral)] text-white md:text-2xl md:leading-tight"
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
            className="mt-2 font-f37moon-light text-sm tracking-[var(--tracking-neutral)] text-red-300/90"
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
            className={`contact-message-reveal font-f37moon-light relative ${MESSAGE_BLOCK_MIN} w-full text-left text-xl leading-snug tracking-[var(--tracking-neutral)] text-white md:text-2xl md:leading-snug`}
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
            className="mt-2 font-f37moon-light text-sm tracking-[var(--tracking-neutral)] text-red-300/90"
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
          className="font-f37moon-light flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white bg-white text-sm tracking-[var(--tracking-neutral)] text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:h-24 md:w-24 md:text-base"
        >
          {loading ? "…" : "Envoyer"}
        </button>
      </div>
        </form>
      )}

      {feedback === "success" && (
        <div
          className="flex w-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-10 text-center text-white motion-safe:animate-[contact-feedback-in_0.65s_ease-out_both] md:mx-auto md:px-10 md:py-14"
          role="status"
          aria-live="polite"
        >
          <p className="font-f37moon-light text-lg leading-snug tracking-[var(--tracking-neutral)] md:text-xl">
            Merci de nous avoir contactés.
          </p>
          <p className="font-f37moon-light text-lg leading-snug tracking-[var(--tracking-neutral)] md:text-xl">
            Votre message a bien été envoyé !
          </p>
          <ContactSuccessIcon />
          <button
            type="button"
            onClick={resetToForm}
            className="font-f37moon-light mt-2 text-sm tracking-[var(--tracking-neutral)] text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Envoyer un autre message
          </button>
        </div>
      )}

      {feedback === "error" && errorMessage && (
        <div
          className="flex w-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-10 text-center text-white motion-safe:animate-[contact-feedback-in_0.65s_ease-out_both] md:mx-auto md:px-10 md:py-14"
          role="alert"
          aria-live="assertive"
        >
          <p className="max-w-md font-f37moon-light text-base leading-relaxed tracking-[var(--tracking-neutral)] text-white/95 md:text-lg">
            Erreur : {errorMessage}
          </p>
          <ContactErrorIcon />
          <button
            type="button"
            onClick={resetToForm}
            className="font-f37moon-light mt-2 text-sm tracking-[var(--tracking-neutral)] text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
