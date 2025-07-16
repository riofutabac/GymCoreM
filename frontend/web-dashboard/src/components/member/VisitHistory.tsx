"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Calendar } from "lucide-react";
import { MemberProfile } from "@/lib/api/types";
import { getMemberVisitHistory } from "@/lib/api/member";

interface Visit {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  duration?: string;
}

interface VisitHistoryProps {
  memberProfile?: MemberProfile | null;
}

export function VisitHistory({ memberProfile }: VisitHistoryProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        // Si tenemos datos en el perfil, los usamos
        if (memberProfile?.visits?.history && memberProfile.visits.history.length > 0) {
          setVisits(memberProfile.visits.history);
        } else {
          // Si no, hacemos la llamada a la API
          const data = await getMemberVisitHistory();
          setVisits(data);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el historial de visitas');
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [memberProfile]);

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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Historial de Visitas</CardTitle>
          <CardDescription>
            Registro de tus entradas y salidas al gimnasio
          </CardDescription>
        </div>
        <Calendar className="h-5 w-5 text-muted-foreground" />
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
        ) : visits.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin visitas</AlertTitle>
            <AlertDescription>No tienes visitas registradas aún.</AlertDescription>
          </Alert>
        ) : (
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
              {visits.map((visit) => (
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
        )}
      </CardContent>
    </Card>
  );
}
