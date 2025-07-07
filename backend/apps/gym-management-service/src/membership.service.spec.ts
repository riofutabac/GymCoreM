import { Test, TestingModule } from '@nestjs/testing';
import { MembershipService } from './membership.service';
import { PrismaService } from './prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../prisma/generated/gym-client';
import { RpcException } from '@nestjs/microservices';

describe('MembershipService', () => {
  let service: MembershipService;
  let prisma: PrismaService;

  const mockPrismaService = {
    membership: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gym: {
      findUnique: jest.fn(),
    },
    membershipLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((callback) =>
      callback(mockPrismaService),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('joinGym', () => {
    it('should create a PENDING_PAYMENT membership for a valid gym code', async () => {
      const gym = { id: 'gym-1', name: 'Test Gym', uniqueCode: 'VALID123' };
      (mockPrismaService.gym.findUnique as jest.Mock).mockResolvedValue(gym);
      (mockPrismaService.membership.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (mockPrismaService.membership.create as jest.Mock).mockResolvedValue({
        id: 'mem-123',
        status: 'PENDING_PAYMENT',
      });

      const result = await service.joinGym('VALID123', 'user-1');

      expect(mockPrismaService.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_PAYMENT',
            startDate: new Date('2000-01-01T00:00:00.000Z'),
          }),
        }),
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gymId: 'gym-1' },
      });
      expect(result).toHaveProperty('membershipId', 'mem-123');
      expect(result).toHaveProperty('gymId', 'gym-1');
    });

    it('should throw RpcException if gym code is not found', async () => {
      (mockPrismaService.gym.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.joinGym('INVALID', 'user-1')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException if user is already a member', async () => {
      (mockPrismaService.gym.findUnique as jest.Mock).mockResolvedValue({
        id: 'gym-1',
      });
      (mockPrismaService.membership.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-exist',
      });
      await expect(service.joinGym('VALID123', 'user-1')).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('processPaidMembership', () => {
    const payload = {
      userId: 'user-1',
      membershipId: 'mem-123',
      paidAt: new Date().toISOString(),
    };

    it('should activate a pending membership for 30 days from payment date', async () => {
      const pendingMembership = {
        id: 'mem-123',
        status: 'PENDING_PAYMENT',
        startDate: new Date('2000-01-01'),
        endDate: new Date('2000-01-01'),
      };
      (mockPrismaService.membership.findUnique as jest.Mock).mockResolvedValue(
        pendingMembership,
      );

      await service.processPaidMembership(payload);

      const expectedStartDate = new Date(payload.paidAt);
      const expectedEndDate = new Date(payload.paidAt);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + 1);

      expect(mockPrismaService.membership.update).toHaveBeenCalledWith({
        where: { id: payload.membershipId },
        data: {
          status: 'ACTIVE',
          startDate: expectedStartDate,
          endDate: expectedEndDate,
          activatedById: null,
        },
      });
    });

    it('should extend an already active membership', async () => {
      const now = new Date();
      const futureEndDate = new Date(now.getTime());
      futureEndDate.setDate(futureEndDate.getDate() + 15); // Expires in 15 days

      const activeMembership = {
        id: 'mem-123',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: futureEndDate,
      };
      (mockPrismaService.membership.findUnique as jest.Mock).mockResolvedValue(
        activeMembership,
      );

      await service.processPaidMembership(payload);

      const expectedEndDate = new Date(futureEndDate);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + 1);

      expect(mockPrismaService.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endDate: expectedEndDate,
          }),
        }),
      );
    });
  });

  describe('activate (manual)', () => {
    const dto = {
      userId: 'user-1',
      gymId: 'gym-1',
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      reason: 'manual',
    };
    const manager = { id: 'manager-1', role: Role.MANAGER, gymId: 'gym-1' };
    const user = { id: 'user-1' };
    const gym = { id: 'gym-1' };

    it('should not activate if user has an existing active membership', async () => {
      (mockPrismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(manager)
        .mockResolvedValueOnce(user);
      (mockPrismaService.gym.findUnique as jest.Mock).mockResolvedValue(gym);
      (mockPrismaService.membership.findFirst as jest.Mock).mockResolvedValue({
        id: 'active-mem',
      });

      await expect(service.activate(dto, 'manager-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ForbiddenException if a manager tries to operate on another gym', async () => {
      const otherGymManager = {
        id: 'manager-2',
        role: Role.MANAGER,
        gymId: 'gym-2',
      };
      (mockPrismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(otherGymManager)
        .mockResolvedValueOnce(user);
      (mockPrismaService.gym.findUnique as jest.Mock).mockResolvedValue(gym);
      (mockPrismaService.membership.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.activate(dto, 'manager-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      const invalidDto = {
        ...dto,
        startDate: '2025-02-01',
        endDate: '2025-01-01',
      };

      await expect(service.activate(invalidDto, 'manager-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
