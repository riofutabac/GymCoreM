import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SerialService } from './serial/serial.service';
import { firstValueFrom, timeout } from 'rxjs';
import { RedisService } from './biometric.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private currentEnrollmentUserId: string | null = null;
  private isVerifying: boolean = false;
  // NUEVO: Flag para el periodo de enfriamiento
  private isCoolingDown: boolean = false;

  constructor(
    private readonly serialService: SerialService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Escuchar respuestas del Arduino para detectar enrollments exitosos
    this.serialService.onData((data: string) => {
      this.handleArduinoResponse(data);
    });
  }

  // -- INICIA BLOQUE DE LÓGICA DE COOLDOWN --
  private startCooldown(): void {
    this.isCoolingDown = true;
    this.logger.log('🧊 Iniciando cooldown de 2 segundos...');
    setTimeout(() => {
      this.isCoolingDown = false;
      this.logger.log('✅ Cooldown finalizado. Aceptando nuevas lecturas.');
    }, 2000);
  }
  
  private async handleArduinoResponse(data: string) {
    // Procesar respuesta de enrollment exitoso
    if (data.startsWith('ENROLL_SUCCESS:ID=') && this.currentEnrollmentUserId) {
      const enrollmentId = parseInt(data.split('=')[1]);
      this.logger.log(`✅ Inscripción exitosa en Arduino con ID: ${enrollmentId}`);
            
        // Enviar la plantilla al auth-service
      try {
        this.logger.log(`💾 Guardando mapeo de huella en auth-service...`);
        this.logger.log(`📋 Datos a enviar: userId=${this.currentEnrollmentUserId}, fingerprintId=${enrollmentId}`);
        
        const authResult = await firstValueFrom(
          this.authClient.send(
            { cmd: 'enroll_biometric' },
            { userId: this.currentEnrollmentUserId, fingerprintId: enrollmentId }
          )
        );
        
        this.logger.log(`✅ Mapeo de huella guardado en auth-service: ${JSON.stringify(authResult)}`);
        
        // Resetear el usuario actual
        // this.currentEnrollmentUserId = null;
        
      } catch (authError) {
        this.logger.error(`❌ Error guardando en auth-service: ${authError instanceof Error ? authError.message : String(authError)}`);
        this.logger.error(`📊 Detalles del error: ${JSON.stringify(authError)}`);
        
        // 🔄 ROLLBACK: Eliminar la huella del Arduino porque falló la sincronización con la base de datos
        this.logger.warn(`🔄 Iniciando rollback: eliminando huella ID ${enrollmentId} del Arduino...`);
        
        try {
          await this.performRollback(enrollmentId);
        } catch (rollbackError) {
          this.logger.error(`❌ Error durante rollback: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
          this.logger.error(`⚠️ ATENCIÓN: La huella ID ${enrollmentId} quedó en el Arduino sin vincularse a usuario`);
        }
        
        // Resetear el usuario actual en caso de error
        // this.currentEnrollmentUserId = null;
      } finally {
            this.currentEnrollmentUserId = null;
            this.startCooldown(); // <--- SOLUCIÓN AL DELAY
      }
      return;
    }

    if (data.startsWith('VERIFY_FOUND:ID=')) {
        if (this.isVerifying || this.isCoolingDown) { // <-- Se añade chequeo de cooldown
            if(this.isCoolingDown) this.logger.log("🧊 Lectura ignorada por cooldown.");
            else this.logger.warn('⚠️ Verificación ya en progreso. Ignorando nueva solicitud.');
            return;
        }
        
        this.isVerifying = true;
        
        try {
            const parts = data.split(':');
            const fingerprintId = parseInt(parts[1].split('=')[1]);
            const confidence = parseInt(parts[2].split('=')[1]);

            this.logger.log(`🔍 Huella encontrada por sensor. ID: ${fingerprintId}, Confianza: ${confidence}`);
            this.logger.log(`🗣️  Consultando a auth-service por el dueño del fingerprintId: ${fingerprintId}`);

            const user = await firstValueFrom(
                this.authClient.send({ cmd: 'get_user_by_fingerprint_id' }, { fingerprintId })
            );

            if (user && user.id) {
          // --- NUEVA LÓGICA DE VERIFICACIÓN DE MEMBRESÍA ---
          this.logger.log(`[Verificación de Membresía] Consultando para usuario: ${user.email}`);
          
          try {
            // Usamos timeout para no bloquear el sistema si gym-management-service no responde
            const membershipResponse: { isActive: boolean } = await firstValueFrom(
              this.gymClient.send('check_membership', { userId: user.id }).pipe(timeout(1000)) // Timeout de 1 segundo
            );

            if (membershipResponse.isActive) {
              this.logger.log(`✅ ACCESO CONCEDIDO. Usuario: ${user.email}, Membresía: Activa. Notificando al Arduino.`);
              this.serialService.sendFireAndForgetCommand('VERIFY_SUCCESS');
            } else {
              this.logger.warn(`❌ ACCESO DENEGADO. Usuario: ${user.email}, Membresía: Inactiva o Expirada. Notificando al Arduino.`);
              this.serialService.sendFireAndForgetCommand('VERIFY_FAIL');
            }
          } catch (error) {
            this.logger.error(`[Error RPC] No se pudo verificar la membresía para ${user.email}. Acceso denegado por seguridad.`, error);
            this.serialService.sendFireAndForgetCommand('VERIFY_FAIL');
          }
        } else {
          this.logger.warn(`❌ ACCESO DENEGADO. Huella ID ${fingerprintId} no registrada en la BD. Notificando al Arduino.`);
          this.serialService.sendFireAndForgetCommand('VERIFY_FAIL');
        }
      } catch (error) {
        this.logger.error(`❌ Error durante el proceso de verificación: ${error.message}`);
        this.serialService.sendFireAndForgetCommand('VERIFY_FAIL');
      } finally {
        this.isVerifying = false;
        this.startCooldown();
      }
    }
  }

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
    this.logger.log(`🔄 Iniciando inscripción para el usuario: ${userId}`);
    
    try {
      // Verificar que el Arduino esté conectado
      if (!this.serialService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      // Guardar el userId actual para cuando llegue la respuesta ENROLL_SUCCESS
      this.currentEnrollmentUserId = userId;

      // Enviar comando ENROLL al Arduino
      this.logger.log(`➡️ Enviando comando ENROLL al Arduino...`);
      const response = await this.serialService.sendCommand('ENROLL');
      
      this.logger.log(`📡 Respuesta del Arduino: ${response}`);
      
      // Procesar la respuesta inicial del Arduino
      if (response === 'ENROLL_START') {
        return {
          message: `Proceso de inscripción iniciado para usuario ${userId}`,
          status: 'started',
          instructions: 'Sigue las instrucciones del Arduino para completar la inscripción'
        };
      } else if (response.startsWith('ENROLL_ERROR:')) {
        // Resetear el usuario actual si hay error
        this.currentEnrollmentUserId = null;
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
      // Resetear el usuario actual en caso de error
      this.currentEnrollmentUserId = null;
      this.logger.error(`❌ Error al iniciar inscripción: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async countFingerprints(): Promise<any> {
    try {
      this.logger.log(`🔄 Contando huellas almacenadas en el Arduino...`);
      
      if (!this.serialService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      const response = await this.serialService.sendCommand('COUNT');
      
      this.logger.log(`📡 Respuesta del Arduino: ${response}`);
      
      if (response.startsWith('COUNT_RESULT:')) {
        const count = parseInt(response.split(':')[1]);
        return {
          message: `Hay ${count} huellas almacenadas en el Arduino`,
          count: count,
          maxCapacity: 127,
          available: 127 - count
        };
      } else {
        throw new Error('Respuesta inesperada del Arduino');
      }
    } catch (error) {
      this.logger.error(`❌ Error al contar huellas: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async deleteFingerprint(fingerprintId: number): Promise<any> {
    try {
      this.logger.log(`🗑️ Eliminando huella ID ${fingerprintId} del Arduino...`);
      
      if (!this.serialService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      const command = `DELETE:${fingerprintId}`;
      const response = await this.serialService.sendCommand(command);
      
      this.logger.log(`📡 Respuesta del Arduino: ${response}`);
      
      if (response.startsWith('DELETE_SUCCESS:ID:')) {
        const deletedId = response.split(':')[2];
        return {
          message: `Huella ID ${deletedId} eliminada exitosamente del Arduino`,
          deletedId: parseInt(deletedId),
          status: 'success'
        };
      } else if (response.startsWith('DELETE_ERROR:NOT_FOUND:')) {
        const notFoundId = response.split(':')[2];
        throw new Error(`Huella ID ${notFoundId} no existe en el Arduino`);
      } else if (response.startsWith('DELETE_ERROR:INVALID_ID:')) {
        const invalidId = response.split(':')[2];
        throw new Error(`ID ${invalidId} es inválido. Debe estar entre 1 y 127`);
      } else if (response.startsWith('DELETE_ERROR:FAILED:')) {
        const failedId = response.split(':')[2];
        throw new Error(`Error al eliminar huella ID ${failedId} del Arduino`);
      } else {
        return {
          message: `Proceso de eliminación en progreso para ID ${fingerprintId}`,
          status: 'in_progress',
          response: response
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error al eliminar huella: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Realiza rollback eliminando la huella del Arduino cuando falla la sincronización con la base de datos
   * @param fingerprintId ID de la huella a eliminar del Arduino
   */
  private async performRollback(fingerprintId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.logger.log(`🔄 Ejecutando rollback para huella ID: ${fingerprintId}`);
        
        if (!this.serialService.isArduinoConnected()) {
          reject(new Error('Arduino no está conectado - no se puede realizar rollback'));
          return;
        }

        let rollbackCompleted = false;
        const timeout = setTimeout(() => {
          if (!rollbackCompleted) {
            reject(new Error('Timeout: Rollback no completado en 5 segundos'));
          }
        }, 5000);

        // Escuchar las respuestas del Arduino durante el rollback
        const rollbackHandler = (data: string) => {
          if (rollbackCompleted) return;

          this.logger.log(`📡 Respuesta del rollback: ${data}`);
          
          if (data.startsWith('DELETE_START:ID:')) {
            // Esta es la respuesta inicial, continúa esperando DELETE_SUCCESS
            const startId = data.split(':')[2];
            this.logger.log(`🔄 Rollback iniciado para huella ID: ${startId}`);
          } else if (data.startsWith('DELETE_SUCCESS:ID:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.serialService.removeDataCallback(rollbackHandler);
            
            const deletedId = data.split(':')[2];
            this.logger.log(`✅ Rollback exitoso: huella ID ${deletedId} eliminada del Arduino`);
            resolve();
          } else if (data.startsWith('DELETE_ERROR:NOT_FOUND:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.serialService.removeDataCallback(rollbackHandler);
            
            this.logger.warn(`⚠️ Rollback: huella ID ${fingerprintId} no encontrada en Arduino (ya fue eliminada)`);
            resolve(); // No es un error crítico, la huella ya no existe
          } else if (data.startsWith('DELETE_ERROR:INVALID_ID:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.serialService.removeDataCallback(rollbackHandler);
            
            reject(new Error(`ID ${fingerprintId} es inválido para rollback`));
          } else if (data.startsWith('DELETE_ERROR:FAILED:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.serialService.removeDataCallback(rollbackHandler);
            
            reject(new Error(`Error al eliminar huella ID ${fingerprintId} durante rollback`));
          }
        };

        // Registrar el handler y enviar el comando
        this.serialService.onData(rollbackHandler);
        
        const command = `DELETE:${fingerprintId}`;
        this.serialService.sendCommand(command).catch(error => {
          rollbackCompleted = true;
          clearTimeout(timeout);
          this.serialService.removeDataCallback(rollbackHandler);
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
}
