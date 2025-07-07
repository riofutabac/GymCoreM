import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SENDGRID_API_KEY') return 'SG.test-key';
              if (key === 'SENDGRID_FROM_EMAIL') return 'no-reply@test.com';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    (SendGrid.send as jest.Mock).mockClear();
  });

  it('should be defined and set API key on construction', () => {
    expect(service).toBeDefined();
    expect(SendGrid.setApiKey).toHaveBeenCalledWith('SG.test-key');
  });

  describe('sendMembershipActivated', () => {
    it('should call SendGrid.send with correct parameters', async () => {
      (SendGrid.send as jest.Mock).mockResolvedValue([{} as any, {}]);
      const to = 'member@test.com';
      const data = { name: 'Test Member', membershipId: 'mem_123' };

      await service.sendMembershipActivated(to, data);

      expect(SendGrid.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          from: 'no-reply@test.com',
          templateId: expect.any(String),
          dynamicTemplateData: expect.objectContaining(data),
        }),
      );
    });

    it('should throw an error if SendGrid sending fails', async () => {
      const error = new Error('SendGrid error');
      (SendGrid.send as jest.Mock).mockRejectedValue(error);
      await expect(
        service.sendMembershipActivated('member@test.com', {} as any),
      ).rejects.toThrow(error);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct template', async () => {
      (SendGrid.send as jest.Mock).mockResolvedValue([{} as any, {}]);
      const to = 'new@test.com';
      const data = { firstName: 'John', gymName: 'Test Gym' };

      await service.sendWelcomeEmail(to, data);

      expect(SendGrid.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          from: 'no-reply@test.com',
          templateId: expect.any(String),
          dynamicTemplateData: expect.objectContaining(data),
        }),
      );
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send payment confirmation with transaction details', async () => {
      (SendGrid.send as jest.Mock).mockResolvedValue([{} as any, {}]);
      const to = 'member@test.com';
      const data = {
        amount: 29.99,
        transactionId: 'txn_123',
        date: new Date().toISOString(),
      };

      await service.sendPaymentConfirmation(to, data);

      expect(SendGrid.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          from: 'no-reply@test.com',
          templateId: expect.any(String),
          dynamicTemplateData: expect.objectContaining(data),
        }),
      );
    });
  });
});
