'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { exportMembers, exportSales } from '@/lib/api/manager';

export default function ReportsPage() {
  const [isExportingMembers, setIsExportingMembers] = React.useState(false);
  const [isExportingSales, setIsExportingSales] = React.useState(false);

  const handleExportMembers = async () => {
    setIsExportingMembers(true);
    try {
      const blob = await exportMembers();
      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_miembros_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting members', error);
      alert('No se pudo generar el reporte de miembros.');
    } finally {
      setIsExportingMembers(false);
    }
  };

  const handleExportSales = async () => {
    setIsExportingSales(true);
    try {
      const blob = await exportSales();
      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting sales', error);
      alert('No se pudo generar el reporte de ventas.');
    } finally {
      setIsExportingSales(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generación de Reportes</CardTitle>
          <CardDescription>
            Descarga los datos de tu gimnasio en formato CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <Button onClick={handleExportMembers} disabled={isExportingMembers}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingMembers ? 'Generando...' : 'Exportar Miembros'}
          </Button>
          <Button onClick={handleExportSales} disabled={isExportingSales}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingSales ? 'Generando...' : 'Exportar Ventas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
