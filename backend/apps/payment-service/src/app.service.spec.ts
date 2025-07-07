import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PaypalService } from './paypal/paypal.service';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { of } from 'rxjs';

// Mocking the PayPal SDK
jest.mock('@paypal/checkout-server-sdk', () => ({
  core: {
    PayPalHttpClient: jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })),
    SandboxEnvironment: jest.fn(),
    LiveEnvironment: jest.fn(),
    AccessTokenRequest: jest.fn(),
  },
  orders: {
    OrdersCreateRequest: jest.fn(),
  },
}));

describe('AppService (Payment)', () => {
  let service: AppService;
  let prisma: PrismaService;
  let paypalService: PaypalService;
  let amqpConnection: AmqpConnection;
  let gymClient: ClientProxy;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const mockAmqp = { publish: jest.fn() };
  const mockGymClient = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PaypalService,
          useValue: { client: { execute: jest.fn() } },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: AmqpConnection, useValue: mockAmqp },
        { provide: 'GYM_SERVICE', useValue: mockGymClient },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    prisma = module.get<PrismaService>(PrismaService);
    paypalService = module.get<PaypalService>(PaypalService);
    amqpConnection = module.get<AmqpConnection>(AmqpConnection);
    gymClient = module.get<ClientProxy>('GYM_SERVICE');
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return payment service status message', () => {
      const result = service.getHello();
      expect(result).toBe('Payment Service is running!');
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a PayPal order and return an approval URL', async () => {
      const dto = { userId: 'user-1', membershipId: 'mem-1' };
      const membershipDetails = { id: 'mem-1', name: 'Premium', price: 29.99 };
      const paypalOrder = {
        result: {
          id: 'paypal-order-id',
          links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
        },
      };

      (mockGymClient.send as jest.Mock).mockReturnValue(of(membershipDetails));
      (paypalService.client.execute as jest.Mock).mockResolvedValue(
        paypalOrder,
      );
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({});

      const result = await service.createCheckoutSession(dto);

      expect(mockGymClient.send).toHaveBeenCalledWith(
        { cmd: 'get_membership_details' },
        { membershipId: dto.membershipId },
      );
      expect(paypalService.client.execute).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transactionId: 'paypal-order-id',
          status: 'PENDING',
        }),
      });
      expect(result).toEqual({ approvalUrl: 'https://paypal.com/approve' });
    });

    it('should throw RpcException if membership details are not found', async () => {
      const dto = { userId: 'user-1', membershipId: 'mem-nonexistent' };

      (mockGymClient.send as jest.Mock).mockReturnValue(
        of({ error: 'Not found' }),
      );

      await expect(service.createCheckoutSession(dto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('handlePaypalWebhook', () => {
    const webhookData = {
      body: {
        id: 'wh-1',
        event_type: 'CHECKOUT.ORDER.APPROVED',
        resource: { id: 'paypal-order-id' },
      },
      headers: { 'paypal-transmission-time': new Date().toISOString() },
      rawBody: '{}',
    };

    it('should process a valid webhook, update payment, and publish event', async () => {
      const payment = {
        id: 'payment-1',
        status: 'PENDING',
        userId: 'user-1',
        membershipId: 'mem-1',
      };
      
      // Mock the signature verification method
      service['verifyPaypalSignature'] = jest.fn().mockResolvedValue(true);
      
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(payment);
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({
        ...payment,
        status: 'COMPLETED',
      });

      const result = await service.handlePaypalWebhook(webhookData);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: 'COMPLETED', completedAt: expect.any(Date) },
      });
      expect(mockAmqp.publish).toHaveBeenCalledWith(
        'gymcore-exchange',
        'payment.completed',
        expect.any(Object),
        { persistent: true },
      );
      expect(result).toEqual({ status: 'processed' });
    });

    it('should ignore an already processed payment', async () => {
      service['verifyPaypalSignature'] = jest.fn().mockResolvedValue(true);
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue({
        status: 'COMPLETED',
      });

      const result = await service.handlePaypalWebhook(webhookData);

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockAmqp.publish).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'already_processed' });
    });

    it('should ignore webhook if signature is invalid', async () => {
      service['verifyPaypalSignature'] = jest.fn().mockResolvedValue(false);

      const result = await service.handlePaypalWebhook(webhookData);

      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'ignored_invalid_signature' });
    });
  });
});
