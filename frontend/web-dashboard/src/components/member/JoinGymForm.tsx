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
          <AlertDescription className="text-sm md:text-base">{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription className="text-green-800 text-sm md:text-base">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="code" className="text-sm md:text-base">Código de gimnasio</Label>
        <Input
          id="code"
          type="text"
          value={uniqueCode}
          onChange={(e) => setUniqueCode(e.target.value)}
          placeholder="Ingresa el código único"
          disabled={isLoading}
          required
          className="text-sm md:text-base"
        />
        <p className="text-xs md:text-sm text-muted-foreground">
          Solicita este código al personal del gimnasio.
        </p>
      </div>
      
      <Button
        type="submit"
        disabled={isLoading || !uniqueCode.trim()}
        className="w-full text-sm md:text-base h-10 md:h-11"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm md:text-base">Uniendo...</span>
          </>
        ) : (
          <span className="text-sm md:text-base">Unirse al Gimnasio</span>
        )}
      </Button>
    </form>
  );
}
