
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { login } from "@/app/auth";

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full animated-button bg-[rgb(0,124,186)] hover:bg-blue-700" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? "Iniciando Sesión..." : "Iniciar Sesión"}
    </Button>
  );
}

const initialState = {
  message: '',
};

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
      <Card className="glassmorphism rounded-lg">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <img src="https://res.cloudinary.com/dtd6lzcg5/image/upload/v1748351583/TPM_LOGO_ey8qh5.png" alt="Onboarding Passport Logo" className="h-12" />
            </div>
          <CardTitle className="font-headline text-2xl font-semibold">Bienvenido de Nuevo</CardTitle>
          <CardDescription className="text-gray-700">Ingresa tus credenciales para acceder a tu plan de capacitación.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.message && (
              <Alert variant="destructive">
                <AlertTitle>Error de Inicio de Sesión</AlertTitle>
                <AlertDescription>
                  {state.message}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="font-medium text-gray-700">Nombre de Usuario o Correo</Label>
              <Input id="identifier" name="identifier" type="text" placeholder="admin o admin@example.com" required className="bg-white/50" defaultValue="admin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password"  className="font-medium text-gray-700">Contraseña</Label>
              <Input id="password" name="password" type="password" required className="bg-white/50" defaultValue="password" />
            </div>
          </CardContent>
          <CardFooter>
            <LoginButton />
          </CardFooter>
        </form>
      </Card>
  );
}
