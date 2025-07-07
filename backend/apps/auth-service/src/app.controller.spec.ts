import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Auth Service is running! 🚀'),
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    changeRole: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should confirm service health', () => {
      const result = appController.getHealth();
      expect(mockAppService.getHello).toHaveBeenCalled();
      expect(result).toBe('Auth Service is running! 🚀');
    });
  });

  describe('registerUser', () => {
    it('should call appService.registerUser with correct data', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };
      
      const expectedResult = {
        id: 'user-id-123',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: 'MEMBER',
        message: 'Usuario registrado exitosamente.',
      };

      mockAppService.registerUser.mockResolvedValue(expectedResult);

      const result = await appController.registerUser(registerDto);

      expect(mockAppService.registerUser).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('loginUser', () => {
    it('should call appService.loginUser with correct credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const expectedResult = {
        access_token: 'jwt-token',
        user: { id: 'user-123', email: loginDto.email, role: 'MEMBER' },
        message: 'Inicio de sesión exitoso.',
      };

      mockAppService.loginUser.mockResolvedValue(expectedResult);

      const result = await appController.loginUser(loginDto);

      expect(mockAppService.loginUser).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('changeRole', () => {
    it('should call appService.changeRole with correct parameters', async () => {
      const payload = {
        userId: 'user-123',
        newRole: 'MANAGER',
        gymId: 'gym-456',
      };
      const expectedResult = {
        id: payload.userId,
        role: payload.newRole,
        gymId: payload.gymId,
      };

      mockAppService.changeRole.mockResolvedValue(expectedResult);

      const result = await appController.changeRole(payload);

      expect(mockAppService.changeRole).toHaveBeenCalledWith(
        payload.userId,
        payload.newRole,
        payload.gymId,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
