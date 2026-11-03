import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/** Envío de correo por SMTP. Sin SMTP_HOST (desarrollo) el mensaje se escribe en el log. */
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly transport?: nodemailer.Transporter;
  private readonly from: string;

  constructor(cfg: ConfigService) {
    this.from = cfg.get('MAIL_FROM', 'Vellum <no-reply@vellum.local>');
    const host = cfg.get<string>('SMTP_HOST');
    if (host) {
      this.transport = nodemailer.createTransport({
        host,
        port: +cfg.get('SMTP_PORT', 587),
        secure: cfg.get('SMTP_SECURE') === 'true',
        auth: cfg.get('SMTP_USER')
          ? { user: cfg.get('SMTP_USER'), pass: cfg.get('SMTP_PASS') }
          : undefined,
      });
    }
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.log.warn(`[SMTP no configurado] Para: ${to} | ${subject}\n${text}`);
      return;
    }
    try {
      await this.transport.sendMail({ from: this.from, to, subject, text });
    } catch (e) {
      this.log.error(
        `No se pudo enviar correo a ${to}: ${(e as Error).message}`,
      );
    }
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
