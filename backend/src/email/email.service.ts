import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import nodemailer, { type Transporter } from 'nodemailer';

type SendEmailVerificationInput = {
  to: string;
  firstName: string;
  businessName: string;
  verificationUrl: string;
};

type SendPasswordResetInput = {
  to: string;
  firstName: string;
  businessName: string;
  resetUrl: string;
};

type SendBusinessAdminInvitationInput = {
  to: string;
  firstName: string;
  businessName: string;
  invitationUrl: string;
};

type SendGuestBookingConfirmationInput = {
  to: string;
  firstName: string;
  businessName: string;
  appointmentDate: string;
  barberName: string;
  managementUrl: string;
};

type SendBookingUpdateInput = {
  to: string;
  firstName: string;
  businessName: string;
  appointmentDate: string;
  barberName: string;
  action: 'rescheduled' | 'cancelled' | 'no_show';
  managementUrl?: string;
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

  async sendPasswordReset({
    to,
    firstName,
    businessName,
    resetUrl,
  }: SendPasswordResetInput): Promise<void> {
    const safeFirstName = escapeHtml(firstName);

    const safeBusinessName = escapeHtml(businessName);

    const safeResetUrl = escapeHtml(resetUrl);

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `${businessName}: restablece tu contraseña`,
      text: [
        `Hola ${firstName},`,
        '',
        `Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${businessName}:`,
        resetUrl,
        '',
        'El enlace vence en 30 minutos y solo puede utilizarse una vez.',
        'Si no solicitaste este cambio, ignora este mensaje. Tu contraseña seguirá siendo la misma.',
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
                  <h1 style="margin:0;font-size:26px;line-height:1.2">Restablece tu contraseña</h1>
                  <p style="margin:18px 0 0;line-height:1.7;color:#52525b">Hola ${safeFirstName}, utiliza el siguiente botón para crear una nueva contraseña segura.</p>
                  <a href="${safeResetUrl}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:12px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700">Crear nueva contraseña</a>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a">El enlace vence en 30 minutos y solo funciona una vez. Si no solicitaste este cambio, ignora este mensaje; tu contraseña no será modificada.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }

  async sendBusinessAdminInvitation({
    to,
    firstName,
    businessName,
    invitationUrl,
  }: SendBusinessAdminInvitationInput): Promise<void> {
    const safeFirstName = escapeHtml(firstName);
    const safeBusinessName = escapeHtml(businessName);
    const safeInvitationUrl = escapeHtml(invitationUrl);

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `${businessName}: activa tu cuenta de administrador`,
      text: [
        `Hola ${firstName},`,
        '',
        `Fuiste invitado a administrar ${businessName} en AgendaBarber.`,
        'Crea tu contraseña desde este enlace privado:',
        invitationUrl,
        '',
        'El enlace vence en 72 horas y solo puede utilizarse una vez.',
        'Si no esperabas esta invitación, puedes ignorar este mensaje.',
      ].join('\n'),
      html: `
        <!doctype html>
        <html lang="es">
          <body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
            <div style="padding:32px 16px">
              <div style="max-width:560px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #e4e4e7">
                <div style="padding:24px 28px;background:#09090b;color:#ffffff">
                  <strong style="font-size:18px">${safeBusinessName}</strong>
                  <div style="margin-top:4px;font-size:12px;color:#a1a1aa">Invitación de AgendaBarber</div>
                </div>
                <div style="padding:32px 28px">
                  <h1 style="margin:0;font-size:26px;line-height:1.2">Activa tu cuenta de administrador</h1>
                  <p style="margin:18px 0 0;line-height:1.7;color:#52525b">Hola ${safeFirstName}, crea tu contraseña para comenzar a administrar la barbería.</p>
                  <a href="${safeInvitationUrl}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:12px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700">Aceptar invitación</a>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a">El enlace vence en 72 horas y funciona una sola vez. Si no esperabas esta invitación, ignora este correo.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }

  async sendGuestBookingConfirmation({
    to,
    firstName,
    businessName,
    appointmentDate,
    barberName,
    managementUrl,
  }: SendGuestBookingConfirmationInput): Promise<void> {
    const safeFirstName = escapeHtml(firstName);
    const safeBusinessName = escapeHtml(businessName);
    const safeAppointmentDate = escapeHtml(appointmentDate);
    const safeBarberName = escapeHtml(barberName);
    const safeManagementUrl = escapeHtml(managementUrl);

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `${businessName}: tu reserva está confirmada`,
      text: [
        `Hola ${firstName},`,
        '',
        `Tu reserva en ${businessName} quedó registrada para ${appointmentDate} con ${barberName}.`,
        '',
        'Puedes revisar, reprogramar o cancelar tu reserva desde este enlace privado:',
        managementUrl,
        '',
        'No compartas este enlace: permite administrar tu reserva sin iniciar sesión.',
      ].join('\n'),
      html: `
        <!doctype html>
        <html lang="es">
          <body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
            <div style="padding:32px 16px">
              <div style="max-width:560px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #e4e4e7">
                <div style="padding:24px 28px;background:#09090b;color:#ffffff">
                  <strong style="font-size:18px">${safeBusinessName}</strong>
                  <div style="margin-top:4px;font-size:12px;color:#a1a1aa">Reserva confirmada</div>
                </div>
                <div style="padding:32px 28px">
                  <h1 style="margin:0;font-size:26px;line-height:1.2">Tu hora está reservada</h1>
                  <p style="margin:18px 0 0;line-height:1.7;color:#52525b">Hola ${safeFirstName}, te esperamos el <strong>${safeAppointmentDate}</strong> con <strong>${safeBarberName}</strong>.</p>
                  <a href="${safeManagementUrl}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:12px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700">Gestionar mi reserva</a>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a">Este es un enlace privado que permite reprogramar o cancelar sin iniciar sesión. No lo compartas.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }

  async sendBookingUpdate({
    to,
    firstName,
    businessName,
    appointmentDate,
    barberName,
    action,
    managementUrl,
  }: SendBookingUpdateInput): Promise<void> {
    const rescheduled = action === 'rescheduled';
    const cancelled = action === 'cancelled';
    const subjectAction = rescheduled
      ? 'reserva reprogramada'
      : cancelled
        ? 'reserva cancelada'
        : 'inasistencia registrada';
    const title = rescheduled
      ? 'Reserva reprogramada'
      : cancelled
        ? 'Reserva cancelada'
        : 'No registramos tu llegada';
    const safeFirstName = escapeHtml(firstName);
    const safeBusinessName = escapeHtml(businessName);
    const safeAppointmentDate = escapeHtml(appointmentDate);
    const safeBarberName = escapeHtml(barberName);
    const safeManagementUrl = managementUrl
      ? escapeHtml(managementUrl)
      : undefined;

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `${businessName}: ${subjectAction}`,
      text: [
        `Hola ${firstName},`,
        '',
        rescheduled
          ? `Tu reserva en ${businessName} fue reprogramada.`
          : cancelled
            ? `Tu reserva en ${businessName} fue cancelada.`
            : `Tu reserva en ${businessName} fue marcada como inasistencia.`,
        rescheduled
          ? `Nueva fecha: ${appointmentDate}, con ${barberName}.`
          : cancelled
            ? `La hora del ${appointmentDate}, con ${barberName}, quedó liberada.`
            : `No registramos tu llegada a la hora del ${appointmentDate}, con ${barberName}. Si crees que se trata de un error, contacta directamente a la barbería.`,
        ...(managementUrl
          ? ['', 'Puedes revisar tu reserva aquí:', managementUrl]
          : []),
      ].join('\n'),
      html: `
        <!doctype html>
        <html lang="es">
          <body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
            <div style="padding:32px 16px">
              <div style="max-width:560px;margin:0 auto;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #e4e4e7">
                <div style="padding:24px 28px;background:#09090b;color:#ffffff"><strong style="font-size:18px">${safeBusinessName}</strong></div>
                <div style="padding:32px 28px">
                  <h1 style="margin:0;font-size:26px;line-height:1.2">${title}</h1>
                  <p style="margin:18px 0 0;line-height:1.7;color:#52525b">Hola ${safeFirstName}, ${
                    rescheduled
                      ? `tu nueva hora es el <strong>${safeAppointmentDate}</strong> con <strong>${safeBarberName}</strong>.`
                      : cancelled
                        ? `la hora del <strong>${safeAppointmentDate}</strong> con <strong>${safeBarberName}</strong> fue cancelada.`
                        : `no registramos tu llegada a la hora del <strong>${safeAppointmentDate}</strong> con <strong>${safeBarberName}</strong>. Si crees que se trata de un error, contacta directamente a la barbería.`
                  }</p>
                  ${
                    safeManagementUrl
                      ? `<a href="${safeManagementUrl}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:12px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700">Ver mi reserva</a>`
                      : ''
                  }
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  }
}
