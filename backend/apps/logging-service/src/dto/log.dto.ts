import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum LogLevel {
  INFO = 'log',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export class CreateLogDto {
  @IsString()
  @IsNotEmpty()
  readonly context!: string; // El servicio que envía el log

  @IsEnum(LogLevel)
  readonly level!: LogLevel;

  @IsString()
  @IsNotEmpty()
  readonly message!: string;

  @IsOptional()
  @IsString()
  readonly stack?: string;

  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, any>;

  @IsString()
  readonly timestamp!: string;
}