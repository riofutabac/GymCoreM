import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async getMembershipStatus(userId: string): Promise<boolean | null> {
    const cached = await this.redisClient.get(`membership:${userId}`);
    if (cached) {
      this.logger.log(`[Cache HIT] Found membership status for user ${userId}`);
      return JSON.parse(cached);
    }
    this.logger.log(`[Cache MISS] No membership status found for user ${userId}`);
    return null;
  }

  async setMembershipStatus(userId: string, isActive: boolean): Promise<void> {
    // Cache for 5 minutes (300 seconds)
    await this.redisClient.setex(`membership:${userId}`, 300, JSON.stringify(isActive));
    this.logger.log(`[Cache SET] Stored membership status for user ${userId}: ${isActive}`);
  }

  async invalidateMembershipStatus(userId: string): Promise<void> {
    await this.redisClient.del(`membership:${userId}`);
    this.logger.log(`[Cache INVALIDATE] Invalidated cache for user ${userId}`);
  }
}