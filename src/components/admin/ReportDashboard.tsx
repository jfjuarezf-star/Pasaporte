
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, Users, Clock, AlertTriangle, CheckCircle, Calendar, CalendarX, BookOpen } from 'lucide-react';
import { subMonths, isBefore, startOfDay, getMonth, getYear, setMonth, setYear, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User, Training, Assignment, TrainingCategory } from '@/lib/types';
import { CSVLink } from 'react-csv';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface ReportDashboardProps {
  users: User[];
  trainings: Training[];
  assignments: Assignment[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't render label if slice is too small

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};


const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), 'MMMM', { locale: es }),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => getYear(new Date()) - 5 + i).reverse();


export function ReportDashboard({ users, trainings, assignments }: ReportDashboardProps) {
  const [timeFilter, setTimeFilter] = useState('all');
  const [reportMonth, setReportMonth] = useState(getMonth(new Date()));
  const [reportYear, setReportYear] = useState(getYear(new Date()));

  const {
    totalUsers,
    overdueTrainings,
    categoryCompletionData
  } = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    // Calculate Overdue Trainings
    const trainingsMap = new Map(trainings.map(t => [t.id, t]));
    const overdueTrainingsMap = new Map<string, { training: Training, pendingCount: number, assignment: Assignment }>();

    assignments.forEach(assignment => {
      if (assignment.status === 'pending') {
        const training = trainingsMap.get(assignment.trainingId);
        if (training && assignment.scheduledDate && isBefore(new Date(assignment.scheduledDate), today)) {
          const key = `${training.id}-${assignment.scheduledDate}`;
          if (!overdueTrainingsMap.has(key)) {
            overdueTrainingsMap.set(key, { training, pendingCount: 0, assignment });
          }
          overdueTrainingsMap.get(key)!.pendingCount++;
        }
      }
    });

    // Calculate progress by category
    const categoryStats: { [key in TrainingCategory]?: { total: number, completed: number } } = {};

    assignments.forEach(assignment => {
      const training = trainingsMap.get(assignment.trainingId);
      if (training) {
        if (!categoryStats[training.category]) {
          categoryStats[training.category] = { total: 0, completed: 0 };
        }
        categoryStats[training.category]!.total++;
        if (assignment.status === 'completed') {
          categoryStats[training.category]!.completed++;
        }
      }
    });

    const categoryCompletionData = Object.entries(categoryStats).map(([name, stats]) => ({
      name: name as TrainingCategory,
      progress: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    }));


    return {
      totalUsers: users.length,
      overdueTrainings: Array.from(overdueTrainingsMap.values()),
      categoryCompletionData
    };
  }, [assignments, trainings, users]);
  
  const scheduledTrainingsThisMonth = useMemo(() => {
    const trainingsMap = new Map(trainings.map(t => [t.id, t]));
    return assignments.filter(a => {
      if (!a.scheduledDate) return false;
      const scheduled = new Date(a.scheduledDate);
      return getMonth(scheduled) === reportMonth && getYear(scheduled) === reportYear;
    }).map(a => ({...a, training: trainingsMap.get(a.trainingId)}))
    .filter(a => !!a.training)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }, [assignments, trainings, reportMonth, reportYear]);
  
  const kpiData = useMemo(() => {
    const trainedUserIds = new Set(assignments.filter(a => a.status === 'completed').map(a => a.userId));
    const totalDurationMinutes = trainings.reduce((acc, t) => acc + (t.duration || 0), 0);
    
    const completedCount = assignments.filter(a => a.status === 'completed').length;

    return {
      totalUsersTrained: trainedUserIds.size,
      percentageUsersTrained: totalUsers > 0 ? (trainedUserIds.size / totalUsers) * 100 : 0,
      totalHours: totalDurationMinutes / 60,
      overdueCount: overdueTrainings.length,
      completedCount,
    };
  }, [assignments, trainings, totalUsers, overdueTrainings]);

  const csvData = useMemo(() => {
     if (!users.length || !trainings.length || !assignments.length) return [];
    
    const trainingsMap = new Map(trainings.map(t => [t.id, t]));

    return users.flatMap(user => {
      const userAssignments = assignments.filter(a => a.userId === user.id);
      if (userAssignments.length === 0) {
        return [{
          userName: user.name, userEmail: user.email, trainingTitle: 'N/A', category: 'N/A', trainerName: 'N/A',
          status: 'Sin asignaciones', assignedDate: 'N/A', completionDate: 'N/A', scheduledDate: 'N/A',
        }];
      }
      return userAssignments.map(assignment => {
        const training = trainingsMap.get(assignment.trainingId);
        return {
          userName: user.name, userEmail: user.email,
          trainingTitle: training?.title || 'N/A', category: training?.category || 'N/A',
          trainerName: training?.trainerName || 'N/A',
          status: assignment.status === 'completed' ? 'Completado' : 'Pendiente',
          assignedDate: assignment.assignedDate ? format(new Date(assignment.assignedDate), 'yyyy-MM-dd') : 'N/A',
          completionDate: assignment.completedDate ? format(new Date(assignment.completedDate), 'yyyy-MM-dd') : 'N/A',
          scheduledDate: assignment.scheduledDate ? format(new Date(assignment.scheduledDate), 'yyyy-MM-dd') : 'N/A',
        };
      });
    });
  }, [users, trainings, assignments]);

  const csvHeaders = [
    { label: "Nombre Usuario", key: "userName" }, 
    { label: "Email Usuario", key: "userEmail" },
    { label: "Capacitación", key: "trainingTitle" }, 
    { label: "Categoría", key: "category" },
    { label: "Responsable", key: "trainerName" },
    { label: "Estado", key: "status" }, 
    { label: "Fecha de Asignación", key: "assignedDate" },
    { label: "Fecha de Finalización", key: "completionDate" },
    { label: "Fecha Programada", key: "scheduledDate" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Dashboard de Reportes</CardTitle>
                <CardDescription>Analiza el estado de las capacitaciones.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                 <CSVLink
                    data={csvData}
                    headers={csvHeaders}
                    filename={`reporte_capacitaciones_${format(new Date(), 'yyyy-MM-dd')}.csv`}
                    className="w-full"
                >
                    <Button variant="outline" disabled={csvData.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                    </Button>
                </CSVLink>
            </div>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Capacitados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalUsersTrained} / {totalUsers}</div>
            <p className="text-xs text-muted-foreground">{kpiData.percentageUsersTrained.toFixed(1)}% de la plantilla</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas de Formación</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Total de horas en el histórico</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asignaciones Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{kpiData.completedCount}</div>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacitaciones Atrasadas</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Asignaciones pendientes y fuera de fecha</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-1">
         <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-destructive" />
                  Alerta: Asignaciones Atrasadas
              </CardTitle>
              <CardDescription>
                  Estas asignaciones han superado su fecha programada y siguen pendientes.
              </CardDescription>
          </CardHeader>
          <CardContent>
              {overdueTrainings.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Capacitación</TableHead>
                              <TableHead>Responsable</TableHead>
                              <TableHead>Fecha Programada</TableHead>
                              <TableHead className="text-center">Participantes Pendientes</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {overdueTrainings.map(({ training, pendingCount, assignment }) => (
                              <TableRow key={assignment.id} className="bg-destructive/10">
                                  <TableCell className="font-medium">{training.title}</TableCell>
                                  <TableCell>{training.trainerName}</TableCell>
                                  <TableCell>{format(new Date(assignment.scheduledDate!), 'PPP', { locale: es })}</TableCell>
                                  <TableCell className="text-center font-bold text-lg">{pendingCount}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                  <div className="text-center py-8">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                      <p className="mt-4 text-muted-foreground">¡Excelente! No hay asignaciones atrasadas.</p>
                  </div>
              )}
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progreso por Categoría</CardTitle>
             <CardDescription>
                  Porcentaje de finalización para todas las asignaciones en cada categoría.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryCompletionData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value) => `${(value as number).toFixed(1)}% completado`} />
                <Legend />
                <Bar dataKey="progress" fill="#0088FE" name="Progreso" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Asignaciones</CardTitle>
             <CardDescription>
                  Estado general de todas las asignaciones (completadas vs. pendientes).
              </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie 
                  data={[{name: 'Completadas', value: kpiData.completedCount}, {name: 'Pendientes', value: assignments.length - kpiData.completedCount}]} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={120} 
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  <Cell fill="#00C49F" />
                  <Cell fill="#FFBB28" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 md:grid-cols-1">
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Planificador Mensual de Capacitaciones</CardTitle>
                        <CardDescription>Eventos con fecha prevista para el período seleccionado.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(Number(v))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {scheduledTrainingsThisMonth.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Capacitación</TableHead>
                                <TableHead>Responsable</TableHead>
                                <TableHead>Categoría</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduledTrainingsThisMonth.map(assignment => (
                                <TableRow key={assignment.id}>
                                    <TableCell>{format(new Date(assignment.scheduledDate!), 'PPP', { locale: es })}</TableCell>
                                    <TableCell>{assignment.training!.title}</TableCell>
                                    <TableCell>{assignment.training!.trainerName}</TableCell>
                                    <TableCell><div className='text-left'><span className='px-2 py-1 text-xs rounded-full border bg-muted'>{assignment.training!.category}</span></div></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-8">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">No hay capacitaciones programadas para este mes.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
