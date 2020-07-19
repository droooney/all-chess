import * as nodemailer from 'nodemailer';

import config from 'server/config';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: config.email.auth,
});
const {
  name: fromName,
  email: fromEmail,
} = config.email.from;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions) {
  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
