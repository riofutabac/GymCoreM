import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PaypalService } from './paypal/paypal.service';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: {},
        },
        { provide: PaypalService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: 'GYM_SERVICE', useValue: {} as ClientProxy },
        { provide: AmqpConnection, useValue: {} },
        AppService,
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return a status message', () => {
      expect(appController.getHello()).toBe('Payment Service is running!');
    });
  });
});
