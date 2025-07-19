'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { joinGym } from '@/lib/api/member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface JoinGymFormProps {
  onSuccess?: () => void;
}

export default function JoinGymForm({ onSuccess }: JoinGymFormProps) {
  const [uniqueCode, setUniqueCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await joinGym(uniqueCode);
      setSuccess('Te has unido al gimnasio exitosamente.');
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al unirte al gimnasio. Verifica el código.');
      console.error('Join failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="code">Código de gimnasio</Label>
        <Input
          id="code"
          type="text"
          value={uniqueCode}
          onChange={(e) => setUniqueCode(e.target.value)}
          placeholder="Ingresa el código único"
          disabled={isLoading}
          required
        />
        <p className="text-sm text-muted-foreground">
          Solicita este código al personal del gimnasio.
        </p>
      </div>
      
      <Button
        type="submit"
        disabled={isLoading || !uniqueCode.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uniendo...
          </>
        ) : (
          'Unirse al Gimnasio'
        )}
      </Button>
    </form>
  );
}
