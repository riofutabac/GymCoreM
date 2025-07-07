import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SupabaseService } from './supabase/supabase.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ClientProxy } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '../prisma/generated/auth-client';

describe('AppService (Auth)', () => {
  let service: AppService;
  let prisma: PrismaService;
  let supabaseService: SupabaseService;
  let amqpConnection: AmqpConnection;

  const mockSupabaseAdmin = {
    auth: {
      admin: {
        createUser: jest.fn(),
        updateUserById: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  };

  const mockSupabaseClient = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: () => mockSupabaseAdmin,
            getClient: () => mockSupabaseClient,
          },
        },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: 'GYM_SERVICE', useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    prisma = module.get<PrismaService>(PrismaService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    amqpConnection = module.get<AmqpConnection>(AmqpConnection);
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return auth service status message', () => {
      const result = service.getHello();
      expect(result).toBe('Auth Service is running! 🚀');
    });
  });

  describe('registerUser', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };
    const supabaseUser = {
      id: 'supabase-id-123',
      email: registerDto.email,
      created_at: new Date().toISOString(),
    };

    it('should register a user successfully and publish an event', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: supabaseUser },
        error: null,
      });
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        data: { user: supabaseUser },
        error: null,
      });
      (mockPrismaService.user.create as jest.Mock).mockResolvedValue({
        ...supabaseUser,
        ...registerDto,
      });

      const result = await service.registerUser(registerDto);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        options: {
          data: {
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
          },
        },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'gymcore-exchange',
        'user.created',
        expect.any(Object),
        { persistent: true },
      );
      expect(result).toHaveProperty('id', supabaseUser.id);
      expect(result.message).toContain('verifica tu email');
    });

    it('should throw RpcException if email is already registered in Supabase', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {},
        error: { message: 'already_registered' },
      });

      await expect(service.registerUser(registerDto)).rejects.toThrow(
        new RpcException({
          message: 'El email ya está registrado.',
          status: 409,
        }),
      );
    });

    it('should clean up Supabase user if Prisma creation fails', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: supabaseUser },
        error: null,
      });
      (mockPrismaService.user.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Error', {
          code: 'P2002',
          clientVersion: '5.0.0',
        }),
      );
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({});

      await expect(service.registerUser(registerDto)).rejects.toThrow(
        RpcException,
      );
      expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(
        supabaseUser.id,
      );
    });
  });

  describe('loginUser', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const session = {
      access_token: 'jwt-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600,
    };
    const user = { id: 'user-id-456', email: loginDto.email };
    const profile = {
      role: 'MEMBER',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should return tokens and user data on successful login', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user, session },
        error: null,
      });
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        profile,
      );

      const result = await service.loginUser(loginDto);

      expect(result.message).toBe('Inicio de sesión exitoso.');
      expect(result.access_token).toBe(session.access_token);
      expect(result.user.role).toBe(profile.role);
    });

    it('should throw RpcException for invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { code: 'invalid_credentials' },
      });

      await expect(service.loginUser(loginDto)).rejects.toThrow(
        new RpcException({
          message: 'Credenciales inválidas.',
          status: 401,
        }),
      );
    });

    it('should throw RpcException if user profile is not found in Prisma', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user, session },
        error: null,
      });
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.loginUser(loginDto)).rejects.toThrow(
        new RpcException({
          message: 'No se pudo encontrar el perfil del usuario.',
          status: 404,
        }),
      );
    });
  });

  describe('changeRole', () => {
    const userId = 'user-id-789';

    it('should update role in Prisma and Supabase, and publish an event', async () => {
      const updatedUser = { id: userId, role: 'MANAGER', gymId: 'gym-1' };
      (mockPrismaService.user.update as jest.Mock).mockResolvedValue(
        updatedUser,
      );
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({});

      const result = await service.changeRole(userId, 'MANAGER', 'gym-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: 'MANAGER', gymId: 'gym-1' },
      });
      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalled();
      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'gymcore-exchange',
        'user.role.updated',
        expect.any(Object),
        { persistent: true },
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw RpcException for an invalid role', async () => {
      await expect(service.changeRole(userId, 'INVALID_ROLE')).rejects.toThrow(
        new RpcException({ message: 'Rol inválido', status: 400 }),
      );
    });
  });
});
