import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import type { Db } from 'mongodb';
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV, type Env } from '../../config/env.js';
import { MONGO_DB } from '../database/tokens.js';
import { MAIL, type MailMessage, type MailPort } from './mail.port.js';

/** Versand über SMTP (z. B. IONOS: smtp.ionos.de:587). */
export class SmtpMailAdapter implements MailPort {
  private readonly transport: Transporter;

  constructor(private readonly env: Env) {
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }

  async send(m: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.env.MAIL_FROM, ...m });
  }
}

/** Entwicklung: Mails nicht versenden, sondern in MongoDB "mail_outbox" ablegen. */
@Injectable()
export class OutboxMailAdapter implements MailPort {
  private readonly logger = new Logger('Mail');
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  async send(m: MailMessage): Promise<void> {
    this.logger.log(`(nicht versendet) an ${m.to}: ${m.subject}`);
    await this.db
      .collection('mail_outbox')
      .insertOne({ ...m, createdAt: new Date() })
      .catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [
    OutboxMailAdapter,
    {
      provide: MAIL,
      inject: [ENV, OutboxMailAdapter],
      useFactory: (env: Env, outbox: OutboxMailAdapter): MailPort =>
        env.SMTP_HOST ? new SmtpMailAdapter(env) : outbox,
    },
  ],
  exports: [MAIL],
})
export class MailModule {}
