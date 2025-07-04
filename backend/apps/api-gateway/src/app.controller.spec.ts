import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

describe('AppController', () => {
  let controller: AppController;
  let mockAuthClient: Partial<ClientProxy>;

  beforeEach(async () => {
    mockAuthClient = {
      send: jest.fn().mockReturnValue(of({ success: true })),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: 'AUTH_SERVICE',
          useValue: mockAuthClient,
        },
        { provide: 'GYM_SERVICE', useValue: { send: jest.fn() } },
        { provide: 'PAYMENT_SERVICE', useValue: { send: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = app.get<AppController>(AppController);
  });

  describe('register()', () => {
    it('should return the response from authClient', async () => {
      const body = { email: 'test@example.com', password: '1234' };
      (mockAuthClient.send as jest.Mock).mockReturnValueOnce(of({ id: 1 }));

      const result = await controller.register(body);

      expect(mockAuthClient.send).toHaveBeenCalledWith({ cmd: 'register' }, body);
      expect(result).toEqual({ id: 1 });
    });

    it('should propagate HttpException if microservice fails', async () => {
      const error = { status: 400, message: 'Bad Request' };
      (mockAuthClient.send as jest.Mock).mockReturnValueOnce(throwError(() => error));

      await expect(controller.register({})).rejects.toMatchObject({
        status: 400,
        response: 'Bad Request',
      });
    });
  });

  describe('login()', () => {
    it('should return the response from authClient', async () => {
      const body = { email: 'test@example.com', password: '1234' };
      (mockAuthClient.send as jest.Mock).mockReturnValueOnce(of({ token: 'jwt-token', user: { id: 1 } }));

      const result = await controller.login(body);

      expect(mockAuthClient.send).toHaveBeenCalledWith({ cmd: 'login' }, body);
      expect(result).toEqual({ token: 'jwt-token', user: { id: 1 } });
    });

    it('should propagate HttpException on invalid credentials', async () => {
      const error = { status: 401, message: 'Invalid credentials' };
      (mockAuthClient.send as jest.Mock).mockReturnValueOnce(throwError(() => error));

      await expect(controller.login({ email: 'wrong@test.com', password: 'wrong' })).rejects.toMatchObject({
        status: 401,
        response: 'Invalid credentials',
      });
    });
  });
});
