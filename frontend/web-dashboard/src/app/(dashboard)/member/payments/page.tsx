"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, AlertCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getPaymentHistory, createPayPalCheckoutSession, renewMembership } from "@/lib/api/member";
import { Payment, PayPalCheckoutResponse } from "@/lib/api/types";

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("history");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await getPaymentHistory();
        setPayments(data || []);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el historial de pagos');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    // Check for payment status in URL (for PayPal redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    if (status === 'success') {
      setPaymentSuccess(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancel') {
      setPaymentError('El pago ha sido cancelado');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePayWithPayPal = async () => {
    setPaymentProcessing(true);
    setPaymentError(null);
    
    try {
      const response = await createPayPalCheckoutSession(29.99, 'Renovación de membresía mensual');
      if (response && response.url) {
        // Redirect to PayPal
        window.location.href = response.url;
      } else {
        throw new Error('No se pudo obtener la URL de pago');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Error al procesar el pago');
      setPaymentProcessing(false);
    }
  };

  const handleRenewMembership = async () => {
    setPaymentProcessing(true);
    setPaymentError(null);
    
    try {
      await renewMembership();
      setPaymentSuccess(true);
    } catch (err: any) {
      setPaymentError(err.message || 'Error al renovar la membresía');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completado</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">
          Gestiona tus pagos y renovaciones de membresía
        </p>
      </div>

      <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Historial de Pagos</TabsTrigger>
          <TabsTrigger value="renew">Renovar Membresía</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4 mt-4">
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
          ) : payments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sin pagos</AlertTitle>
              <AlertDescription>No tienes ningún pago registrado aún.</AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>
                  Todos tus pagos y transacciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{payment.amount}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="renew" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Renovar Membresía</CardTitle>
              <CardDescription>
                Renueva tu membresía para continuar disfrutando de todos los beneficios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentSuccess ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Pago Exitoso</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Tu pago ha sido procesado correctamente. Tu membresía ha sido renovada.
                  </AlertDescription>
                </Alert>
              ) : paymentError ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error en el Pago</AlertTitle>
                  <AlertDescription>{paymentError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Membresía Mensual</h3>
                    <p className="text-sm text-muted-foreground">Acceso completo a todas las instalaciones</p>
                  </div>
                  <div className="text-2xl font-bold">€29.99</div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Duración</span>
                    <span>30 días</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Renovación</span>
                    <span>Manual</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                className="w-full" 
                onClick={handlePayWithPayPal}
                disabled={paymentProcessing || paymentSuccess}
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar con PayPal
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
