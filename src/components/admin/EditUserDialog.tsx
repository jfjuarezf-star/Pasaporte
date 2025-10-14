
'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { updateUser } from '@/app/admin-actions';
import { User, UserCategory } from '@/lib/types';
import { AlertCircle, Check, Loader2, Save } from 'lucide-react';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
}

const initialFormState = { message: '', errors: {}, success: false };

export function EditUserDialog({
  user,
  isOpen,
  onOpenChange,
  userCategories,
}: {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userCategories: UserCategory[];
}) {
  const [state, formAction] = useActionState(updateUser, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  
  // To manage checkboxes which are not part of the native form reset
  const [selectedCategories, setSelectedCategories] = useState<Set<UserCategory>>(new Set(user.categories));

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  useEffect(() => {
    if (isOpen) {
      // Reset form state when dialog opens for a new user
      formRef.current?.reset();
      // Manually set checkbox state when dialog opens
      setSelectedCategories(new Set(user.categories));
    }
  }, [isOpen, user]);

  const handleCategoryChange = (category: UserCategory, checked: boolean) => {
    const newCategories = new Set(selectedCategories);
    if (checked) {
      newCategories.add(category);
    } else {
      newCategories.delete(category);
    }
    setSelectedCategories(newCategories);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>Modifica los detalles del usuario {user.name}.</DialogDescription>
        </DialogHeader>
        <form action={formAction} ref={formRef}>
           <input type="hidden" name="userId" value={user.id} />
           <div className="space-y-4 py-4">
            {state?.message && !state.success && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}
             {state.success && (
                <Alert variant="default" className="bg-green-100 dark:bg-green-900">
                    <Check className="h-4 w-4" />
                    <AlertTitle>Éxito</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
             )}
            <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" required defaultValue={user.name} />
                {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input id="username" name="username" required defaultValue={user.username} />
                {state?.errors?.username && <p className="text-sm text-destructive">{state.errors.username[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico (opcional para usuarios, obligatorio para admins)</Label>
                <Input id="email" name="email" type="email" defaultValue={user.email} />
                {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label>Categorías de Usuario</Label>
                <div className="space-y-2">
                    {userCategories.map(category => (
                        <div key={category} className="flex items-center gap-2">
                            <Checkbox 
                                id={`edit-category-${category}`} 
                                name="categories" 
                                value={category}
                                checked={selectedCategories.has(category)}
                                onCheckedChange={(checked) => handleCategoryChange(category, !!checked)}
                            />
                            <Label htmlFor={`edit-category-${category}`}>{category}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select name="role" defaultValue={user.role}>
                    <SelectTrigger id="role">
                    <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <SubmitButton>Guardar Cambios</SubmitButton>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
