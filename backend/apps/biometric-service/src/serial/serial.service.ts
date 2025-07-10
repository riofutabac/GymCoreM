import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

@Injectable()
export class SerialService implements OnModuleInit {
  private readonly logger = new Logger(SerialService.name);
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private isConnected: boolean = false;
  private lastResponse: string | null = null;
  private connectionError: string | null = null;

  onModuleInit() {
    // Configuración del puerto serial - verificando estado del Arduino
    const portPath = process.env.BIOMETRIC_DEVICE_PORT;
    if (!portPath) {
      this.logger.error('BIOMETRIC_DEVICE_PORT no está definido en el archivo .env');
      return;
    }

    try {
      this.port = new SerialPort({ path: portPath, baudRate: 9600 });
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      this.port.on('open', () => {
        this.logger.log(`✅ Puerto serial ${portPath} abierto correctamente.`);
        this.isConnected = true;
        this.connectionError = null;
      });

      this.parser.on('data', (data) => {
        this.logger.log(`⬅️ Dato recibido de Arduino: ${data}`);
        this.lastResponse = data.toString().trim();
        // Aquí emitiremos eventos en el futuro para que otros métodos reaccionen.
      });

      this.port.on('error', (err) => {
        this.logger.error(`❌ Error en el puerto serial: ${err.message}`);
        this.isConnected = false;
        this.connectionError = err.message;
        this.logger.warn('💡 Verifica que:');
        this.logger.warn('   - El Arduino esté conectado correctamente');
        this.logger.warn('   - El puerto COM sea el correcto');
        this.logger.warn('   - No haya otro programa usando el puerto (Arduino IDE, etc.)');
        this.logger.warn('   - Tengas permisos para acceder al puerto');
      });

      this.port.on('close', () => {
        this.logger.warn('🔌 Puerto serial cerrado');
        this.isConnected = false;
      });
    } catch (error) {
      this.logger.error(`❌ Error al crear el puerto serial: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.warn('💡 El servicio continuará funcionando sin conexión al Arduino');
      this.isConnected = false;
      this.connectionError = error instanceof Error ? error.message : String(error);
    }
  }

  sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.port.isOpen) {
        const errorMsg = 'El puerto serial no está abierto. No se puede enviar el comando.';
        this.logger.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      this.logger.log(`➡️ Enviando comando a Arduino: ${command}`);
      this.lastResponse = null;
      
      // Timeout para la respuesta
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Arduino no respondió en 3 segundos'));
      }, 3000);

      // Escuchar la próxima respuesta
      const responseHandler = (data: string) => {
        clearTimeout(timeout);
        this.parser?.removeListener('data', responseHandler);
        resolve(data.toString().trim());
      };

      this.parser?.on('data', responseHandler);
      this.port.write(`${command}\n`);
    });
  }

  // Nuevo método para verificar el estado del sensor
  async checkSensorStatus(): Promise<{ isHealthy: boolean; response?: string; error?: string }> {
    try {
      if (!this.isArduinoConnected()) {
        return {
          isHealthy: false,
          error: 'Arduino no está conectado'
        };
      }

      // Enviar comando STATUS para verificar el sensor
      const response = await this.sendCommand('STATUS');
      
      if (response === 'SENSOR_OK') {
        return {
          isHealthy: true,
          response: response
        };
      } else {
        return {
          isHealthy: false,
          response: response,
          error: 'El sensor no está funcionando correctamente'
        };
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getConnectionStatus(): { isConnected: boolean; error: string | null; port: string | null } {
    return {
      isConnected: this.isConnected,
      error: this.connectionError,
      port: process.env.BIOMETRIC_DEVICE_PORT || null
    };
  }

  isArduinoConnected(): boolean {
    return this.isConnected && this.port !== null && this.port.isOpen;
  }
}
