type EmailInput = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Minimal email abstraction so notification flows (password reset, expiry
 * reminders, payment confirmations) have a single integration point.
 *
 * No SMTP client is wired up by default. Configure SMTP_HOST / SMTP_PORT /
 * SMTP_USER / SMTP_PASSWORD / SMTP_FROM (see .env.example) and implement the
 * actual transport here (e.g. with nodemailer) when real delivery is needed.
 * Until then this just logs, so nothing in the app depends on a live mail
 * server to function.
 */
export async function sendEmail(input: EmailInput): Promise<void> {
  if (process.env.SMTP_HOST) {
    console.warn(
      "[email] SMTP_HOST is configured but no SMTP transport is implemented yet — logging instead.",
    );
  }
  console.log(`[email] To: ${input.to}\nSubject: ${input.subject}\n\n${input.body}`);
}
