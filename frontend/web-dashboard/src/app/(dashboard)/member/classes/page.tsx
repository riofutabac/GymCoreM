"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Calendar, Clock, Users, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Interfaces para las clases
interface GymClass {
  id: string;
  name: string;
  description: string;
  instructor: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolled: number;
  category: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
}

export default function ClassesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // Aquí iría la llamada a la API para obtener las clases
        // Por ejemplo: const data = await getAvailableClasses();
        
        // Simulamos datos de ejemplo
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockClasses: GymClass[] = [
          {
            id: "1",
            name: "Yoga Flow",
            description: "Una clase de yoga dinámica que conecta la respiración con el movimiento.",
            instructor: "María García",
            date: "2025-07-16",
            startTime: "10:00",
            endTime: "11:00",
            capacity: 15,
            enrolled: 8,
            category: "Yoga",
            level: "Principiante"
          },
          {
            id: "2",
            name: "Spinning Intenso",
            description: "Clase de ciclismo indoor de alta intensidad con intervalos y sprints.",
            instructor: "Carlos Rodríguez",
            date: "2025-07-16",
            startTime: "18:00",
            endTime: "19:00",
            capacity: 20,
            enrolled: 15,
            category: "Cardio",
            level: "Avanzado"
          },
          {
            id: "3",
            name: "Pilates Mat",
            description: "Fortalece tu core y mejora tu postura con ejercicios de pilates en colchoneta.",
            instructor: "Ana Martínez",
            date: "2025-07-17",
            startTime: "11:00",
            endTime: "12:00",
            capacity: 12,
            enrolled: 5,
            category: "Pilates",
            level: "Intermedio"
          },
          {
            id: "4",
            name: "HIIT",
            description: "Entrenamiento por intervalos de alta intensidad para quemar calorías rápidamente.",
            instructor: "Javier López",
            date: "2025-07-17",
            startTime: "19:00",
            endTime: "20:00",
            capacity: 15,
            enrolled: 12,
            category: "Cardio",
            level: "Avanzado"
          },
          {
            id: "5",
            name: "Yoga Restaurativo",
            description: "Clase de yoga suave y relajante para reducir el estrés y mejorar la flexibilidad.",
            instructor: "María García",
            date: "2025-07-18",
            startTime: "10:00",
            endTime: "11:00",
            capacity: 15,
            enrolled: 4,
            category: "Yoga",
            level: "Principiante"
          },
          {
            id: "6",
            name: "Zumba",
            description: "Baila y diviértete mientras quemas calorías con ritmos latinos.",
            instructor: "Laura Sánchez",
            date: "2025-07-18",
            startTime: "18:00",
            endTime: "19:00",
            capacity: 25,
            enrolled: 20,
            category: "Baile",
            level: "Intermedio"
          }
        ];
        
        setClasses(mockClasses);
      } catch (err: any) {
        setError(err.message || 'Error al cargar las clases disponibles');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleBookClass = async (classId: string) => {
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(false);
    
    try {
      // Aquí iría la llamada a la API para reservar la clase
      // Por ejemplo: await bookClass(classId);
      
      // Simulamos la llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBookingSuccess(true);
      
      // Actualizar el estado de las clases para reflejar la nueva reserva
      setClasses(classes.map(c => {
        if (c.id === classId) {
          return { ...c, enrolled: c.enrolled + 1 };
        }
        return c;
      }));
      
      // Cerrar el diálogo después de un tiempo
      setTimeout(() => {
        setShowBookingDialog(false);
        setBookingSuccess(false);
      }, 2000);
    } catch (err: any) {
      setBookingError(err.message || 'Error al reservar la clase');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
  };

  const getUniqueDates = () => {
    const dates = [...new Set(classes.map(c => c.date))];
    return dates.sort();
  };

  const getUniqueCategories = () => {
    return [...new Set(classes.map(c => c.category))];
  };

  // Filtrar clases por fecha o categoría
  const filteredClasses = classes.filter(c => {
    if (filter === 'all') return true;
    if (getUniqueDates().includes(filter)) return c.date === filter;
    return c.category === filter;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Clases Grupales</h1>
        <p className="text-muted-foreground">
          Explora y reserva clases grupales en tu gimnasio
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando clases disponibles...</p>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por:</span>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las clases</SelectItem>
                <SelectItem value="divider" disabled>── Por fecha ──</SelectItem>
                {getUniqueDates().map(date => (
                  <SelectItem key={date} value={date}>
                    {formatDate(date)}
                  </SelectItem>
                ))}
                <SelectItem value="divider2" disabled>── Por categoría ──</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de clases */}
          {filteredClasses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sin clases</AlertTitle>
              <AlertDescription>No hay clases disponibles con los filtros seleccionados.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((gymClass) => (
                <Card key={gymClass.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{gymClass.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {gymClass.description}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={
                          gymClass.level === 'Principiante' ? 'outline' : 
                          gymClass.level === 'Intermedio' ? 'secondary' : 'default'
                        }
                      >
                        {gymClass.level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatDate(gymClass.date)}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{gymClass.startTime} - {gymClass.endTime}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{gymClass.enrolled} / {gymClass.capacity} plazas</span>
                      </div>
                      <div className="text-sm font-medium">
                        Instructor: {gymClass.instructor}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      disabled={gymClass.enrolled >= gymClass.capacity}
                      onClick={() => {
                        setSelectedClass(gymClass);
                        setShowBookingDialog(true);
                      }}
                    >
                      {gymClass.enrolled >= gymClass.capacity ? 'Clase Completa' : 'Reservar Plaza'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Diálogo de confirmación de reserva */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Reserva</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres reservar una plaza para esta clase?
            </DialogDescription>
          </DialogHeader>
          
          {selectedClass && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="font-medium text-lg">{selectedClass.name}</div>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{formatDate(selectedClass.date)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{selectedClass.startTime} - {selectedClass.endTime}</span>
                </div>
                <div className="text-sm">
                  Instructor: {selectedClass.instructor}
                </div>
              </div>
              
              {bookingError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{bookingError}</AlertDescription>
                </Alert>
              )}
              
              {bookingSuccess && (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">¡Reserva Confirmada!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Tu plaza ha sido reservada correctamente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBookingDialog(false)}
              disabled={bookingLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedClass && handleBookClass(selectedClass.id)}
              disabled={bookingLoading || bookingSuccess}
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reservando...
                </>
              ) : 'Confirmar Reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
