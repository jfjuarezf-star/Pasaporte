
'use client';
import { useFormStatus } from 'react-dom';
import React, { useState, useEffect, useRef, useTransition, useActionState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { User, Training, Assignment, PopulatedAssignment, TrainingUrgency, TrainingCategory, UserCategory } from '@/lib/types';
import { createUser, createTraining, promoteUser, assignTrainingToUsers, deleteTraining, deleteUser } from '@/app/admin-actions';
import { FilePlus2, Loader2, UserPlus, Shield, Check, Users, Trash2, UserX, AlertCircle, Database, Calendar as CalendarIcon, Search, Pencil, BookUser, Briefcase } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ReportDashboard } from './ReportDashboard';
import { UserTrainingDetailsDialog } from './UserTrainingDetailsDialog';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { EditTrainingDialog } from './EditTrainingDialog';
import { TrainerDashboardClient } from '../dashboard/TrainerDashboardClient';

const USER_CATEGORIES: UserCategory[] = ['Supervisión', 'Ingresantes', 'Operaciones', 'Línea de Mando (FC)', 'Terceros', 'Mantenimiento', 'Brigadistas', 'RRHH'];
const TRAINING_CATEGORIES: TrainingCategory[] = ['Seguridad', 'Calidad', 'DPO', 'TPM', 'Medio Ambiente', 'Mejora Enfocada', 'Obligatoria'];

type PopulatedTraining = Training & {
    assignments: (Assignment & { user?: User | null })[];
}

function SubmitButton({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

function PromoteButton({user}: {user: User}) {
    const [isPending, startTransition] = useTransition();

    const handlePromote = (e: React.MouseEvent) => {
        e.stopPropagation(); // Evita que se abra el modal del usuario
        startTransition(() => promoteUser(user.id))
    }

    if (user.role === 'admin') {
        return <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" /> Admin</Badge>
    }
    return (
        <form action={() => {}} onSubmit={(e) => e.preventDefault()}>
            <Button size="sm" variant="outline" disabled={isPending} onClick={handlePromote}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Promover
            </Button>
        </form>
    )
}

function AssignTrainingDialog({
  training,
  users,
  onAssignmentsChange,
}: {
  training: TrainingWithAssignments;
  users: User[];
  onAssignmentsChange: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<UserCategory>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    let usersToFilter = users;
    if (searchTerm) {
        usersToFilter = usersToFilter.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    return usersToFilter;
  }, [users, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
        setSelectedUserIds(new Set());
        setSelectedCategories(new Set());
        setSearchTerm('');
    }
  }, [isOpen]);

  const handleAssign = () => {
    startTransition(async () => {
      const userIdsToAssign = Array.from(selectedUserIds).filter(id => !training.assignments.some(a => a.userId === id));
      if (userIdsToAssign.length === 0) return;
      
      const result = await assignTrainingToUsers(training.id, userIdsToAssign);
      if (result.success) {
        onAssignmentsChange();
        setIsOpen(false);
      }
    });
  };

  const handleCheckboxChange = (userId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedUserIds);
    if (checked) {
      newSelectedIds.add(userId);
    } else {
      newSelectedIds.delete(userId);
    }
    setSelectedUserIds(newSelectedIds);
  };

  const handleCategoryCheckboxChange = (category: UserCategory, checked: boolean) => {
    const newSelectedCategories = new Set(selectedCategories);
    if (checked) {
        newSelectedCategories.add(category);
    } else {
        newSelectedCategories.delete(category);
    }
    setSelectedCategories(newSelectedCategories);

    const userIdsInCategory = users
      .filter(user => Array.from(newSelectedCategories).some(cat => user.categories?.includes(cat)))
      .map(user => user.id);
    
    // Merge with existing manual selections, don't overwrite them
    const currentManualSelections = new Set(selectedUserIds);
    userIdsInCategory.forEach(id => currentManualSelections.add(id));
    setSelectedUserIds(currentManualSelections);
  }
  
  const totalSelectedCount = Array.from(selectedUserIds).filter(id => !training.assignments.some(a => a.userId === id)).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Asignar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Asignar: {training.title}</DialogTitle>
          <DialogDescription>
            Selecciona usuarios individuales, por categoría o usa el buscador.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Por Categoría</h4>
            <div className="space-y-2">
              {USER_CATEGORIES.map(category => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={selectedCategories.has(category)}
                    onCheckedChange={(checked) => handleCategoryCheckboxChange(category, !!checked)}
                  />
                  <Label htmlFor={`cat-${category}`}>{category}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Manualmente</h4>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2 py-1 pr-4">
                {filteredUsers.map((user) => {
                  const isAssigned = training.assignments.some(a => a.userId === user.id);
                  const isSelected = selectedUserIds.has(user.id);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                    >
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={isAssigned || isSelected}
                          disabled={isAssigned}
                          onCheckedChange={(checked) => handleCheckboxChange(user.id, !!checked)}
                        />
                        <span>
                          {user.name}
                        </span>
                      </Label>
                      {isAssigned && (
                        <Badge variant="secondary" className="text-xs">
                          Asignado
                        </Badge>
                      )}
                    </div>
                  );
                })}
                 {filteredUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No se encontraron usuarios.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isPending || totalSelectedCount === 0}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Asignar a {totalSelectedCount} usuario(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function DestructiveSubmitButton({ children, onClick }: { children: React.ReactNode, onClick?: (e: React.MouseEvent) => void }) {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            variant="destructive"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onClick}
        >
            {pending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</>
            ) : (
                children
            )}
        </Button>
    )
}

function DeleteTrainingDialog({ trainingId, trainingTitle }: { trainingId: string; trainingTitle: string }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se eliminará la capacitación "{trainingTitle}". Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <form action={deleteTraining.bind(null, trainingId)}>
                       <DestructiveSubmitButton>Sí, eliminar</DestructiveSubmitButton>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeleteUserDialog({ user }: { user: User }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                    <UserX className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se eliminará al usuario "{user.name}". Se borrarán también todas sus capacitaciones asignadas. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <form action={deleteUser.bind(null, user.id)}>
                        <DestructiveSubmitButton>Sí, eliminar</DestructiveSubmitButton>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

const initialCreateUserState = { message: '', errors: {} };
const initialCreateTrainingState = { message: '', errors: {} };

type TrainingWithAssignments = Training & {
    assignments: Assignment[];
}

interface AdminPageClientProps {
  initialUsers: User[];
  initialTrainings: TrainingWithAssignments[];
  allAssignments: Assignment[];
  currentUser: User;
  trainerTrainings: PopulatedTraining[];
  allPopulatedTrainings: PopulatedTraining[];
}

const urgencyText: Record<TrainingUrgency, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export function AdminPageClient({ initialUsers, initialTrainings, allAssignments, currentUser, trainerTrainings, allPopulatedTrainings }: AdminPageClientProps) {
  const [createUserState, createUserAction] = useActionState(createUser, initialCreateUserState);
  const [createTrainingState, createTrainingAction] = useActionState(createTraining, initialCreateTrainingState);
  
  const createUserFormRef = useRef<HTMLFormElement>(null);
  const createTrainingFormRef = useRef<HTMLFormElement>(null);

  const [trainings, setTrainings] = useState(initialTrainings);
  const [assignments, setAssignments] = useState(allAssignments);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTrainingToEdit, setSelectedTrainingToEdit] = useState<TrainingWithAssignments | null>(null);

  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();

  // Filters for lists
  const [userSearch, setUserSearch] = useState('');
  const [titleSearch, setTitleSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');

  const leadershipUsers = useMemo(() => {
    const leaders = new Set<User>();
    initialUsers.forEach(user => {
      if (user.categories?.includes('Línea de Mando (FC)')) {
        leaders.add(user);
      }
    });
    // Ensure currentUser is in the list if not already present
    const currentUserInList = initialUsers.find(u => u.id === currentUser.id);
    if (currentUserInList) {
        leaders.add(currentUserInList);
    }
    return Array.from(leaders);
  }, [initialUsers, currentUser]);

  const uniqueTrainers = useMemo(() => {
    const trainers = new Set(initialTrainings.map(t => t.trainerName));
    return Array.from(trainers);
  }, [initialTrainings]);

  const filteredUsers = useMemo(() => {
    return initialUsers.filter(user => 
        user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [initialUsers, userSearch]);

  const filteredTrainings = useMemo(() => {
    return trainings.filter(training => {
        const titleMatch = titleSearch ? training.title.toLowerCase().includes(titleSearch.toLowerCase()) : true;
        const categoryMatch = categoryFilter !== 'all' ? training.category === categoryFilter : true;
        const trainerMatch = trainerFilter !== 'all' ? training.trainerName === trainerFilter : true;
        return titleMatch && categoryMatch && trainerMatch;
    });
  }, [trainings, titleSearch, categoryFilter, trainerFilter]);


  const handleAssignmentsChange = () => {
    // This function will be called when assignments are changed to trigger a re-render if needed.
    // Currently, revalidation happens on the server, but this is here for potential client-side updates.
  };

  const handleAssignmentStatusChange = (assignmentId: string, isCompleted: boolean) => {
    setAssignments(prevAssignments => prevAssignments.map(a => 
      a.id === assignmentId ? { ...a, status: isCompleted ? 'completed' : 'pending' } : a
    ));
  }
  
  useEffect(() => {
    if (createUserState?.success) {
      createUserFormRef.current?.reset();
    }
  }, [createUserState]);

  useEffect(() => {
    if (createTrainingState?.success) {
      createTrainingFormRef.current?.reset();
      setScheduledDate(undefined);
    }
  }, [createTrainingState]);
  
  useEffect(() => {
    setTrainings(initialTrainings);
  }, [initialTrainings]);

  useEffect(() => {
    setAssignments(allAssignments);
  }, [allAssignments]);

  const userAssignments = (userId: string): PopulatedAssignment[] => {
    const assignmentsForUser = assignments.filter(a => a.userId === userId);
    return assignmentsForUser.map(assignment => {
        const trainingDetails = trainings.find(t => t.id === assignment.trainingId);
        return {
            ...trainingDetails!,
            assignmentId: assignment.id,
            status: assignment.status,
            userId: assignment.userId,
            assignedDate: assignment.assignedDate,
            completedDate: assignment.completedDate,
        }
    }).filter(a => a.id); // Filter out assignments where training might have been deleted
  }

  const canSeeDataExplorer = currentUser.email === 'jfjuarezf@ccu.com.ar';
  const isTrainer = trainerTrainings.length > 0;
  const isRRHH = currentUser.categories?.includes('RRHH');

  const getVisibleTabs = () => {
    const tabs = [
        { value: 'users', label: 'Gestión de Usuarios' },
        { value: 'trainings', label: 'Gestión de Capacitaciones' },
    ];
    if (isTrainer) {
        tabs.push({ value: 'trainer-panel', label: 'Panel de Capacitador' });
    }
    if (isRRHH) {
        tabs.push({ value: 'rrhh-supervision', label: 'Supervisión RRHH' });
    }
    tabs.push({ value: 'reports', label: 'Reportes' });
    if (canSeeDataExplorer) {
        tabs.push({ value: 'data-explorer', label: 'Explorador de Datos', icon: Database });
    }
    return tabs;
  };

  const visibleTabs = getVisibleTabs();


  return (
    <>
    <Tabs defaultValue="users" className="w-full">
      <TabsList className={`grid w-full grid-cols-1 md:h-10 md:grid-cols-${visibleTabs.length}`}>
        {visibleTabs.map(tab => (
             <TabsTrigger key={tab.value} value={tab.value}>
                {tab.icon && <tab.icon className="mr-2 h-4 w-4" />}
                {tab.label}
            </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="users">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Usuarios</CardTitle>
                        <CardDescription>Busca, filtra y gestiona los usuarios de la plataforma.</CardDescription>
                        <div className="relative pt-4">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nombre o email..."
                                className="pl-8"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="md:hidden space-y-4">
                            {(filteredUsers || []).map((user) => (
                                <Card key={user.id} className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(user)}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        {user.role === 'admin' ? 
                                            <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" /> Admin</Badge> 
                                            : <Badge variant="outline">Usuario</Badge>
                                        }
                                    </div>
                                     <div className="flex flex-wrap gap-1 mt-2">
                                        {(user.categories || []).map(cat => <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>)}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                                        <PromoteButton user={user} />
                                        {currentUser.id !== user.id && <DeleteUserDialog user={user} />}
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <Table className="hidden md:table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Categorías</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(filteredUsers || []).map((user) => (
                                <TableRow key={user.id} className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(user.categories || []).map(cat => <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.role === 'admin' ? 'Admin' : 'Usuario'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <PromoteButton user={user} />
                                            {currentUser.id !== user.id && <DeleteUserDialog user={user} />}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {filteredUsers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No se encontraron usuarios.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
            <Card>
                <CardHeader>
                    <CardTitle>Crear Nuevo Usuario</CardTitle>
                    <CardDescription>Crea un nuevo documento en tu colección 'users'.</CardDescription>
                </CardHeader>
                <form action={createUserAction} ref={createUserFormRef}>
                    <CardContent className="space-y-4">
                         {createUserState?.message && !createUserState.success && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{createUserState.message}</AlertDescription>
                            </Alert>
                         )}
                         {createUserState?.success && (
                             <Alert variant="default" className="bg-green-100 dark:bg-green-900">
                                <Check className="h-4 w-4" />
                                <AlertTitle>Éxito</AlertTitle>
                                <AlertDescription>{createUserState.message}</AlertDescription>
                            </Alert>
                         )}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input id="name" name="name" required />
                            {createUserState?.errors?.name && <p className="text-sm text-destructive">{createUserState.errors.name[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" name="email" type="email" required />
                             {createUserState?.errors?.email && <p className="text-sm text-destructive">{createUserState.errors.email[0]}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" name="password" type="password" required />
                             {createUserState?.errors?.password && <p className="text-sm text-destructive">{createUserState.errors.password[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Categorías de Usuario</Label>
                            <div className="space-y-2">
                                {USER_CATEGORIES.map(category => (
                                    <div key={category} className="flex items-center gap-2">
                                        <Checkbox id={`category-${category}`} name="categories" value={category} />
                                        <Label htmlFor={`category-${category}`}>{category}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select name="role" defaultValue="user">
                                <SelectTrigger id="role">
                                <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="user">Usuario</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <SubmitButton className="w-full"><UserPlus className="mr-2" /> Crear Usuario</SubmitButton>
                    </CardContent>
                </form>
            </Card>
            </div>
        </div>
      </TabsContent>
      <TabsContent value="trainings">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Capacitaciones</CardTitle>
                        <CardDescription>Filtra y gestiona las capacitaciones de tu colección 'trainings'.</CardDescription>
                         <div className="flex flex-col md:flex-row gap-2 pt-4">
                            <div className="relative w-full">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar por título..."
                                    className="pl-8"
                                    value={titleSearch}
                                    onChange={(e) => setTitleSearch(e.target.value)}
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las Categorías</SelectItem>
                                    {TRAINING_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Responsable" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Responsables</SelectItem>
                                    {uniqueTrainers.map(trainer => <SelectItem key={trainer} value={trainer}>{trainer}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="md:hidden space-y-4">
                            {(filteredTrainings || []).map((training) => {
                                const completedCount = assignments.filter(a => a.trainingId === training.id && a.status === 'completed').length;
                                const totalAssignments = assignments.filter(a => a.trainingId === training.id).length;
                                return (
                                <Card key={training.id} className="p-4">
                                    <p className="font-bold">{training.title}</p>
                                    <p className="text-sm text-muted-foreground">Responsable: {training.trainerName}</p>
                                    {training.scheduledDate && <p className="text-sm text-muted-foreground">Fecha: {format(new Date(training.scheduledDate), 'PPP')}</p>}
                                    <div className="flex flex-wrap gap-2 my-2">
                                        <Badge variant="outline">{training.category}</Badge>
                                        <Badge variant={training.urgency === 'high' ? 'destructive' : 'secondary'}>{urgencyText[training.urgency]}</Badge>
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            <span>{completedCount} / {totalAssignments}</span>
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedTrainingToEdit(training)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Editar
                                        </Button>
                                        <AssignTrainingDialog training={training} users={initialUsers} onAssignmentsChange={handleAssignmentsChange} />
                                        <DeleteTrainingDialog trainingId={training.id} trainingTitle={training.title} />
                                    </div>
                                </Card>
                            )})}
                         </div>

                        <Table className="hidden md:table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Responsable</TableHead>
                                    <TableHead>Fecha Prevista</TableHead>
                                    <TableHead>Completados</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(filteredTrainings || []).map((training) => {
                                    const completedCount = assignments.filter(a => a.trainingId === training.id && a.status === 'completed').length;
                                    const totalAssignments = assignments.filter(a => a.trainingId === training.id).length;
                                    return (
                                        <TableRow key={training.id}>
                                            <TableCell className="font-medium">{training.title}</TableCell>
                                            <TableCell>{training.trainerName}</TableCell>
                                            <TableCell>
                                                {training.scheduledDate ? format(new Date(training.scheduledDate), 'PPP') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>{completedCount} / {totalAssignments}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  <Button variant="outline" size="sm" onClick={() => setSelectedTrainingToEdit(training)}>
                                                      <Pencil className="mr-2 h-3 w-3"/>Editar
                                                  </Button>
                                                  <AssignTrainingDialog training={training} users={initialUsers} onAssignmentsChange={handleAssignmentsChange} />
                                                  <DeleteTrainingDialog trainingId={training.id} trainingTitle={training.title} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                         {filteredTrainings.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No se encontraron capacitaciones con los filtros aplicados.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Crear Nueva Capacitación</CardTitle>
                        <CardDescription>Crea un nuevo documento en tu colección 'trainings'.</CardDescription>
                    </CardHeader>
                    <form action={createTrainingAction} ref={createTrainingFormRef}>
                        <CardContent className="space-y-4">
                             {createTrainingState?.message && !createTrainingState.success && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{createTrainingState.message}</AlertDescription>
                                </Alert>
                             )}
                             {createTrainingState?.success && (
                                <Alert variant="default" className="bg-green-100 dark:bg-green-900">
                                    <Check className="h-4 w-4" />
                                    <AlertTitle>Éxito</AlertTitle>
                                    <AlertDescription>{createTrainingState.message}</AlertDescription>
                                </Alert>
                             )}
                            <div className="space-y-2">
                                <Label htmlFor="title">Título</Label>
                                <Input id="title" name="title" required />
                                {createTrainingState?.errors?.title && <p className="text-sm text-destructive">{createTrainingState.errors.title[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción</Label>
                                <Textarea 
                                  id="description" 
                                  name="description" 
                                  required 
                                />
                                {createTrainingState?.errors?.description && <p className="text-sm text-destructive">{createTrainingState.errors.description[0]}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="trainerName">Responsable</Label>
                                <Select name="trainerName">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar responsable" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Tercero">Tercero (Contratista)</SelectItem>
                                        {leadershipUsers.map(user => (
                                            <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createTrainingState?.errors?.trainerName && <p className="text-sm text-destructive">{createTrainingState.errors.trainerName[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scheduledDate">Fecha Prevista</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !scheduledDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {scheduledDate ? format(scheduledDate, "PPP") : <span>Elegir fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={scheduledDate}
                                            onSelect={setScheduledDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <input type="hidden" name="scheduledDate" value={scheduledDate ? scheduledDate.toISOString() : ''} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="duration">Duración (minutos)</Label>
                                <Input id="duration" name="duration" type="number" required />
                                {createTrainingState?.errors?.duration && <p className="text-sm text-destructive">{createTrainingState.errors.duration[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Select name="category">
                                    <SelectTrigger id="category-trigger"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {TRAINING_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 {createTrainingState?.errors?.category && <p className="text-sm text-destructive">{createTrainingState.errors.category[0]}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="urgency">Urgencia</Label>
                                <Select name="urgency" defaultValue="medium">
                                    <SelectTrigger id="urgency"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baja</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                                 {createTrainingState?.errors?.urgency && <p className="text-sm text-destructive">{createTrainingState.errors.urgency[0]}</p>}
                            </div>
                             <div className="flex items-center justify-between">
                                <SubmitButton className="w-full"><FilePlus2 className="mr-2" /> Crear Capacitación</SubmitButton>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </div>
      </TabsContent>
      {isTrainer && (
        <TabsContent value="trainer-panel">
            <div className="mt-4">
                <TrainerDashboardClient initialTrainings={trainerTrainings} />
            </div>
        </TabsContent>
      )}
      {isRRHH && (
        <TabsContent value="rrhh-supervision">
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Briefcase className="mr-2" />
                        Supervisión Global de Capacitaciones (RRHH)
                    </CardTitle>
                    <CardDescription>
                        Visualiza todas las capacitaciones y gestiona el progreso de todos los participantes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TrainerDashboardClient initialTrainings={allPopulatedTrainings} />
                </CardContent>
            </Card>
        </TabsContent>
       )}
       <TabsContent value="reports">
        <ReportDashboard users={initialUsers} trainings={trainings} assignments={allAssignments} />
      </TabsContent>
      {canSeeDataExplorer && (
        <TabsContent value="data-explorer">
          <Card className="mt-4">
              <CardHeader>
                  <CardTitle className="flex items-center">
                      <Database className="mr-2" />
                      Explorador de Datos Crudos de Firestore
                  </CardTitle>
                  <CardDescription>
                      Aquí puedes ver los datos exactos que están en tus colecciones de Firestore. 
                      Si una colección está vacía, es porque aún no se ha creado ningún documento en ella.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div>
                      <h3 className="text-lg font-semibold mb-2">Colección: 'users'</h3>
                      <ScrollArea className="h-72 w-full rounded-md border p-4 bg-muted/50">
                          <pre className="text-sm">
                              {JSON.stringify(initialUsers, null, 2)}
                          </pre>
                      </ScrollArea>
                  </div>
                  <div>
                      <h3 className="text-lg font-semibold mb-2">Colección: 'trainings'</h3>
                      <ScrollArea className="h-72 w-full rounded-md border p-4 bg-muted/50">
                          <pre className="text-sm">
                              {JSON.stringify(initialTrainings, null, 2)}
                          </pre>
                      </ScrollArea>
                  </div>
                  <div>
                      <h3 className="text-lg font-semibold mb-2">Colección: 'assignments'</h3>
                      <ScrollArea className="h-72 w-full rounded-md border p-4 bg-muted/  ৫০">
                          <pre className="text-sm">
                              {JSON.stringify(allAssignments, null, 2)}
                          </pre>
                      </ScrollArea>
                  </div>
              </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>

    {selectedUser && (
        <UserTrainingDetailsDialog
            user={selectedUser}
            assignments={userAssignments(selectedUser.id)}
            onOpenChange={() => setSelectedUser(null)}
            onAssignmentStatusChange={handleAssignmentStatusChange}
        />
    )}

    {selectedTrainingToEdit && (
        <EditTrainingDialog 
            training={selectedTrainingToEdit}
            leadershipUsers={leadershipUsers}
            isOpen={!!selectedTrainingToEdit}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedTrainingToEdit(null);
                }
            }}
        />
    )}
    </>
  );
}
