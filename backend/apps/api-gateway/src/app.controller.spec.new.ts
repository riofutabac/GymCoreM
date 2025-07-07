import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AppController (API Gateway)', () => {
  let controller: AppController;
  let mockAuthClient: jest.Mocked<ClientProxy>;
  let mockGymClient: jest.Mocked<ClientProxy>;
  let mockPaymentClient: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: 'AUTH_SERVICE', useValue: { send: jest.fn() } },
        { provide: 'GYM_SERVICE', useValue: { send: jest.fn() } },
        { provide: 'PAYMENT_SERVICE', useValue: { send: jest.fn() } },
        { provide: 'INVENTORY_SERVICE', useValue: { send: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppController>(AppController);
    mockAuthClient = module.get('AUTH_SERVICE');
    mockGymClient = module.get('GYM_SERVICE');
    mockPaymentClient = module.get('PAYMENT_SERVICE');
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should forward login request to AUTH_SERVICE and return response', async () => {
      const loginPayload = { email: 'test@test.com', password: 'password' };
      const authResponse = { access_token: 'token' };
      mockAuthClient.send.mockReturnValue(of(authResponse));

      const result = await controller.login(loginPayload);

      expect(mockAuthClient.send).toHaveBeenCalledWith(
        { cmd: 'login' },
        loginPayload,
      );
      expect(result).toEqual(authResponse);
    });

    it('should propagate RpcException as HttpException', async () => {
      const rpcError = new RpcException({
        message: 'Invalid credentials',
        status: HttpStatus.UNAUTHORIZED,
      });
      mockAuthClient.send.mockReturnValue(throwError(() => rpcError));

      await expect(controller.login({})).rejects.toThrow(HttpException);
      await expect(controller.login({})).rejects.toHaveProperty(
        'status',
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('joinGym', () => {
    it('should call gym_service to join and then auth_service to update role', async () => {
      const joinDto = { uniqueCode: 'GYM123' };
      const req = {
        user: { sub: 'user-1', app_metadata: { role: 'MEMBER' } },
      };
      const gymResponse = {
        membershipId: 'mem-1',
        gymId: 'gym-1',
        gymName: 'Test Gym',
      };

      mockGymClient.send.mockReturnValue(of(gymResponse));
      mockAuthClient.send.mockReturnValue(of({ success: true }));

      const result = await controller.joinGym(joinDto, req);

      expect(mockGymClient.send).toHaveBeenCalledWith(
        { cmd: 'join_gym' },
        { uniqueCode: 'GYM123', userId: 'user-1' },
      );
      expect(mockAuthClient.send).toHaveBeenCalledWith(
        { cmd: 'change_role' },
        { userId: 'user-1', newRole: 'MEMBER', gymId: 'gym-1' },
      );
      expect(result).toEqual(gymResponse);
    });
  });

  describe('paypalWebhookProxy', () => {
    it('should forward webhook with body, headers, and rawBody to PAYMENT_SERVICE', async () => {
      const req = {
        body: { event: 'test' },
        rawBody: Buffer.from('{"event":"test"}'),
      };
      const headers = { 'x-paypal-header': 'value' };
      mockPaymentClient.send.mockReturnValue(of({ status: 'processed' }));

      await controller.paypalWebhookProxy(req, headers);

      expect(mockPaymentClient.send).toHaveBeenCalledWith(
        { cmd: 'handle_paypal_webhook' },
        { body: req.body, headers, rawBody: '{"event":"test"}' },
      );
    });
  });
});
