// backend/apps/notification-service/src/email.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService, MembershipActivatedData, PaymentFailedData } from './email.service';
import { Resend } from 'resend';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
      },
    })),
  };
});

describe('EmailService (Resend)', () => {
  let service: EmailService;
  let config: ConfigService;
  let mockedSend: jest.Mock;

  beforeEach(async () => {
    const resendInstance = new Resend('fake-key');
    mockedSend = resendInstance.emails.send as jest.Mock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'RESEND_API_KEY') return 're_test_key';
              if (key === 'RESEND_FROM_EMAIL') return 'no-reply@test.com';
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('debería inicializar Resend con API Key y from', () => {
    expect(Resend).toHaveBeenCalledWith('re_test_key');
  });

  it('sendTestEmail: llama a resend.emails.send con parámetros correctos', async () => {
    await service.sendTestEmail('user@test.com');
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        from: 'no-reply@test.com',
        subject: expect.any(String),
        html: expect.stringContaining('Servicio de Notificaciones Activo'),
      }),
    );
  });

  it('sendMembershipActivated: llama a resend.emails.send con datos de membresía', async () => {
    const data: MembershipActivatedData = {
      name: 'Juan',
      membershipId: 'mem_001',
    };
    await service.sendMembershipActivated('juan@test.com', data);
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'juan@test.com',
        html: expect.stringContaining('mem_001'),
      }),
    );
  });

  it('sendPaymentFailed: llama a resend.emails.send con datos de pago fallido', async () => {
    const data: PaymentFailedData = {
      name: 'María',
      membershipId: 'mem_002',
      amount: '$29.99',
      failureReason: 'Fondos insuficientes',
    };
    await service.sendPaymentFailed('maria@test.com', data);
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'maria@test.com',
        html: expect.stringContaining('Fondos insuficientes'),
      }),
    );
  });
});
