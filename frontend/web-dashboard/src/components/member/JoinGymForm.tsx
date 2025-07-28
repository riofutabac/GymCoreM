'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { joinGym } from '@/lib/api/member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { sanitizeString } from '@/lib/utils/sanitization';

const joinGymSchema = z.object({
  uniqueCode: z.string()
    .transform(sanitizeString)
    .pipe(z.string().min(1, { message: 'El código de gimnasio es requerido.' })
    .max(50, { message: 'El código no puede exceder 50 caracteres.' })
    .regex(/^[a-zA-Z0-9\-_]+$/, { message: 'El código solo puede contener letras, números, guiones y guiones bajos.' })),
});

type JoinGymFormData = z.infer<typeof joinGymSchema>;

interface JoinGymFormProps {
  onSuccess?: () => void;
}

export default function JoinGymForm({ onSuccess }: JoinGymFormProps) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const form = useForm<JoinGymFormData>({
    resolver: zodResolver(joinGymSchema),
    defaultValues: {
      uniqueCode: '',
    },
  });

  const handleSubmit = async (data: JoinGymFormData) => {
    setError('');
    setSuccess('');
    
    try {
      const response = await joinGym(data.uniqueCode);
      setSuccess('Te has unido al gimnasio exitosamente.');
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al unirte al gimnasio. Verifica el código.');
      console.error('Join failed:', err);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription className="text-green-800 text-sm md:text-base">{success}</AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
          name="uniqueCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm md:text-base">Código de gimnasio</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ingresa el código único"
                  className="text-sm md:text-base"
                  disabled={form.formState.isSubmitting}
                  {...field}
                />
              </FormControl>
              <p className="text-xs md:text-sm text-muted-foreground">
                Solicita este código al personal del gimnasio.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full text-sm md:text-base h-10 md:h-11"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm md:text-base">Uniendo...</span>
            </>
          ) : (
            <span className="text-sm md:text-base">Unirse al Gimnasio</span>
          )}
        </Button>
      </form>
    </Form>
  );
}
