import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { WebSocketService } from './websocket/websocket.service';
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
    private readonly websocketService: WebSocketService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Verificar conectividad con auth-service al inicializar
    this.logger.log('🔄 Verificando conectividad con auth-service...');
    try {
      // Intentar una llamada simple para verificar la conectividad
      await this.authClient.connect();
      this.logger.log('✅ Conectividad con auth-service establecida');
    } catch (error: any) {
      this.logger.warn(`⚠️ No se pudo conectar inmediatamente con auth-service: ${error.message}`);
      // No lanzamos error, ya que la conexión se puede establecer más tarde
    }

    // Escuchar respuestas del Arduino para detectar enrollments exitosos
    this.websocketService.onData((data: string) => {
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
          ).pipe(timeout(5000)) // Timeout de 5 segundos
        );
        
        this.logger.log(`✅ Mapeo de huella guardado en auth-service: ${JSON.stringify(authResult)}`);
        
        // Resetear el usuario actual
        // this.currentEnrollmentUserId = null;
        
      } catch (authError: any) {
        this.logger.error(`❌ Error guardando en auth-service: ${authError instanceof Error ? authError.message : String(authError)}`);
        this.logger.error(`📊 Detalles del error: ${JSON.stringify(authError)}`);
        
        // 🔄 ROLLBACK: Eliminar la huella del Arduino porque falló la sincronización con la base de datos
        this.logger.warn(`🔄 Iniciando rollback: eliminando huella ID ${enrollmentId} del Arduino...`);
        
        try {
          await this.performRollback(enrollmentId);
        } catch (rollbackError: any) {
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
                this.authClient.send({ cmd: 'get_user_by_fingerprint_id' }, { fingerprintId }).pipe(timeout(5000))
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
              this.websocketService.sendFireAndForgetCommand('VERIFY_SUCCESS');
            } else {
              this.logger.warn(`❌ ACCESO DENEGADO. Usuario: ${user.email}, Membresía: Inactiva o Expirada. Notificando al Arduino.`);
              this.websocketService.sendFireAndForgetCommand('VERIFY_FAIL');
            }
          } catch (error: any) {
            this.logger.error(`[Error RPC] No se pudo verificar la membresía para ${user.email}. Acceso denegado por seguridad.`, error);
            this.websocketService.sendFireAndForgetCommand('VERIFY_FAIL');
          }
        } else {
          this.logger.warn(`❌ ACCESO DENEGADO. Huella ID ${fingerprintId} no registrada en la BD. Notificando al Arduino.`);
          this.websocketService.sendFireAndForgetCommand('VERIFY_FAIL');
        }
      } catch (error: any) {
        this.logger.error(`❌ Error durante el proceso de verificación: ${error.message}`);
        this.websocketService.sendFireAndForgetCommand('VERIFY_FAIL');
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
    const arduinoStatus = this.websocketService.getConnectionStatus();
    
    // Si está conectado, verificar el estado del sensor
    let sensorStatus;
    if (arduinoStatus.isConnected) {
      this.logger.log('🔍 Verificando estado del sensor Arduino...');
      sensorStatus = await this.websocketService.checkSensorStatus();
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
      if (!this.websocketService.isArduinoConnected()) {
        return {
          success: false,
          message: 'Arduino no está conectado',
          error: 'No hay conexión con el agente'
        };
      }

      const response = await this.websocketService.sendCommand('PING');
      
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
    } catch (error: any) {
      this.logger.error(`Error al comunicarse con Arduino: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: 'Error en la comunicación con Arduino',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Inicia el proceso de enrolamiento, limpiando registros previos si existen.
   * @param userId El ID del usuario a enrolar.
   */
  async startEnrollment(userId: string): Promise<any> {
    this.logger.log(`🔄 Iniciando flujo de enrolamiento completo para usuario: ${userId}`);

    try {
      if (!this.websocketService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      // --- PASO 1: VERIFICAR SI HAY HUELLAS ANTIGUAS ---
      this.logger.log(`   [1/4] Verificando huellas existentes en la base de datos...`);
      const existingFingerprints: any[] = await firstValueFrom(
        this.authClient.send({ cmd: 'get_fingerprints_for_user' }, { userId }).pipe(timeout(5000))
      );

      // --- PASO 2: SI EXISTEN, BORRARLAS ---
      if (existingFingerprints && existingFingerprints.length > 0) {
        this.logger.warn(`   [2/4] Se encontraron ${existingFingerprints.length} huellas previas. Procediendo a eliminarlas.`);

        // 2a. Borrar del Arduino
        this.logger.log(`       -> Borrando ${existingFingerprints.length} huellas del Arduino...`);
        for (const fp of existingFingerprints) {
          try {
            await this.deleteFingerprint(fp.fingerprintId);
          } catch (err: any) {
            // Es seguro ignorar si la huella no existe en el Arduino.
            this.logger.warn(`       -> No se pudo borrar la huella ID ${fp.fingerprintId} del Arduino (posiblemente ya no existía).`);
          }
        }
        
        // 2b. Borrar de la Base de Datos
        this.logger.log(`       -> Borrando registros de la base de datos...`);
        await firstValueFrom(
          this.authClient.send({ cmd: 'delete_fingerprints_for_user' }, { userId }).pipe(timeout(5000))
        );
        this.logger.log(`   [3/4] Limpieza de registros previos completada.`);

      } else {
        this.logger.log(`   [2/4] y [3/4] El usuario no tiene huellas previas. Saltando limpieza.`);
      }

      // --- PASO 4: INICIAR NUEVO ENROLAMIENTO ---
      this.logger.log(`   [4/4] Enviando comando ENROLL al Arduino...`);
      this.currentEnrollmentUserId = userId; // Guardamos el ID para cuando el Arduino responda
      const response = await this.websocketService.sendCommand('ENROLL');
      
      this.logger.log(`   -> Respuesta del Arduino: ${response}`);
      
      if (response === 'ENROLL_START') {
        this.logger.log(`✅ Flujo de enrolamiento iniciado exitosamente para ${userId}.`);
        return {
          message: `Proceso de enrolamiento iniciado para usuario ${userId}. Por favor, sigue las instrucciones del dispositivo.`,
          status: 'started',
        };
      } else {
        throw new Error(`El Arduino respondió con un estado inesperado durante el inicio del enrolamiento: ${response}`);
      }

    } catch (error: any) {
      this.currentEnrollmentUserId = null; // Limpiar estado en caso de cualquier error
      this.logger.error(`❌ Error catastrófico durante el flujo de enrolamiento para ${userId}:`, error.stack || error.message);
      throw new Error(error.message || 'Error desconocido al iniciar el enrolamiento');
    }
  }

  async countFingerprints(): Promise<any> {
    try {
      this.logger.log(`🔄 Contando huellas almacenadas en el Arduino...`);
      
      if (!this.websocketService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      const response = await this.websocketService.sendCommand('COUNT');
      
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
    } catch (error: any) {
      this.logger.error(`❌ Error al contar huellas: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async deleteFingerprint(fingerprintId: number): Promise<any> {
    try {
      this.logger.log(`🗑️ Eliminando huella ID ${fingerprintId} del Arduino...`);
      
      if (!this.websocketService.isArduinoConnected()) {
        throw new Error('Arduino no está conectado');
      }

      const command = `DELETE:${fingerprintId}`;
      const response = await this.websocketService.sendCommand(command);
      
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
    } catch (error: any) {
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
        
        if (!this.websocketService.isArduinoConnected()) {
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
            this.websocketService.removeDataCallback(rollbackHandler);
            
            const deletedId = data.split(':')[2];
            this.logger.log(`✅ Rollback exitoso: huella ID ${deletedId} eliminada del Arduino`);
            resolve();
          } else if (data.startsWith('DELETE_ERROR:NOT_FOUND:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.websocketService.removeDataCallback(rollbackHandler);
            
            this.logger.warn(`⚠️ Rollback: huella ID ${fingerprintId} no encontrada en Arduino (ya fue eliminada)`);
            resolve(); // No es un error crítico, la huella ya no existe
          } else if (data.startsWith('DELETE_ERROR:INVALID_ID:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.websocketService.removeDataCallback(rollbackHandler);
            
            reject(new Error(`ID ${fingerprintId} es inválido para rollback`));
          } else if (data.startsWith('DELETE_ERROR:FAILED:')) {
            rollbackCompleted = true;
            clearTimeout(timeout);
            this.websocketService.removeDataCallback(rollbackHandler);
            
            reject(new Error(`Error al eliminar huella ID ${fingerprintId} durante rollback`));
          }
        };

        // Registrar el handler y enviar el comando
        this.websocketService.onData(rollbackHandler);
        
        const command = `DELETE:${fingerprintId}`;
        this.websocketService.sendCommand(command).catch((error: any) => {
          rollbackCompleted = true;
          clearTimeout(timeout);
          this.websocketService.removeDataCallback(rollbackHandler);
          reject(error);
        });
        
      } catch (error: any) {
        reject(error);
      }
    });
  }
}
