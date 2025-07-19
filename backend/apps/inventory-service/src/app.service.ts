import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Inventory Service is running!';
  }

  /**
   * Exporta un reporte CSV de ventas para un manager específico
   */
  async exportSalesReport(managerId: string) {
    this.logger.log(`Generando reporte de ventas para manager ${managerId}`);
    
    try {
      // Por ahora devolvemos datos mockeados ya que no tenemos implementado el sistema de ventas completo
      // En producción, aquí consultaríamos la base de datos de ventas
      
      const mockSales = [
        {
          id: 'sale_1',
          productName: 'Proteína Whey',
          quantity: 2,
          unitPrice: 25.99,
          total: 51.98,
          paymentMethod: 'CASH',
          saleDate: new Date().toISOString(),
        },
        {
          id: 'sale_2',
          productName: 'Bebida Energética',
          quantity: 1,
          unitPrice: 3.50,
          total: 3.50,
          paymentMethod: 'CARD',
          saleDate: new Date().toISOString(),
        },
        {
          id: 'sale_3',
          productName: 'Creatina',
          quantity: 1,
          unitPrice: 19.99,
          total: 19.99,
          paymentMethod: 'CASH',
          saleDate: new Date().toISOString(),
        },
      ];

      // Generar CSV
      const csvHeaders = 'ID,Producto,Cantidad,Precio Unitario,Total,Método de Pago,Fecha de Venta\n';
      const csvRows = mockSales.map(sale => 
        `${sale.id},"${sale.productName}",${sale.quantity},${sale.unitPrice},${sale.total},"${sale.paymentMethod}","${sale.saleDate}"`
      ).join('\n');
      
      const csvData = csvHeaders + csvRows;

      this.logger.log(`Reporte de ventas generado con ${mockSales.length} transacciones`);
      
      return {
        csvData,
        filename: `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`,
        totalSales: mockSales.length,
        totalRevenue: mockSales.reduce((sum, sale) => sum + sale.total, 0)
      };
    } catch (error) {
      this.logger.error('Error generando reporte de ventas:', error);
      throw error;
    }
  }
}
