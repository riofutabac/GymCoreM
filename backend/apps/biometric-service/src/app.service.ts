import { Injectable, Logger } from '@nestjs/common';
import { SerialService } from './serial/serial.service'; // <-- IMPORTA ESTO

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // Inyectamos el servicio
  constructor(private readonly serialService: SerialService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<{ status: string; service: string; arduino: { connected: boolean; port: string | null; error: string | null; sensor?: { healthy: boolean; response?: string; error?: string } } }> {
    const arduinoStatus = this.serialService.getConnectionStatus();
    
    // Si está conectado, verificar el estado del sensor
    let sensorStatus;
    if (arduinoStatus.isConnected) {
      this.logger.log('🔍 Verificando estado del sensor Arduino...');
      sensorStatus = await this.serialService.checkSensorStatus();
    }

    const overallStatus = arduinoStatus.isConnected && sensorStatus?.isHealthy ? 'ok' : 'warning';

    return {
      status: overallStatus,
      service: 'biometric-service',
      arduino: {
        connected: arduinoStatus.isConnected,
        port: arduinoStatus.port,
        error: arduinoStatus.error,
        sensor: sensorStatus ? {
          healthy: sensorStatus.isHealthy,
          response: sensorStatus.response,
          error: sensorStatus.error
        } : undefined
      }
    };
  }

  // Método asíncrono para probar la comunicación real
  async pingArduino(): Promise<{ success: boolean; message: string; response?: string; error?: string }> {
    try {
      if (!this.serialService.isArduinoConnected()) {
        return {
          success: false,
          message: 'Arduino no está conectado',
          error: 'No hay conexión con el puerto serial'
        };
      }

      const response = await this.serialService.sendCommand('PING');
      
      if (response === 'PONG') {
        return {
          success: true,
          message: 'Comunicación con Arduino exitosa',
          response: response
        };
      } else {
        return {
          success: false,
          message: 'Arduino respondió pero no con PONG',
          response: response
        };
      }
    } catch (error) {
      this.logger.error(`Error al comunicarse con Arduino: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: 'Error en la comunicación con Arduino',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async startEnrollment(userId: string): Promise<any> {
    this.logger.log(`Iniciando inscripción para el usuario: ${userId}`);
    
    try {
      // Verificar que el Arduino esté conectado
      if (!this.serialService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      // Enviar comando ENROLL al Arduino
      this.logger.log(`Enviando comando ENROLL al Arduino...`);
      const response = await this.serialService.sendCommand('ENROLL');
      
      this.logger.log(`Respuesta del Arduino: ${response}`);
      
      // Procesar la respuesta del Arduino
      if (response === 'ENROLL_START') {
        return {
          message: `Proceso de inscripción iniciado para usuario ${userId}`,
          status: 'started',
          instructions: 'Sigue las instrucciones del Arduino para completar la inscripción'
        };
      } else if (response.startsWith('ENROLL_SUCCESS:ID=')) {
        const enrollmentId = response.split('=')[1];
        this.logger.log(`Inscripción exitosa en Arduino con ID: ${enrollmentId}`);
        
        // TODO: Aquí implementaremos la comunicación con auth-service
        // Por ahora, simulamos el guardado de la plantilla
        const mockTemplate = `template_${userId}_${enrollmentId}_${Date.now()}`;
        
        return {
          message: `Huella para ${userId} registrada exitosamente con ID ${enrollmentId}`,
          enrollmentId: enrollmentId,
          template: mockTemplate,
          status: 'completed'
        };
      } else if (response.startsWith('ENROLL_ERROR:')) {
        const errorDetails = response.split(':')[1];
        throw new Error(`Error en inscripción: ${errorDetails}`);
      } else {
        // Para otras respuestas del proceso de inscripción
        return {
          message: `Proceso de inscripción en progreso para usuario ${userId}`,
          status: 'in_progress',
          currentStep: response
        };
      }
    } catch (error) {
      this.logger.error(`Error al iniciar inscripción: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
