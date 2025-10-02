
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
import { es } from 'date-fns/locale/es';
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
        <p className="font-bold label">{label}</p>
        <p className="text-blue-500">{`Capacitaciones: ${payload[0].value}`}</p>
        <p className="text-green-500">{`Duración (horas): ${(payload[1].value / 60).toFixed(1)}`}</p>
      </div>
    );
  }
  return null;
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
    filteredAssignments,
    filteredTrainings,
    totalUsers,
  } = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    if (timeFilter !== 'all') {
      startDate = subMonths(now, parseInt(timeFilter));
    }

    const relevantAssignments = startDate
      ? assignments.filter(a => a.assignedDate && new Date(a.assignedDate) >= startDate!)
      : assignments;

    const trainingIds = new Set(relevantAssignments.map(a => a.trainingId));
    const relevantTrainings = trainings.filter(t => trainingIds.has(t.id));

    return {
      filteredAssignments: relevantAssignments,
      filteredTrainings: relevantTrainings,
      totalUsers: users.length,
    };
  }, [assignments, trainings, users, timeFilter]);
  
  const scheduledTrainingsThisMonth = useMemo(() => {
    return trainings.filter(t => {
      if (!t.scheduledDate) return false;
      const scheduled = new Date(t.scheduledDate);
      return getMonth(scheduled) === reportMonth && getYear(scheduled) === reportYear;
    }).sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }, [trainings, reportMonth, reportYear]);

  const categoryData = useMemo(() => {
    const data: { [key in TrainingCategory]?: { count: number, duration: number } } = {};

    filteredTrainings.forEach(training => {
      if (!data[training.category]) {
        data[training.category] = { count: 0, duration: 0 };
      }
      data[training.category]!.count += 1;
      data[training.category]!.duration += training.duration || 0;
    });
    
    return Object.entries(data).map(([name, values]) => ({ name: name as TrainingCategory, ...values }));
  }, [filteredTrainings]);
  
  const statusData = useMemo(() => {
    const today = startOfDay(new Date());
    let pending = 0;
    let completed = 0;
    let overdue = 0;

    filteredAssignments.forEach(assignment => {
      const training = trainings.find(t => t.id === assignment.trainingId);
      if (assignment.status === 'completed') {
        completed++;
      } else {
        pending++;
        if (training?.scheduledDate && isBefore(new Date(training.scheduledDate), today)) {
          overdue++;
        }
      }
    });

    return [
      { name: 'Completado', value: completed, fill: '#00C49F' },
      { name: 'Pendiente', value: pending, fill: '#FFBB28' },
      { name: 'Atrasado', value: overdue, fill: '#FF8042' },
    ];
  }, [filteredAssignments, trainings]);

  const kpiData = useMemo(() => {
    const trainedUserIds = new Set(filteredAssignments.filter(a => a.status === 'completed').map(a => a.userId));
    const totalDurationMinutes = filteredTrainings.reduce((acc, t) => acc + (t.duration || 0), 0);
    
    const overdueCount = statusData.find(s => s.name === 'Atrasado')?.value || 0;
    const completedCount = statusData.find(s => s.name === 'Completado')?.value || 0;

    return {
      totalUsersTrained: trainedUserIds.size,
      percentageUsersTrained: totalUsers > 0 ? (trainedUserIds.size / totalUsers) * 100 : 0,
      totalHours: totalDurationMinutes / 60,
      overdueCount,
      completedCount,
    };
  }, [filteredAssignments, filteredTrainings, totalUsers, statusData]);

  const csvData = useMemo(() => {
     if (!users.length || !trainings.length || !assignments.length) return [];
    
    const trainingsMap = new Map(trainings.map(t => [t.id, t]));

    return users.flatMap(user => {
      const userAssignments = assignments.filter(a => a.userId === user.id);
      if (userAssignments.length === 0) {
        return [{
          userName: user.name, userEmail: user.email, trainingTitle: 'N/A', category: 'N/A',
          status: 'Sin asignaciones', assignedDate: 'N/A', completionDate: 'N/A',
        }];
      }
      return userAssignments.map(assignment => {
        const training = trainingsMap.get(assignment.trainingId);
        return {
          userName: user.name, userEmail: user.email,
          trainingTitle: training?.title || 'N/A', category: training?.category || 'N/A',
          status: assignment.status === 'completed' ? 'Completado' : 'Pendiente',
          assignedDate: assignment.assignedDate ? format(new Date(assignment.assignedDate), 'yyyy-MM-dd') : 'N/A',
          completionDate: assignment.completedDate ? format(new Date(assignment.completedDate), 'yyyy-MM-dd') : 'N/A',
        };
      });
    });
  }, [users, trainings, assignments]);

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
                    headers={[
                        { label: "Nombre Usuario", key: "userName" }, { label: "Email Usuario", key: "userEmail" },
                        { label: "Capacitación", key: "trainingTitle" }, { label: "Categoría", key: "category" },
                        { label: "Estado", key: "status" }, { label: "Fecha de Asignación", key: "assignedDate" },
                        { label: "Fecha de Finalización", key: "completionDate" },
                    ]}
                    filename={`reporte_capacitaciones_${format(new Date(), 'yyyy-MM-dd')}.csv`}
                    className="w-full"
                >
                    <Button variant="outline" disabled={csvData.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                    </Button>
                </CSVLink>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por tiempo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todo el tiempo</SelectItem>
                        <SelectItem value="1">Último mes</SelectItem>
                        <SelectItem value="3">Últimos 3 meses</SelectItem>
                        <SelectItem value="6">Últimos 6 meses</SelectItem>
                        <SelectItem value="12">Último año</SelectItem>
                    </SelectContent>
                </Select>
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
            <p className="text-xs text-muted-foreground">Total de horas en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacitaciones Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{kpiData.completedCount}</div>
            <p className="text-xs text-muted-foreground">Total en el período</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacitaciones Atrasadas</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Pendientes y fuera de fecha</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Capacitaciones Programadas</CardTitle>
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
                            {scheduledTrainingsThisMonth.map(training => (
                                <TableRow key={training.id}>
                                    <TableCell>{format(new Date(training.scheduledDate!), 'PPP', { locale: es })}</TableCell>
                                    <TableCell>{training.title}</TableCell>
                                    <TableCell>{training.trainerName}</TableCell>
                                    <TableCell><div className='text-left'><span className='px-2 py-1 text-xs rounded-full border bg-muted'>{training.category}</span></div></TableCell>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Capacitaciones y Duración por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis yAxisId="left" orientation="left" stroke="#0088FE" label={{ value: 'Nº Cursos', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#00C49F" label={{ value: 'Horas', angle: -90, position: 'insideRight' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#0088FE" name="Nº Cursos" />
                <Bar yAxisId="right" dataKey="duration" fill="#00C49F" name="Duración (mins)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Estado General de Asignaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
