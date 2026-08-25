import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import nodemailer, { type Transporter } from 'nodemailer';

type SendEmailVerificationInput = {
  to: string;
  firstName: string;
  businessName: string;
  verificationUrl: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };

    return entities[character];
  });
}

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const user = configService.get<string>('SMTP_USER');

    const pass = configService.get<string>('SMTP_PASS');

    this.from = configService.getOrThrow<string>('SMTP_FROM');

    this.transporter = nodemailer.createTransport({
      host: configService.getOrThrow<string>('SMTP_HOST'),

      port: configService.getOrThrow<number>('SMTP_PORT'),

      secure: configService.getOrThrow<boolean>('SMTP_SECURE'),

      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,

      connectionTimeout: 10_000,

      greetingTimeout: 10_000,

      socketTimeout: 20_000,

      disableFileAccess: true,

      disableUrlAccess: true,
    });
  }

  async sendEmailVerification({
    to,
    firstName,
    businessName,
    verificationUrl,
  }: SendEmailVerificationInput): Promise<void> {
    const safeFirstName = escapeHtml(firstName);

    const safeBusinessName = escapeHtml(businessName);

    const safeVerificationUrl = escapeHtml(verificationUrl);

    await this.transporter.sendMail({
      from: this.from,

      to,

      subject: `${businessName}: confirma tu correo`,

      text: [
        `Hola ${firstName},`,
        '',
        `Confirma tu correo para activar tu cuenta de cliente en ${businessName}:`,
        verificationUrl,
        '',
        'El enlace vence en 24 horas y solo puede utilizarse una vez.',
        'Si no creaste esta cuenta, puedes ignorar este mensaje.',
      ].join('\n'),

      html: `
        <!doctype html>
        <html lang="es">
          <body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
            <div style="padding:32px 16px">
              <div style="max-width:560px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #e4e4e7">
                <div style="padding:24px 28px;background:#09090b;color:#ffffff">
                  <strong style="font-size:18px">${safeBusinessName}</strong>
                  <div style="margin-top:4px;font-size:12px;color:#a1a1aa">AgendaBarber</div>
                </div>
                <div style="padding:32px 28px">
                  <h1 style="margin:0;font-size:26px;line-height:1.2">Confirma tu correo</h1>
                  <p style="margin:18px 0 0;line-height:1.7;color:#52525b">Hola ${safeFirstName}, activa tu cuenta para reservar y administrar tus próximas horas.</p>
                  <a href="${safeVerificationUrl}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:12px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700">Confirmar mi correo</a>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a">Este enlace vence en 24 horas y solo funciona una vez. Si no creaste esta cuenta, ignora este mensaje.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }
}
