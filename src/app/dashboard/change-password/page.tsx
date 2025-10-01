'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { changePassword } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

function ChangePasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cambiando...
        </>
      ) : (
        'Cambiar Contraseña'
      )}
    </Button>
  );
}

export default function ChangePasswordPage() {
  const [state, formAction] = useActionState(changePassword, { message: '', status: '' });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-2xl">Cambiar Contraseña</CardTitle>
          </div>
          <CardDescription>
            Elige una nueva contraseña segura para tu cuenta.
          </CardDescription>
        </CardHeader>
        <form action={formAction} ref={formRef}>
          <CardContent className="space-y-4">
            {state?.message && (
              <Alert variant={state.status === 'success' ? 'default' : 'destructive'} className={state.status === 'success' ? 'bg-green-100 dark:bg-green-900 border-green-400' : ''}>
                <AlertTitle>{state.status === 'success' ? 'Éxito' : 'Error'}</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
             {state.status !== 'success' && (
              <>
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input id="currentPassword" name="currentPassword" type="password" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" name="newPassword" type="password" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required />
                </div>
              </>
             )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             {state.status !== 'success' ? (
                <ChangePasswordButton />
             ) : (
                <Button asChild className="w-full">
                    <Link href="/dashboard">Volver al Panel</Link>
                </Button>
             )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
