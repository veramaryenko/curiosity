import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface ReminderEmailParams {
  to: string;
  challengeTitle: string;
  dayNumber: number;
  totalDays: number;
  taskDescription: string;
}

export async function sendDailyReminder({
  to,
  challengeTitle,
  dayNumber,
  totalDays,
  taskDescription,
}: ReminderEmailParams) {
  return getResend().emails.send({
    from: "Curiosity <noreply@curiosity.app>",
    to,
    subject: `Dzień ${dayNumber}/${totalDays}: ${challengeTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #b45309; margin-bottom: 4px;">Curiosity</h2>
        <p style="color: #78716c; font-size: 14px; margin-top: 0;">Dzień ${dayNumber} z ${totalDays}</p>

        <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="font-weight: 600; margin: 0 0 8px 0;">${challengeTitle}</p>
          <p style="margin: 0; line-height: 1.6;">${taskDescription}</p>
        </div>

        <p style="color: #78716c; font-size: 14px; line-height: 1.6;">
          Nie musisz być idealny/a. Wystarczy, że spróbujesz.
        </p>

        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
        <p style="color: #a8a29e; font-size: 12px;">
          Curiosity — Twoja przestrzeń na odkrywanie siebie
        </p>
      </div>
    `,
  });
}
