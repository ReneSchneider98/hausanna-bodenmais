export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/** Port: E-Mail-Versand (SMTP in Produktion, Protokoll in der Entwicklung). */
export interface MailPort {
  send(message: MailMessage): Promise<void>;
}

export const MAIL = Symbol('MAIL');
