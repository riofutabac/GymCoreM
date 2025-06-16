import { Controller, Get, Post, Body, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): string {
    return this.appService.getHello();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerUser(@Body(new ValidationPipe()) registerUserDto: RegisterUserDto) {
    return this.appService.registerUser(registerUserDto);
  }
}