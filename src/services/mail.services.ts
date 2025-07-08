import * as nodemailer from "nodemailer";
import { marked } from "marked";

const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

/**
 * Sends an email with Markdown content converted to HTML.
 *
 * @param {Object} options - Email options.
 * @param {string} options.to - Recipient email.
 * @param {string} options.subject - Email subject.
 * @param {string} options.markdown - Markdown string to send as HTML email.
 */
async function sendMarkdownEmail({
  to,
  subject,
  markdown,
}: {
  to: string;
  subject: string;
  markdown: string;
}) {
  const html = await marked(markdown);

  const transporter = nodemailer.createTransport({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_ADDRESS,
      pass: EMAIL_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: EMAIL_ADDRESS,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${info?.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export default sendMarkdownEmail;
