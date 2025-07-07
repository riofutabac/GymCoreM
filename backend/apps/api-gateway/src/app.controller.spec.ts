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

  describe('login()', () => {
    it('should return the response from authClient', async () => {
      const body = { email: 'test@example.com', password: '1234' };
      const mockRes = { cookie: jest.fn() };
      (mockAuthClient.send as jest.Mock).mockReturnValueOnce(of({ access_token: 'jwt-token', user: { id: 1 } }));

      const result = await controller.login(body, mockRes);

      expect(mockAuthClient.send).toHaveBeenCalledWith({ cmd: 'login' }, body);
      expect(result).toEqual({ access_token: 'jwt-token', user: { id: 1 } });
    });

    it('should propagate HttpException on invalid credentials', async () => {
      const error = { status: 401, message: 'Invalid credentials' };
      const mockRes = { cookie: jest.fn() };
      (mockAuthClient.send as jest.Mock).mockReturnValueOnce(throwError(() => error));

      await expect(controller.login({ email: 'wrong@test.com', password: 'wrong' }, mockRes)).rejects.toMatchObject({
        status: 401,
        response: 'Invalid credentials',
      });
    });
  });
});
