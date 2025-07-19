import { Controller, Get, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'get_health' })
  async getHealth() {
    this.logger.log(`RECIBIDO: { cmd: 'get_health' }`);
    try {
      // La lógica ya existe en tu servicio, solo la llamamos.
      const result = await this.appService.getHealth();
      return result;
    } catch (error) {
      this.logger.error(`Error en getHealth: ${error.message}`);
      throw new RpcException(error.message || 'Error desconocido al obtener el estado de salud');
    }
  }

  @MessagePattern({ cmd: 'ping_arduino' })
  async pingArduino() {
    this.logger.log(`RECIBIDO: { cmd: 'ping_arduino' }`);
    try {
      // Esta función ya existe en tu AppService
      const result = await this.appService.pingArduino();
      return result;
    } catch (error) {
      this.logger.error(`Error en pingArduino: ${error.message}`);
      throw new RpcException(error.message || 'Error desconocido durante el ping');
    }
  }

  /**
   * Inicia el proceso de enrolamiento de una huella para un usuario.
   * Este es el único punto de entrada para el enrolamiento.
   */
  @MessagePattern({ cmd: 'enroll_fingerprint' })
  async startEnrollment(@Payload() data: { userId: string }) {
    this.logger.log(`RECIBIDO: { cmd: 'enroll_fingerprint' } para userId: ${data.userId}`);
    try {
      const result = await this.appService.startEnrollment(data.userId);
      // El servicio ahora puede devolver un objeto más informativo.
      return { success: true, message: 'Proceso de enrolamiento iniciado.', data: result };
    } catch (error) {
      // Propagar el error como una RpcException para que el api-gateway lo maneje.
      this.logger.error(`Error en startEnrollment: ${error.message}`);
      throw new RpcException(error.message || 'Error desconocido al iniciar el enrolamiento');
    }
  }

  /**
   * Reinicia (borra todas) las huellas del dispositivo Arduino.
   */
  @MessagePattern({ cmd: 'reset_fingerprints' })
  async resetFingerprints() {
    this.logger.log("RECIBIDO: { cmd: 'reset_fingerprints' }");
    try {
      const result = await this.appService.resetFingerprints();
      return { success: true, message: 'Huellas reseteadas exitosamente.', data: result };
    } catch (error) {
      this.logger.error(`Error en resetFingerprints: ${error.message}`);
      throw new RpcException(error.message || 'Error desconocido al resetear huellas');
    }
  }

  /**
   * Cuenta las huellas almacenadas en el dispositivo.
   */
  @MessagePattern({ cmd: 'count_fingerprints' })
  async countFingerprints() {
    this.logger.log("RECIBIDO: { cmd: 'count_fingerprints' }");
    try {
      const result = await this.appService.countFingerprints();
      return { success: true, message: 'Conteo de huellas exitoso.', data: result };
    } catch (error) {
      this.logger.error(`Error en countFingerprints: ${error.message}`);
      throw new RpcException(error.message || 'Error desconocido al contar huellas');
    }
  }

  /**
   * Elimina una huella específica del dispositivo por su ID.
   */
  @MessagePattern({ cmd: 'delete_fingerprint' })
  async deleteFingerprint(@Payload() data: { fingerprintId: number }) {
    this.logger.log(`RECIBIDO: { cmd: 'delete_fingerprint' } para fingerprintId: ${data.fingerprintId}`);
    try {
      const { fingerprintId } = data;

      // La validación se mantiene aquí como una capa extra de seguridad.
      if (isNaN(fingerprintId) || fingerprintId < 1 || fingerprintId > 127) {
        throw new RpcException('ID de huella inválido. Debe estar entre 1 y 127.');
      }
      
      const result = await this.appService.deleteFingerprint(fingerprintId);
      return { success: true, message: `Huella ID ${fingerprintId} eliminada exitosamente.`, data: result };
    } catch (error) {
      this.logger.error(`Error en deleteFingerprint: ${error.message}`);
      throw new RpcException(error.message || 'Error desconocido al eliminar la huella');
    }
  }
}
