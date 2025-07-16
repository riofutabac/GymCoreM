"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { getMemberVisitHistory } from "@/lib/api/member";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Visit {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: string;
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<'all' | 'thisMonth' | 'lastMonth'>('all');
  
  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const data = await getMemberVisitHistory();
        setVisits(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el historial de visitas');
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "-";
    
    // Si es una hora completa (HH:MM:SS)
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    }
    
    // Si es un timestamp
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar visitas según el filtro seleccionado
  const filteredVisits = visits.filter(visit => {
    if (filter === 'all') return true;
    
    const visitDate = new Date(visit.date);
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    if (filter === 'thisMonth') {
      return visitDate >= firstDayOfMonth;
    } else if (filter === 'lastMonth') {
      return visitDate >= firstDayOfLastMonth && visitDate <= lastDayOfLastMonth;
    }
    
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, startIndex + itemsPerPage);
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Historial de Visitas</h1>
        <p className="text-muted-foreground">
          Registro completo de tus entradas y salidas al gimnasio
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mis Visitas</CardTitle>
            <CardDescription>
              Registro de tus entradas y salidas al gimnasio
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as 'all' | 'thisMonth' | 'lastMonth')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las visitas</SelectItem>
                <SelectItem value="thisMonth">Este mes</SelectItem>
                <SelectItem value="lastMonth">Mes anterior</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : filteredVisits.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sin visitas</AlertTitle>
              <AlertDescription>No tienes visitas registradas en este periodo.</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Duración</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>{formatDate(visit.date)}</TableCell>
                      <TableCell>{formatTime(visit.checkInTime)}</TableCell>
                      <TableCell>
                        {visit.checkOutTime ? (
                          formatTime(visit.checkOutTime)
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            En curso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{visit.duration || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredVisits.length)} de {filteredVisits.length} visitas
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="text-sm">
                      Página {currentPage} de {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Asistencia</CardTitle>
          <CardDescription>
            Resumen de tus visitas al gimnasio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Visitas este mes</div>
              <div className="text-2xl font-bold mt-1">{visits.filter(v => {
                const visitDate = new Date(v.date);
                const today = new Date();
                return visitDate.getMonth() === today.getMonth() && 
                       visitDate.getFullYear() === today.getFullYear();
              }).length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Promedio semanal</div>
              <div className="text-2xl font-bold mt-1">{Math.round(visits.length / 4 * 10) / 10}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Duración promedio</div>
              <div className="text-2xl font-bold mt-1">
                {visits.filter(v => v.duration).length > 0 
                  ? `${Math.round(visits.filter(v => v.duration).reduce((acc, v) => {
                      const duration = v.duration || "0h 0m";
                      const hours = parseInt(duration.split('h')[0]) || 0;
                      const minutes = parseInt(duration.split('h')[1]?.split('m')[0]) || 0;
                      return acc + (hours * 60 + minutes);
                    }, 0) / visits.filter(v => v.duration).length)} min` 
                  : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
