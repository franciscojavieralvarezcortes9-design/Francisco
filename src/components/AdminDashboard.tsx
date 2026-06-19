import React, { useState, useEffect } from 'react';
import { Booking, AdminStats, ChartDataPoint, ServiceCount, CustomerStats, WaitlistEntry, BlockedHour } from '../types';
import { BARBER_SERVICES } from '../servicesData';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { 
  Users, Check, X, Clock, RefreshCw, LogOut, Sparkles, Phone, MessageSquare, 
  Briefcase, CalendarClock, ShieldCheck, ShieldAlert, Brain, Trash2, Calendar, 
  UserPlus, Mail, Coffee, Award, DollarSign, TrendingUp, TrendingDown, ClipboardList,
  ChevronRight, ShoppingBag, PlusCircle, CreditCard, Lock, CheckCircle2, UserCheck, Printer
} from 'lucide-react';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

interface BarberPerformance {
  id: string;
  name: string;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  earnings: number;
  topService: string;
}

interface DailyClosure {
  servicesCompletedToday: number;
  totalEarningsToday: number;
  salesEarningsToday: number;
  servicesEarningsToday: number;
  cancellationsToday: number;
  peakHourToday: string;
  barberTodayEarnings: { name: string; earnings: number }[];
}

export default function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  // Navigation Tabs: 'agenda' | 'calendar' | 'customers' | 'blocking' | 'waitlist' | 'pos' | 'ai-insights'
  const [activeTab, setActiveTab] = useState<'agenda' | 'calendar' | 'customers' | 'blocking' | 'waitlist' | 'pos' | 'ai-insights'>('agenda');
  
  // Dynamic collections
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<any>({
    today: 0,
    yesterday: 0,
    week: 0,
    month: 0,
    lastMonth: 0,
    blockedCount: 0,
    waitlistCount: 0,
    totalEarningsToday: 0,
    servicesEarningsToday: 0,
    salesEarningsToday: 0,
    averageServicePriceToday: 0,
    monthUniqueClients: 0,
    cancellationRate: 0
  });

  const [chartMonths, setChartMonths] = useState<any[]>([]);
  const [chartServices, setChartServices] = useState<any[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);
  const [barberPerformance, setBarberPerformance] = useState<BarberPerformance[]>([]);
  const [dailyClosure, setDailyClosure] = useState<DailyClosure | null>(null);

  // Tab details
  const [customersReport, setCustomersReport] = useState<CustomerStats[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedHour[]>([]);
  const [salesToday, setSalesToday] = useState<any[]>([]);

  // Notes state
  const [activeClientNotePhone, setActiveClientNotePhone] = useState<string | null>(null);
  const [clientNoteContent, setClientNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Manual booking states
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState('corte-fade');
  const [manualBarberId, setManualBarberId] = useState('emmanuel');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualComments, setManualComments] = useState('');
  const [manualStatus, setManualStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');

  // POS Store State
  const [posItemName, setPosItemName] = useState('');
  const [posAmount, setPosAmount] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [recordingProductSale, setRecordingProductSale] = useState(false);

  // Block agenda states
  const [blockBarberId, setBlockBarberId] = useState('emmanuel');
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // AI insights states
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiWarning, setAiWarning] = useState('');

  // End of day report
  const [showClosureModal, setShowClosureModal] = useState(false);

  // Search & Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'canceled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // LocalStorage Backup States
  const [localStats, setLocalStats] = useState({
    hoy: 0,
    semana: 0,
    mes: 0,
    ano: 0,
    ultimaActualizacion: '--:--'
  });
  const [localHoyReservas, setLocalHoyReservas] = useState<any[]>([]);

  const cargarEstadisticasLocalStorage = () => {
    try {
      const reservas = JSON.parse(localStorage.getItem('reservas_rojas_barber') || '[]');
      
      const hoy = new Date().toISOString().split('T')[0];
      const hace7dias = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
      const mesActual = hoy.substring(0, 7);
      const anoActual = hoy.substring(0, 4);
      
      const reservasHoy = reservas.filter((r: any) => r.fecha === hoy).length;
      const reservasSemana = reservas.filter((r: any) => r.fecha >= hace7dias).length;
      const reservasMes = reservas.filter((r: any) => r.fecha?.startsWith(mesActual)).length;
      const reservasAno = reservas.filter((r: any) => r.fecha?.startsWith(anoActual)).length;
      const ultAct = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      
      setLocalStats({
        hoy: reservasHoy,
        semana: reservasSemana,
        mes: reservasMes,
        ano: reservasAno,
        ultimaActualizacion: ultAct
      });
      
      const hoyReservas = reservas.filter((r: any) => r.fecha === hoy);
      setLocalHoyReservas(hoyReservas);
    } catch (err) {
      console.error('Error loading localStorage statistics:', err);
    }
  };

  const limpiarDatosLocalStorage = () => {
    if (confirm('¿Estás seguro? Se borrarán todas las reservas.')) {
      localStorage.removeItem('reservas_rojas_barber');
      cargarEstadisticasLocalStorage();
      alert('✅ Datos de reservas locales eliminados');
    }
  };

  useEffect(() => {
    cargarEstadisticasLocalStorage();
    const intervalLocalStorage = setInterval(cargarEstadisticasLocalStorage, 10000);
    return () => clearInterval(intervalLocalStorage);
  }, []);

  // Constant list of barbers
  const BARBERS = [
    { id: 'emmanuel', name: 'Emmanuel Rojas' }
  ];

  // List of pre-configured products
  const STORE_PRODUCTS = [
    { name: 'Pomada Pomade Imperial Premium', price: 12000 },
    { name: 'Aceite Orgánico Barba Premium', price: 10000 },
    { name: 'Mascarilla Carbón Activo Peel-Off', price: 6500 },
    { name: 'Cera Fijadora Mate Fuerte', price: 11000 },
    { name: 'Champú Anticaspa de Autor', price: 14000 }
  ];

  // List of professional 30-min times
  const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  // Sincronizar suite core metrics - Optimizado con llamadas en paralelo (Promise.all) para máxima velocidad
  const fetchCoreData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Lanzar ambas solicitudes HTTP de forma concurrente para evitar cuellos de botella por latencia de red sequential
      const [bkResp, stResp] = await Promise.all([
        fetch('/api/admin/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!bkResp.ok) throw new Error('Error al sincronizar listado de reservas.');
      if (!stResp.ok) throw new Error('El servidor no pudo procesar los consolidados.');

      // Parsear las respuestas JSON en paralelo
      const [bkData, stData] = await Promise.all([
        bkResp.json(),
        stResp.json()
      ]);

      setBookings(bkData);
      setStats(stData.stats);
      setChartMonths(stData.chartMonths);
      setChartServices(stData.chartServices);
      setHourlyDistribution(stData.hourlyDistribution);
      setBarberPerformance(stData.barberPerformance);
      setDailyClosure(stData.dailyClosure);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error de sincronización con Rojas Barber DB.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch product sales list
  const fetchSalesToday = async () => {
    try {
      const resp = await fetch('/api/admin/sales', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const list = await resp.json();
        setSalesToday(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manage client report
  const fetchCustomersReport = async () => {
    try {
      const resp = await fetch('/api/admin/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setCustomersReport(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sincronizar waitlist
  const fetchWaitlist = async () => {
    try {
      const resp = await fetch('/api/admin/waitlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setWaitlistEntries(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sincronizar blocked slots
  const fetchBlockedSlots = async () => {
    try {
      const resp = await fetch('/api/admin/blocked-hours', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setBlockedSlots(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    // Cargar los datos núcleo inmediatamente en paralelo de forma visible para una velocidad y carga instantánea
    fetchCoreData(false);
    
    // Set up real-time listener for reservations in Firestore
    const q = query(collection(db, 'reservas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Refresh statistics silently when any booking/status changes in Firestore
      const timeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      setLastUpdatedTime(timeStr);
      fetchCoreData(true);
    }, (error) => {
      console.error("Firestore onSnapshot subscription error:", error);
    });

    // Redundant automatic statistics polling every 30 seconds to ensure stats are fresh
    const interval = setInterval(() => {
      fetchCoreData(true);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [token]);

  // Tab dynamic loaders
  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomersReport();
    } else if (activeTab === 'waitlist') {
      fetchWaitlist();
    } else if (activeTab === 'blocking') {
      fetchBlockedSlots();
    } else if (activeTab === 'pos') {
      fetchSalesToday();
    }
  }, [activeTab]);

  // Status transitions
  const handleUpdateStatusAndPayment = async (bookingId: number, nextStatus: string, paymentMethod?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload: any = { status: nextStatus };
      if (paymentMethod) {
        payload.paymentMethod = paymentMethod;
      }
      
      const resp = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error || 'Fallo de actualización de estado.');
      }

      // Also persist and sync immediately to Firestore
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      if (bookingToUpdate) {
        const clave = `${bookingToUpdate.date}_${bookingToUpdate.time.replace(':', '-')}`;
        const docRef = doc(db, 'reservas', clave);
        
        let firestoreStatus = nextStatus;
        if (nextStatus === 'pending') firestoreStatus = 'pendiente';
        else if (nextStatus === 'confirmed') firestoreStatus = 'confirmada';
        else if (nextStatus === 'in_progress') firestoreStatus = 'en proceso';
        else if (nextStatus === 'completed') firestoreStatus = 'finalizada';
        else if (nextStatus === 'canceled') firestoreStatus = 'cancelada';

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { estado: firestoreStatus });
        } else {
          await setDoc(docRef, {
            cliente: bookingToUpdate.name,
            telefono: bookingToUpdate.phone,
            servicio: bookingToUpdate.serviceName,
            fecha: bookingToUpdate.date,
            hora: bookingToUpdate.time,
            barbero: bookingToUpdate.barberName,
            estado: firestoreStatus,
            timestamp: serverTimestamp(),
            fuente: 'web'
          });
        }
      }

      setSuccessMsg('Turno actualizado con éxito en tiempo real.');
      fetchCoreData(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión.');
    }
  };

  // Client notes synchronization
  const handleOpenClientNotes = async (phone: string) => {
    setActiveClientNotePhone(phone);
    setClientNoteContent('');
    try {
      const resp = await fetch(`/api/admin/client-notes/${phone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const d = await resp.json();
        setClientNoteContent(d.notes || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveClientNotes = async () => {
    if (!activeClientNotePhone) return;
    setSavingNote(true);
    try {
      const resp = await fetch('/api/admin/client-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: activeClientNotePhone,
          notes: clientNoteContent
        })
      });
      if (resp.ok) {
        setSuccessMsg('Ficha capilar de barbero guardada.');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchCustomersReport();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
      setActiveClientNotePhone(null);
    }
  };

  // Manual Reservation Posting
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualPhone || !manualDate || !manualTime) {
      alert('Por favor complete todos los datos del cliente, fecha y hora.');
      return;
    }

    try {
      const serviceObj = BARBER_SERVICES.find(s => s.id === manualServiceId);
      const serviceName = serviceObj ? serviceObj.name : manualServiceId;

      const barberObj = BARBERS.find(b => b.id === manualBarberId);
      const barberName = barberObj ? barberObj.name : manualBarberId;

      let firestoreStatus = 'pendiente';
      if (manualStatus === 'confirmed') firestoreStatus = 'confirmada';

      const clave = `${manualDate}_${manualTime.replace(':', '-')}`;
      
      // Save directly to Firestore for full real-time notification loop
      await setDoc(doc(db, "reservas", clave), {
        cliente: manualName,
        telefono: manualPhone,
        servicio: serviceName,
        fecha: manualDate,
        hora: manualTime,
        barbero: barberName,
        estado: firestoreStatus,
        timestamp: serverTimestamp(),
        fuente: 'admin'
      });

      const resp = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: manualName,
          phone: manualPhone,
          serviceId: manualServiceId,
          date: manualDate,
          time: manualTime,
          comments: manualComments,
          status: manualStatus,
          barberId: manualBarberId,
          paymentMethod: manualPaymentMethod
        })
      });

      if (!resp.ok) {
        const bodyStr = await resp.json();
        throw new Error(bodyStr.error || 'El horario ya está ocupado o suspendido.');
      }

      setSuccessMsg('Cita manual registrada y bloqueada en el calendario.');
      setShowManualModal(false);
      // Clean up fields
      setManualName('');
      setManualPhone('');
      setManualComments('');
      fetchCoreData(true);
    } catch (err: any) {
      alert(`No se pudo guardar la cita manual: ${err.message}`);
    }
  };

  // Product sales cashier recording
  const handleRecordPosSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posItemName || !posAmount) {
      alert('Debe seleccionar/ingresar el nombre del producto y el monto.');
      return;
    }

    setRecordingProductSale(true);
    try {
      const resp = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemName: posItemName,
          amount: parseInt(posAmount),
          paymentMethod: posPaymentMethod
        })
      });

      if (resp.ok) {
        setSuccessMsg('Venta de vitrina guardada en la caja chica de hoy.');
        setPosItemName('');
        setPosAmount('');
        fetchSalesToday();
        fetchCoreData(true);
      } else {
        const data = await resp.json();
        alert(data.error || 'Fracaso registrar venta física.');
      }
    } catch (e: any) {
      alert(e.message || 'Error al conectar con la registrar.');
    } finally {
      setRecordingProductSale(false);
    }
  };

  // Block creation
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || !blockTime) {
      alert('Por favor define la fecha y hora a bloquear.');
      return;
    }

    try {
      const resp = await fetch('/api/admin/blocked-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          barberId: blockBarberId,
          date: blockDate,
          time: blockTime,
          reason: blockReason.trim()
        })
      });

      if (!resp.ok) throw new Error('Establecer bloqueo rechazado.');
      
      setSuccessMsg('Horario bloqueado con éxito.');
      setBlockReason('');
      setBlockTime('');
      fetchBlockedSlots();
      fetchCoreData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove block
  const handleDeleteBlock = async (id: number) => {
    if (!confirm('¿Deseas habilitar esta hora desactivando el bloqueo?')) return;
    try {
      const resp = await fetch(`/api/admin/blocked-hours/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Error al liberar horario bloqueado.');
      setSuccessMsg('Horario liberado con éxito.');
      fetchBlockedSlots();
      fetchCoreData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // AI analysis triggers
  const triggerAIAnalysis = async () => {
    setAiLoading(true);
    setErrorMsg('');
    setAiWarning('');
    try {
      const resp = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      setAiInsights(data.insights || []);
      if (data.warning) {
        setAiWarning(data.warning);
      }
    } catch (err: any) {
      setErrorMsg('Error de conexión neuronal con Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  // Helper calculations for comparisons
  const calculateChangeInPercent = (curr: number, prev: number) => {
    if (!prev || prev === 0) return curr > 0 ? '+100%' : '0%';
    const pct = ((curr - prev) / prev) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  };

  // Filter schedules
  const filteredBookings = bookings.filter(b => {
    const statusMatches = statusFilter === 'all' || b.status === statusFilter;
    const barberMatches = selectedBarberFilter === 'all' || b.barberId === selectedBarberFilter;
    
    // Search elements
    const term = searchTerm.toLowerCase();
    const txtMatches = 
      b.name.toLowerCase().includes(term) ||
      b.phone.includes(term) ||
      b.serviceName.toLowerCase().includes(term) ||
      b.barberName.toLowerCase().includes(term);

    return statusMatches && barberMatches && txtMatches;
  });

  const COLORS = ['#d4af37', '#b8921e', '#10b981', '#3b82f6', '#f43f5e'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-transparent" id="dashboard-loading">
        <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-white/80 uppercase tracking-widest font-mono">ROJAS BARBER RANCAGUA</p>
        <p className="text-xs text-white/40 mt-1">Computando analíticas de negocio en tiempo real...</p>
      </div>
    );
  }

  // POS payment breakdown
  const posSalesByMethod = salesToday.reduce((acc: any, curr: any) => {
    acc[curr.payment_method] = (acc[curr.payment_method] || 0) + curr.amount;
    acc.total = (acc.total || 0) + curr.amount;
    return acc;
  }, { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 });

  // Finished bookings breakdown
  const bookingsEarningsByMethod = bookings
    .filter(b => b.status === 'completed' && b.date === bookings[0]?.date) // filter to today's date if matches
    .reduce((acc: any, curr: any) => {
      acc[curr.payment_method || 'efectivo'] = (acc[curr.payment_method || 'efectivo'] || 0) + (curr.price || 12000);
      acc.total = (acc.total || 0) + (curr.price || 12000);
      return acc;
    }, { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 });

  return (
    <div className="space-y-8 animate-fade-in" id="admin-dashboard-root">
      
      {/* ======================== CONTROL SUITE HEADER ======================== */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6" id="dashboard-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-display italic text-white leading-none">Rojas Barber Control Panel</h1>
            <span className="px-2.5 py-0.5 text-[9px] uppercase font-bold bg-amber-500/10 text-amber-400 rounded-full font-mono border border-amber-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> MÓDULO EMMANUEL ROJAS
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1.5 font-sans flex items-center flex-wrap gap-x-2">
            <span>Rancagua, José Domingo Mujica 385</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              🟢 En vivo · Actualizado a las {lastUpdatedTime || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>•</span>
            <span>Caja Chica, POS de Vitrina y Calendario de Especialistas.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="p-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-black rounded-lg transition flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            Turno Manual (Teléfono)
          </button>

          <button
            onClick={() => setShowClosureModal(true)}
            className="p-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            Cierre de Caja
          </button>

          <button
            onClick={() => fetchCoreData(true)}
            disabled={refreshing}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          
          <button
            onClick={onLogout}
            className="p-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* FLASH NOTIFICATIONS */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold text-center animate-fade-in" id="dashboard-error-banner">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold text-center animate-fade-in animate-pulse" id="dashboard-success-banner">
          {successMsg}
        </div>
      )}

      {/* ======================== SECCIÓN 1: MÉTRICAS RÁPIDAS (6 TARJETAS SUPERIORES) ======================== */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="kpi-metrics-grid">
        
        {/* Reservas hoy vs ayer */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xl border border-white/5 relative overflow-hidden">
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Reservas Hoy</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-mono">{stats.today}</span>
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded px-1.5 py-0.5 ${
              stats.today >= stats.yesterday ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {stats.today >= stats.yesterday ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {calculateChangeInPercent(stats.today, stats.yesterday)}
            </span>
          </div>
          <p className="text-[9px] text-white/35 mt-1 font-mono">Ayer: {stats.yesterday} turnos</p>
        </div>

        {/* Reservas esta semana */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xl border border-white/5">
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Esta Semana</div>
          <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
            {stats.week} <span className="text-xs text-white/45 font-sans font-normal">citas</span>
          </div>
          <p className="text-[9px] text-white/35 mt-1 leading-none font-sans">Semana calendario activa.</p>
        </div>

        {/* Reservas este mes vs mes anterior */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xl border border-white/5 relative overflow-hidden">
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Reservas del Mes</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-mono">{stats.month}</span>
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold rounded px-1.5 py-0.5 ${
              stats.month >= stats.lastMonth ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {stats.month >= stats.lastMonth ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {calculateChangeInPercent(stats.month, stats.lastMonth)}
            </span>
          </div>
          <p className="text-[9px] text-white/35 mt-1 font-mono">Mes ant: {stats.lastMonth} citas</p>
        </div>

        {/* Ingresos totales del día */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xl border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Caja Estimada Hoy</div>
          <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            ${(stats.totalEarningsToday || 0).toLocaleString('es-CL')}
          </div>
          <div className="flex items-center justify-between text-[8px] text-white/40 mt-1 font-mono leading-none">
            <span>Servicios: ${(stats.servicesEarningsToday || 0).toLocaleString('es-CL')}</span>
            <span>Caja: ${(stats.salesEarningsToday || 0).toLocaleString('es-CL')}</span>
          </div>
        </div>

        {/* Promedio ticket por servicio */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xl border border-white/5">
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Ticket Promedio</div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            ${(stats.averageServicePriceToday || 0).toLocaleString('es-CL')}
          </div>
          <p className="text-[9px] text-white/35 mt-1 leading-none font-sans">Valor medio facturado por cita.</p>
        </div>

        {/* Tasa de cancelación y clientes únicos */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xl border border-white/5">
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Cancelaciones & Clientes</div>
          <div className="flex justify-between items-baseline mt-2">
            <div>
              <span className="text-[10px] text-rose-400 uppercase font-mono font-bold">Tasa: </span>
              <span className="text-base font-black text-rose-400 font-mono">{stats.cancellationRate}%</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold">Cli: </span>
              <span className="text-base font-black text-white font-mono">{stats.monthUniqueClients}</span>
            </div>
          </div>
          <p className="text-[9px] text-white/35 mt-1 leading-none font-sans">Indicadores del mes analizados.</p>
        </div>

      </section>

      {/* ======================== TABS SELECTOR ======================== */}
      <nav className="flex items-center gap-1 border-b border-white/5 pb-0 overflow-x-auto text-xs" id="dashboard-tabs">
        {[
          { key: 'agenda', label: '📊 Agenda & Control' },
          { key: 'calendar', label: '📅 Calendario Semanal / Mensual' },
          { key: 'customers', label: '👥 Clientes & Historial' },
          { key: 'pos', label: '🛒 POS / Caja Chica' },
          { key: 'blocking', label: '🛡️ Bloquear Módulos' },
          { key: 'waitlist', label: '⏳ Lista Espera' },
          { key: 'ai-insights', label: '🧠 Consultor IA Gemini' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 font-semibold transition tracking-wider uppercase text-[10px] whitespace-nowrap cursor-pointer hover:text-white ${
              activeTab === tab.key
                ? 'text-amber-400 border-b-2 border-amber-500 font-bold'
                : 'text-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ======================== TAB 1: AGENDA & CONTROLS ======================== */}
      {activeTab === 'agenda' && (
        <div className="space-y-8" id="tab-agenda">
          
          {/* ======================== SECCIÓN 2: GRÁFICOS ANALÍTICOS ======================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-analytical-row">
            
            {/* GRÁFICO 1: Historial últimos 6 meses */}
            <div className="glass rounded-3xl p-5 shadow-xl border border-white/5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-4 font-mono flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Reservas Mensuales (Últimos 6 Meses)
              </h3>
              <div className="h-52 w-full">
                {chartMonths.length === 0 ? (
                  <p className="text-center text-xs text-white/20 py-20 font-mono">Falta historial de reservas.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartMonths} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070707', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ fontSize: '11px', color: '#fbbf24' }}
                      />
                      <Bar dataKey="count" name="Citas" radius={[3, 3, 0, 0]}>
                        {chartMonths.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICO 2: Horas más reservadas */}
            <div className="glass rounded-3xl p-5 shadow-xl border border-white/5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-4 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Horas Peak (Cuáles horas se agendan más)
              </h3>
              <div className="h-52 w-full">
                {hourlyDistribution.length === 0 ? (
                  <p className="text-center text-xs text-white/20 py-20 font-mono">Aún no hay reservas consolidadas para el mapa de hora peak.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070707', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ fontSize: '11px', color: '#10b981' }}
                      />
                      <Area type="monotone" dataKey="count" name="Turnos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPeak)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* GRÁFICO 3: Servicios más solicitados */}
            <div className="glass rounded-3xl p-5 shadow-xl border border-white/5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-4 font-mono flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Tratamientos & Servicios Más Vendidos
              </h3>
              <div className="h-52 w-full">
                {chartServices.length === 0 ? (
                  <p className="text-center text-xs text-white/20 py-20 font-mono font-mono">Sin registros comerciales de vitrina.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartServices} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={8} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070707', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ fontSize: '11px', color: '#fbbf24' }}
                      />
                      <Bar dataKey="count" name="Servicios" radius={[0, 3, 3, 0]}>
                        {chartServices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* ======================== SECCIÓN 3: RENDIMIENTO POR BARBERO ======================== */}
          <section className="space-y-4" id="section-barbers-performance">
            <div>
              <h3 className="text-md uppercase tracking-wider font-extrabold text-white font-mono flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Rendimiento de Especialistas Independientes
              </h3>
              <p className="text-[10px] text-white/40 mt-0.5">Indicadores individuales compilados hoy, esta semana y mes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barberPerformance.map(b => (
                <div key={b.id} className="glass rounded-3xl p-5 border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent shadow-xl flex flex-col md:flex-row justify-between gap-4" id={`perf-barber-${b.id}`}>
                  
                  {/* Info left */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <h4 className="text-base font-bold text-white uppercase font-sans tracking-wide">{b.name}</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-2 border border-white/5 bg-black/30 rounded-lg text-center">
                        <span className="block text-[8px] uppercase tracking-widest text-white/45 font-mono">Citas Hoy</span>
                        <span className="text-sm font-black text-amber-400 font-mono">{b.todayCount}</span>
                      </div>
                      <div className="p-2 border border-white/5 bg-black/30 rounded-lg text-center">
                        <span className="block text-[8px] uppercase tracking-widest text-white/45 font-mono">Semana</span>
                        <span className="text-sm font-black text-white font-mono">{b.weekCount}</span>
                      </div>
                      <div className="p-2 border border-white/5 bg-black/30 rounded-lg text-center">
                        <span className="block text-[8px] uppercase tracking-widest text-white/45 font-mono">Mes</span>
                        <span className="text-sm font-black text-white font-mono">{b.monthCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cash collected right */}
                  <div className="md:items-end flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5 shrink-0">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-emerald-400 font-mono md:text-right">Ingreso Honorarios</span>
                      <span className="text-xl font-black text-emerald-400 font-mono block md:text-right">${b.earnings.toLocaleString('es-CL')}</span>
                    </div>

                    <div className="mt-2 md:mt-0">
                      <span className="block text-[8px] uppercase tracking-widest text-white/40 font-mono md:text-right">Servicio Común</span>
                      <span className="text-[10px] text-white/80 font-bold block md:text-right font-sans">{b.topService}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </section>
          
          {/* ======================== SECCIÓN EXTRA: RESPALDO DE SEGURIDAD EN NAVEGADOR (LOCAL STORAGE) ======================== */}
          <section className="glass rounded-3xl p-6 border border-white/5 shadow-2xl space-y-4" id="local-storage-backup-section">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Respaldo Automático de Seguridad (LocalStorage)</h3>
                <p className="text-[11px] text-white/45 mt-0.5">Reservas aseguradas en el almacenamiento persistente del navegador.</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>🟢 Actualizado:</span>
                <span id="ultima-actualizacion" className="font-semibold">{localStats.ultimaActualizacion}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl text-center">
                <span className="block text-[9px] uppercase tracking-widest text-white/40 font-mono mb-1 font-sans">Citas Hoy</span>
                <div id="stat-hoy" className="text-3xl font-black text-amber-400 font-mono">{localStats.hoy}</div>
              </div>
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl text-center">
                <span className="block text-[9px] uppercase tracking-widest text-white/40 font-mono mb-1 font-sans">Esta Semana</span>
                <div id="stat-semana" className="text-3xl font-black text-white font-mono">{localStats.semana}</div>
              </div>
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl text-center">
                <span className="block text-[9px] uppercase tracking-widest text-white/40 font-mono mb-1 font-sans">Este Mes</span>
                <div id="stat-mes" className="text-3xl font-black text-white font-mono">{localStats.mes}</div>
              </div>
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl text-center">
                <span className="block text-[9px] uppercase tracking-widest text-white/40 font-mono mb-1 font-sans">Este Año</span>
                <div id="stat-ano" className="text-3xl font-black text-white font-mono">{localStats.ano}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white/80 uppercase tracking-widest mt-2 border-b border-white/5 pb-2">Lista de citas registradas hoy</h4>
              <div id="lista-reservas-hoy" className="space-y-2 mt-3 max-h-52 overflow-y-auto pr-1">
                {localHoyReservas.length === 0 ? (
                  <p className="text-zinc-500 text-xs text-center py-6 font-mono bg-black/10 rounded-xl border border-dashed border-white/5">Sin reservas hoy</p>
                ) : (
                  localHoyReservas.map((r, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <strong className="text-amber-400 text-xs font-semibold block">{r.nombre}</strong>
                        <small className="text-white/40 text-[10px] font-mono mt-0.5 block">⏰ {r.hora} · 📱 {r.servicio}</small>
                      </div>
                      <div className="text-[9px] bg-amber-400/10 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        Local
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              type="button" 
              onClick={limpiarDatosLocalStorage} 
              className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-150 flex items-center justify-center gap-2 mt-2 cursor-pointer w-full border-none"
            >
              🗑️ Limpiar todos los datos
            </button>
          </section>

          {/* ======================== SECCIÓN 4: RESERVAS EN TIEMPO REAL (HISTORIAL CENTRAL) ======================== */}
          <div className="glass rounded-3xl overflow-hidden border border-white/5 shadow-2xl" id="bookings-realtime-grid">
            
            <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/2">
              <div>
                <h3 className="text-base font-semibold text-white">Consola de Citas y Sincronización</h3>
                <p className="text-[11px] text-white/40 mt-0.5">Control de cobros manuales, estados alternativos y buscador inteligente.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar cliente, número, tratamiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-hidden focus:ring-1 focus:ring-amber-500 w-full sm:w-52 font-mono"
                />

                <select
                  value={selectedBarberFilter}
                  onChange={(e) => setSelectedBarberFilter(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  <option value="all" className="bg-neutral-900">Todos los Barberos</option>
                  <option value="emmanuel" className="bg-neutral-900">Emmanuel Rojas</option>
                </select>

                <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-0.5" id="pills-statuses">
                  {(['all', 'pending', 'confirmed', 'in_progress', 'completed', 'canceled'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-2 py-1 rounded text-[8px] uppercase tracking-wider font-bold transition ${
                        statusFilter === f
                          ? 'bg-amber-400 text-black font-extrabold'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {f === 'all' ? 'Ver todo' : f === 'pending' ? 'Pend' : f === 'confirmed' ? 'Conf' : f === 'in_progress' ? 'Prog' : f === 'completed' ? 'List' : 'Canc'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-16 text-white/40 text-xs font-mono">
                  No se registran citas que coincidan con la búsqueda.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-white/50 font-bold uppercase tracking-wider font-mono">
                      <th className="py-4 px-6">Cliente</th>
                      <th className="py-4 px-6">Contacto</th>
                      <th className="py-4 px-6">Barbero Asignado</th>
                      <th className="py-4 px-6">Servicio / Precio</th>
                      <th className="py-4 px-6 text-center">Horario</th>
                      <th className="py-4 px-6">Método Cobro</th>
                      <th className="py-4 px-6 text-center">Estado</th>
                      <th className="py-4 px-6 text-center">Acciones Ejecutivas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans leading-relaxed">
                    {filteredBookings.map(b => (
                      <tr key={b.id} className="hover:bg-white/5 transition" id={`booking-tr-${b.id}`}>
                        
                        {/* Clients */}
                        <td className="py-4 px-6">
                          <span className="block font-bold text-white text-sm">{b.name}</span>
                          {b.comments && <span className="block text-[10px] text-white/35 max-w-xs truncate italic">"{b.comments}"</span>}
                        </td>

                        {/* Contacts */}
                        <td className="py-4 px-6">
                          <a 
                            href={`https://wa.me/${b.phone.replace(/[^\d]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-amber-400 text-white font-mono"
                          >
                            <Phone className="w-3 h-3 text-[#25d366]" />
                            {b.phone}
                          </a>
                        </td>

                        {/* Professional */}
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 bg-white/5 text-white capitalize rounded border border-white/10 text-[9px] font-sans leading-none">
                            {b.barberName}
                          </span>
                        </td>

                        {/* Service & Price */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white/90">{b.serviceName}</div>
                          <div className="text-[10px] text-emerald-400 font-bold font-mono">${(b.price || 12000).toLocaleString('es-CL')}</div>
                        </td>

                        {/* Schedule date */}
                        <td className="py-4 px-6 text-center font-mono">
                          <div className="font-bold text-white">{b.date.split('-').reverse().join('/')}</div>
                          <div className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest mt-0.5">{b.time} hrs</div>
                        </td>

                        {/* Payment Method Selector */}
                        <td className="py-4 px-6">
                          <select
                            value={b.payment_method || 'efectivo'}
                            onChange={(e) => handleUpdateStatusAndPayment(b.id!, b.status, e.target.value)}
                            className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 font-mono focus:outline-hidden"
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta (Transb)</option>
                            <option value="transferencia">Transferencia</option>
                          </select>
                        </td>

                        {/* Badges of current state */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/40 text-[9px] font-bold uppercase tracking-wider border ${
                            b.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : b.status === 'canceled'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : b.status === 'in_progress'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : b.status === 'confirmed'
                              ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                              : 'bg-white/5 text-white/60 border-white/10'
                          }`}>
                            {b.status === 'completed' ? 'Completo' : b.status === 'canceled' ? 'Cancelado' : b.status === 'in_progress' ? 'En Proceso' : b.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                          </span>
                        </td>

                        {/* Edit and state triggers */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex flex-wrap gap-1 justify-center max-w-sm">
                            <button
                              onClick={() => handleUpdateStatusAndPayment(b.id!, 'completed')}
                              className="px-1.5 py-0.5 bg-emerald-500 text-black hover:bg-emerald-400 transition font-bold text-[8px] uppercase tracking-wide rounded font-mono"
                              title="Marcar completada y consolidar cobro"
                            >
                              Finalizar
                            </button>
                            <button
                              onClick={() => handleUpdateStatusAndPayment(b.id!, 'in_progress')}
                              className="px-1.5 py-0.5 bg-sky-500 text-black hover:bg-sky-400 transition font-bold text-[8px] uppercase tracking-wide rounded font-mono"
                              title="Cliente ingresado a sillón de atención"
                            >
                              Sillón
                            </button>
                            <button
                              onClick={() => handleUpdateStatusAndPayment(b.id!, 'confirmed')}
                              className="px-1.5 py-0.5 bg-amber-400 text-black hover:bg-amber-300 transition font-bold text-[8px] uppercase tracking-wide rounded font-mono"
                              title="Confirmar turno"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => handleUpdateStatusAndPayment(b.id!, 'canceled')}
                              className="px-1.5 py-0.5 bg-rose-950/20 hover:bg-rose-500 text-rose-400 hover:text-white transition font-bold text-[8px] uppercase tracking-wide rounded border border-rose-500/20 font-mono"
                              title="Cancelar hora"
                            >
                              Anular
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ======================== SECCIÓN 5: TAB CALENDARIO DE OPERACIONES ======================== */}
      {activeTab === 'calendar' && (
        <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display italic text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" /> Calendario de Control de Agenda
              </h3>
              <p className="text-xs text-white/50">Bloqueos de agenda automáticos. Las horas menores a la hora actual se inhabilitan para el día de hoy.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={blockBarberId}
                onChange={(e) => setBlockBarberId(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
              >
                <option value="emmanuel" className="bg-neutral-900">Emmanuel Rojas</option>
              </select>
              <input
                type="date"
                value={manualDate || (new Date().toISOString().split('T')[0])}
                onChange={(e) => setManualDate(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-hidden"
              />
            </div>
          </div>

          {/* Time Slot visualization with real-time blocks check */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {TIME_SLOTS.map(slotTime => {
              const activeDate = manualDate || (new Date().toISOString().split('T')[0]);
              
              // 1. Is blocked?
              const isBlocked = blockedSlots.some(s => s.barberId === blockBarberId && s.date === activeDate && s.time === slotTime);
              
              // 2. Is booked?
              const bookingsOnThisSlot = bookings.find(b => b.barberId === blockBarberId && b.date === activeDate && b.time === slotTime && b.status !== 'canceled');

              // 3. Is past slot of today?
              const isPastToday = (() => {
                const today = new Date();
                const todayStr = activeDate; // comparison date
                
                // check if todayStr is today's real date in Chile
                const ch = new Date().toLocaleDateString('en-US', { timeZone: 'America/Santiago' });
                const [m, d, y] = ch.split('/');
                const todayFormatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                
                if (todayStr === todayFormatted) {
                  // compare hours and minutes
                  const [h, min] = slotTime.split(':').map(Number);
                  
                  // current hour and minute in Chile timezone
                  const formatter = new Intl.DateTimeFormat('es-CL', {
                    timeZone: 'America/Santiago',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  });
                  const chTime = formatter.format(new Date());
                  const [currH, currMin] = chTime.split(':').map(Number);
                  
                  if (h < currH || (h === currH && min <= currMin)) {
                    return true;
                  }
                }
                return false;
              })();

              return (
                <div 
                  key={slotTime} 
                  className={`p-3.5 rounded-2xl border text-center relative transition flex flex-col justify-between ${
                    isBlocked 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : bookingsOnThisSlot
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : isPastToday
                      ? 'bg-white/[0.01] border-white/5 text-white/20'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isBlocked && !bookingsOnThisSlot && !isPastToday) {
                      setManualDate(activeDate);
                      setManualTime(slotTime);
                      setManualBarberId(blockBarberId);
                      setShowManualModal(true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono tracking-wider">{slotTime} HRS</span>
                    {isBlocked ? (
                      <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                    ) : bookingsOnThisSlot ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : isPastToday ? (
                      <X className="w-3 h-3 text-white/10 shrink-0" />
                    ) : (
                      <PlusCircle className="w-3 h-3 text-white/20 hover:text-amber-400 shrink-0 transition" />
                    )}
                  </div>

                  <div className="mt-4 text-[9px] uppercase font-bold tracking-wider leading-none text-left font-sans">
                    {isBlocked ? (
                      <span className="text-rose-400/80">Bloqueado</span>
                    ) : bookingsOnThisSlot ? (
                      <span className="text-white text-[10px] block truncate">{bookingsOnThisSlot.name}</span>
                    ) : isPastToday ? (
                      <span className="text-white/20">Pasado</span>
                    ) : (
                      <span className="text-amber-400/70">Disponible</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================== SECCIÓN 6: BASE DE CLIENTES AVANZADA (CON COLLAPSIBLE NOTAS) ======================== */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fade-in" id="tab-customers">
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
            <h3 className="text-xl font-display italic text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" /> Registro y Fichas Clínicas de Clientes
            </h3>
            <p className="text-xs text-white/50 mb-6">Guarda y asocia notas de corte a los números de tus clientes frecuentes (navajas, degradados altos, estilos especiales, alergias).</p>

            {/* Customers list table */}
            <div className="overflow-x-auto">
              {customersReport.length === 0 ? (
                <p className="text-center py-12 text-white/45 text-xs font-mono">No se registran clientes con citas históricas procesadas.</p>
              ) : (
                <table className="w-full text-left text-xs text-white/95" id="customers-cards-table">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/55 uppercase font-mono tracking-wider font-semibold">
                      <th className="py-4 px-6">Nombre de Cliente</th>
                      <th className="py-4 px-6 font-mono">Teléfono Móvil</th>
                      <th className="py-4 px-6 text-center">Visitas</th>
                      <th className="py-4 px-6 text-center">Consumo Total</th>
                      <th className="py-4 px-6 text-center">Última Visita</th>
                      <th className="py-4 px-6">Tratamiento Favorito</th>
                      <th className="py-4 px-6 text-center">Ficha de Autor / Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customersReport.map((c, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition">
                        <td className="py-4 px-6 font-bold text-sm text-white">{c.name}</td>
                        <td className="py-4 px-6 font-mono text-white/60">{c.phone}</td>
                        <td className="py-4 px-6 text-center font-bold text-amber-400 font-mono text-sm">{c.visitsCount} turnos</td>
                        <td className="py-4 px-6 text-center font-bold text-white font-mono">${c.totalSpent.toLocaleString('es-CL')}</td>
                        <td className="py-4 px-6 text-center font-mono text-white/65">{c.lastVisit.split('-').reverse().join('/')}</td>
                        <td className="py-4 px-6 capitalize font-sans">{c.favoriteService}</td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleOpenClientNotes(c.phone)}
                            className="p-1 px-3 bg-white/5 hover:bg-amber-400 hover:text-black border border-white/10 rounded-lg text-[9px] uppercase font-extrabold tracking-wider transition font-mono cursor-pointer"
                          >
                            Editar Comentarios
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

          {/* Collapsible Edit Notes Drawer/Modal Dialog */}
          {activeClientNotePhone && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="glass max-w-md w-full rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 animate-scale-up">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5 font-mono">
                    <ClipboardList className="w-4 h-4 text-amber-400" /> Ficha Especialista ({activeClientNotePhone})
                  </h4>
                  <button onClick={() => setActiveClientNotePhone(null)} className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/45 block" htmlFor="client-notes-editor">
                    Notas Estilismo, Navajas & Alergias
                  </label>
                  <textarea
                    id="client-notes-editor"
                    rows={4}
                    placeholder="Ej: Usa navaja libre, degradado alto con patilleras, sensible al alcohol post-shave, peinado hacia el lado izquierdo con cera mate fuerte."
                    value={clientNoteContent}
                    onChange={(e) => setClientNoteContent(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActiveClientNotePhone(null)}
                    className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs uppercase"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleSaveClientNotes}
                    disabled={savingNote}
                    className="py-2.5 px-5 bg-amber-400 text-black hover:bg-amber-300 font-bold rounded-lg text-xs uppercase cursor-pointer flex items-center gap-1"
                  >
                    {savingNote ? 'Guardando...' : 'Sincronizar Nota'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================== SECCIÓN 7: TAB POS WORKSPACE & CAJA CHICA (PRODUCT SALES) ======================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in animate-scale-up" id="tab-pos">
          
          {/* Card left: Prepopulated services and catalog selector */}
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-2xl h-fit">
            <h3 className="font-display italic text-lg text-white mb-4 flex items-center gap-1.5 uppercase-tracking-tight">
              <ShoppingBag className="w-4.5 h-4.5 text-amber-400" /> Registro de Ventas de Vitrina (POS)
            </h3>
            <p className="text-[11px] text-white/50 mb-6 leading-relaxed">
              Registra las compras de productos físicos que realicen los clientes en el local (pomadas, ceras, aceites para barba, etc.). Las ventas se sumarán a los ingresos totales de hoy.
            </p>

            <form onSubmit={handleRecordPosSale} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="pos-sel">Producto Físico</label>
                <select
                  id="pos-sel"
                  value={posItemName}
                  onChange={(e) => {
                    setPosItemName(e.target.value);
                    const prod = STORE_PRODUCTS.find(p => p.name === e.target.value);
                    if (prod) {
                      setPosAmount(prod.price.toString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  <option value="">-- Elige un Producto --</option>
                  {STORE_PRODUCTS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} (${p.price.toLocaleString('es-CL')})</option>
                  ))}
                  <option value="Servicio Especial de Autor">Servicio Personalizado Adicional</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="pos-amount">Nombre Manual de Producto (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Gel fijador o combo especial"
                  value={posItemName}
                  onChange={(e) => setPosItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="pos-val">Monto de Venta (CLP)</label>
                <input
                  type="number"
                  required
                  id="pos-val"
                  placeholder="Monto en CLP"
                  value={posAmount}
                  onChange={(e) => setPosAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="pos-payment">Método de Pago</label>
                <select
                  id="pos-payment"
                  value={posPaymentMethod}
                  onChange={(e) => setPosPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta font-sans">Tarjeta (Transbank)</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={recordingProductSale}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-extrabold uppercase tracking-widest rounded-full transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {recordingProductSale ? 'Guardando Venta...' : 'Registrar Venta'}
              </button>
            </form>
          </div>

          {/* Sales listing of today + Cash register summary */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Cash register overview */}
            <div className="glass rounded-3xl p-5 border border-white/5 bg-gradient-to-tr from-white/[0.01] to-transparent shadow-xl">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono">Arqueo de Caja Chica de Vitrina</h4>
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="p-3 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <span className="block text-[8px] uppercase font-bold text-white/45 font-mono">Efectivo</span>
                  <span className="text-sm font-black text-white font-mono">${posSalesByMethod.efectivo.toLocaleString('es-CL')}</span>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <span className="block text-[8px] uppercase font-bold text-white/45 font-mono">Transb / Tarjeta</span>
                  <span className="text-sm font-black text-white font-mono">${posSalesByMethod.tarjeta.toLocaleString('es-CL')}</span>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <span className="block text-[8px] uppercase font-bold text-white/45 font-mono">Transferencias</span>
                  <span className="text-sm font-black text-white font-mono">${posSalesByMethod.transferencia.toLocaleString('es-CL')}</span>
                </div>
                <div className="p-3 bg-black/40 border border-emerald-500/20 rounded-2xl text-center bg-gradient-to-tr from-emerald-500/5 to-transparent">
                  <span className="block text-[8px] uppercase font-bold text-emerald-400 font-mono">Total Vitrina</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">${posSalesByMethod.total.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            {/* List of today sales */}
            <div className="glass rounded-3xl p-6 border border-white/5 shadow-2xl h-fit">
              <h3 className="font-display italic text-base text-white mb-4">Módulos de Productos Facturados Hoy</h3>
              <div className="overflow-x-auto">
                {salesToday.length === 0 ? (
                  <p className="text-center py-12 text-white/20 text-xs font-mono">No se registran ventas de vitrina hoy.</p>
                ) : (
                  <table className="w-full text-xs text-left" id="sales-today-grid">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 text-white/45 font-bold uppercase tracking-wider font-mono">
                        <th className="py-2.5 px-4 animate-pulse">Producto / Concepto</th>
                        <th className="py-2.5 px-4 font-mono">Monto (CLP)</th>
                        <th className="py-2.5 px-4">Modo Pago</th>
                        <th className="py-2.5 px-4 font-mono">Hora de Venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans text-white/80">
                      {salesToday.map((s) => (
                        <tr key={s.id} className="hover:bg-white/1" id={`store-sale-tr-${s.id}`}>
                          <td className="py-2.5 px-4 font-bold text-white">{s.item_name}</td>
                          <td className="py-2.5 px-4 font-bold font-mono text-emerald-400">${s.amount.toLocaleString('es-CL')}</td>
                          <td className="py-2.5 px-4 uppercase font-bold tracking-widest text-[9px] font-mono">{s.payment_method}</td>
                          <td className="py-2.5 px-4 font-mono text-white/45">{new Date(s.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================== TAB LAST: BLOCK / HOLIDAYS SCHEDULES ======================== */}
      {activeTab === 'blocking' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in" id="dashboard-tab-blocking">
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-2xl h-fit">
            <h3 className="font-display italic text-lg text-white mb-4">Bloquear Agenda de Turnos</h3>
            <p className="text-[11px] text-white/50 mb-6 leading-relaxed">
              Configura tus feriados, horarios de colaciones o vacaciones bloqueando horas del calendario general para evitar que los clientes reserven en esos slots de forma online.
            </p>

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="bl-barb">Especialista</label>
                <select
                  id="bl-barb"
                  value={blockBarberId}
                  onChange={(e) => setBlockBarberId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  <option value="emmanuel">Emmanuel Rojas</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="bl-date">Fecha del Descanso</label>
                <input
                  type="date"
                  required
                  id="bl-date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="bl-time">Hora del Bloqueo (HH:MM)</label>
                <select
                  id="bl-time"
                  required
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-hidden"
                >
                  <option value="">-- Elige la hora --</option>
                  {TIME_SLOTS.map(st => (
                    <option key={st} value={st}>{st} Hrs</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1 font-sans">Razón / Comentarios</label>
                <input
                  type="text"
                  placeholder="Ej: Feriado, Almuerzo, Reunión"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-white hover:bg-slate-100 text-black text-xs font-mono font-extrabold uppercase tracking-widest rounded-full transition shadow-md cursor-pointer"
              >
                Bloquear Hora
              </button>
            </form>
          </div>

          <div className="md:col-span-2 glass rounded-3xl p-6 border border-white/5 shadow-2xl h-fit">
            <h3 className="font-display italic text-lg text-white mb-4">Lista de Descansos e Inactividades</h3>
            <div className="overflow-x-auto">
              {blockedSlots.length === 0 ? (
                <p className="text-center py-12 text-white/20 text-xs font-mono">No se registran bloqueos manuales activos en este local.</p>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/45 font-bold uppercase tracking-wider font-mono">
                      <th className="py-3 px-4">Especialista</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Bloque Horario</th>
                      <th className="py-3 px-4">Razón indicativa</th>
                      <th className="py-3 px-4 text-center">Liberar Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {blockedSlots.map(s => (
                      <tr key={s.id} className="hover:bg-white/5" id={`blocked-slot-tr-${s.id}`}>
                        <td className="py-3 px-4 font-semibold text-white capitalize">{s.barberId === 'emmanuel' ? 'Emmanuel Rojas' : (s.barberId === 'matias' ? 'Matías Silva' : s.barberId)}</td>
                        <td className="py-3 px-4 font-mono">{s.date.split('-').reverse().join('/')}</td>
                        <td className="py-3 px-4 font-bold font-mono text-amber-400">{s.time} hrs</td>
                        <td className="py-3 px-4 italic text-white/60">{s.reason || 'Sin especificar'}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(s.id!)}
                            className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white p-1 rounded transition"
                            title="Desbloquear hora"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================== OTHER NAVIGATION TABS: WAITLISTS & GEMINI INSIGHTS ======================== */}
      {activeTab === 'waitlist' && (
        <div className="glass rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden" id="tab-waitlist">
          <h3 className="text-xl font-display italic text-white uppercase tracking-tight flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-400" /> Lista de Espera Inteligente
          </h3>
          <p className="text-xs text-white/50 mb-6">Clientes que intentaron agendar en días repletos. Contáctalos vía WhatsApp directamente con un clic si se te libera un cupo.</p>

          <div className="overflow-x-auto">
            {waitlistEntries.length === 0 ? (
              <p className="text-center py-16 text-white/20 text-xs font-mono">Ningún registro activo en la lista de espera.</p>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/45 uppercase tracking-wider font-mono">
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Contacto</th>
                    <th className="py-4 px-6">Especialista Requerido</th>
                    <th className="py-4 px-6">Tratamiento</th>
                    <th className="py-4 px-6 text-center">Fecha de Interés</th>
                    <th className="py-4 px-6 text-center flex items-center gap-1"><span>Acción</span> <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {waitlistEntries.map(e => (
                    <tr key={e.id} className="hover:bg-white/5 transition">
                      <td className="py-4 px-6 font-bold text-white text-sm">{e.name}</td>
                      <td className="py-4 px-6">
                        <a 
                          href={`https://wa.me/${e.phone.replace(/[^\d]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-emerald-400 font-mono text-white text-xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#25d366]" />
                          {e.phone}
                        </a>
                      </td>
                      <td className="py-4 px-6 font-semibold text-white/80">{e.barberName}</td>
                      <td className="py-4 px-6 capitalize">{e.serviceName}</td>
                      <td className="py-4 px-6 text-center font-bold text-amber-400 font-mono text-xs">{e.date.split('-').reverse().join('/')}</td>
                      <td className="py-4 px-6 text-center">
                        <a
                          href={`https://wa.me/${e.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`¡Hola ${e.name}! Te escribimos de Rojas Barber. Vimos tu interés en atenderte el ${e.date.split('-').reverse().join('/')} con ${e.barberName}. Se nos ha liberado un horario; por favor respóndenos indicándonos si aún deseas tomar tu lugar. ¡Saludos!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-black text-[9px] uppercase tracking-widest font-extrabold p-1.5 px-3 rounded-full transition shadow-md"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Ofrecer Cupo Liberado</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ai-insights' && (
        <div className="space-y-6 animate-fade-in" id="tab-ai-insights">
          <div className="glass rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center border border-white/15 animate-pulse">
                    <Brain className="w-4.5 h-4.5 text-black shrink-0" />
                  </div>
                  <h3 className="text-xl font-display italic text-white uppercase tracking-tight">Consultor de Negocio y Marketing IA</h3>
                </div>
                <p className="text-xs text-white/50 mt-1 max-w-xl">
                  Rojas Barber Suite Inteligencia Artificial analiza tu volumen real de reservas para planificar campañas óptimas de conversión y fidelización ejecutiva usando el SDK oficial de Gemini 3.5-flash.
                </p>
              </div>

              <button
                onClick={triggerAIAnalysis}
                disabled={aiLoading}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs uppercase tracking-widest rounded-full shadow-lg transition active:scale-95 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    Generando Diagnóstico...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    Analizar con Gemini IA
                  </>
                )}
              </button>
            </div>

            {aiWarning && (
              <p className="text-[10px] text-amber-400/80 uppercase tracking-widest font-mono text-center py-2 bg-amber-400/5 rounded-xl border border-amber-400/15 mb-4 animate-pulse">
                ⚠️ {aiWarning}
              </p>
            )}

            {aiInsights.length === 0 ? (
              <div className="text-center py-16 border border-white/5 rounded-2xl bg-black/40 flex flex-col items-center justify-center space-y-4">
                <Brain className="w-12 h-12 text-white/15 animate-bounce" />
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white/60">Análisis Listo para Generar</h4>
                  <p className="text-xs text-white/40 leading-relaxed font-sans">Presiona el botón de arriba para recopilar tus estadísticas de venta, facturaciones totales, y tasa de cancelaciones de forma ultra segura.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="ai-insights-rendered">
                {aiInsights.map((rec, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-3 shadow-md flex items-start gap-4 relative animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/35 flex items-center justify-center font-bold font-mono text-xs text-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="space-y-1.5 font-light leading-relaxed">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300 font-mono">Estrategia Ejecutiva</h4>
                      <p className="text-xs text-white/80 leading-relaxed italic">
                        "{rec}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== MODAL DIALOG: AGENDAR TURNO MANUAL ======================== */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-1.5 font-sans uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-amber-400" /> Registrar Turno Manual
              </h4>
              <button onClick={() => setShowManualModal(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualBooking} className="space-y-3 text-xs leading-relaxed">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-name">Nombre de Cliente *</label>
                  <input
                    type="text"
                    required
                    id="man-name"
                    placeholder="Ej: Francisco Álvarez"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-phone">Teléfono de Contacto *</label>
                  <input
                    type="text"
                    required
                    id="man-phone"
                    placeholder="Ej: +56912345678"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-srv">Tratamiento / Servicio *</label>
                  <select
                    id="man-srv"
                    value={manualServiceId}
                    onChange={(e) => setManualServiceId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden font-sans"
                  >
                    {BARBER_SERVICES.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (${s.price.toLocaleString('es-CL')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-barb">Barbero Asignado *</label>
                  <select
                    id="man-barb"
                    value={manualBarberId}
                    onChange={(e) => setManualBarberId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                  >
                    <option value="emmanuel">Emmanuel Rojas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-date">Fecha de Agenda *</label>
                  <input
                    type="date"
                    required
                    id="man-date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-time">Hora del Turno *</label>
                  <select
                    id="man-time"
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-hidden"
                  >
                    <option value="">-- Elige la hora --</option>
                    {TIME_SLOTS.map(st => (
                      <option key={st} value={st}>{st} Hrs</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-pay">Método de Cobro Pago</label>
                  <select
                    id="man-pay"
                    value={manualPaymentMethod}
                    onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta (Transbank)</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-st">Estado Inicial</label>
                  <select
                    id="man-st"
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden font-sans"
                  >
                    <option value="confirmed">Confirmado Directo</option>
                    <option value="pending">Pendiente (Por WhatsApp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold tracking-widest text-white/40 mb-1" htmlFor="man-com">Comentarios Adicionales</label>
                <input
                  type="text"
                  placeholder="Ej: Llama por teléfono, cliente clásico"
                  value={manualComments}
                  onChange={(e) => setManualComments(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-lg transition cursor-pointer"
                >
                  Confirmar Turno
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================== SECCIÓN 8: MODAL DE CIERRE DE CAJA DIARIA ======================== */}
      {showClosureModal && dailyClosure && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="closure-report-modal">
          <div className="glass max-w-lg w-full rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden" id="print-area">
            
            {/* Stamp decorative */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-display italic text-white uppercase tracking-wider">Cierre y Resumen de Caja Diario</h3>
              </div>
              <button 
                onClick={() => setShowClosureModal(false)} 
                className="text-white/40 hover:text-white font-mono text-sm print:hidden"
              >
                Cerrar
              </button>
            </div>

            {/* Inner printable template */}
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50 uppercase">Localidad:</span>
                  <span className="text-white font-bold">José D. Mujica 385, Rancagua</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 uppercase">Fecha de Cierre:</span>
                  <span className="text-white font-bold">{new Date().toLocaleDateString('es-CL')}</span>
                </div>
                <div className="flex justify-between animate-pulse">
                  <span className="text-amber-400 uppercase font-extrabold">Estado de Caja:</span>
                  <span className="text-amber-400 font-extrabold pb-0 border-b border-amber-400 border-dashed">Sincronizado • Listo Cierre</span>
                </div>
              </div>

              {/* KPI Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-white font-semibold uppercase tracking-wider text-[10px] text-amber-400 border-b border-white/5 pb-1">Métricas de Cierre General</h4>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Servicios Realizados (Completos):</span>
                  <span className="text-white font-bold">{dailyClosure.servicesCompletedToday} citas</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Cancelaciones Registradas Hoy:</span>
                  <span className="text-rose-400 font-bold">{dailyClosure.cancellationsToday} canceladas</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Hora de Mayor Ingreso Peak Hoy:</span>
                  <span className="text-white font-bold">{dailyClosure.peakHourToday}</span>
                </div>
              </div>

              {/* Financial calculations */}
              <div className="space-y-2.5">
                <h4 className="text-white font-semibold uppercase tracking-wider text-[10px] text-amber-400 border-b border-white/5 pb-1">Cifras Financieras de Caja</h4>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Ingresos por Servicios:</span>
                  <span className="text-white font-bold">${dailyClosure.servicesEarningsToday.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Ventas de Vitrina de Productos Físicos:</span>
                  <span className="text-white font-bold">${dailyClosure.salesEarningsToday.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 to-transparent p-2 rounded-lg">
                  <span className="text-emerald-400 font-bold uppercase">INGRESOS TOTALES COBRADOS:</span>
                  <span className="text-emerald-400 font-black text-sm">${dailyClosure.totalEarningsToday.toLocaleString('es-CL')}</span>
                </div>
              </div>

              {/* Breakdown by payment types */}
              <div className="space-y-2.5">
                <h4 className="text-white font-semibold uppercase tracking-wider text-[10px] text-amber-400 border-b border-white/5 pb-1">Ingresos de Hoy por Tipo de Pago</h4>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Efectivo en Caja Total:</span>
                  <span className="text-white font-bold">${(bookingsEarningsByMethod.efectivo + posSalesByMethod.efectivo).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Tarjeta / Transbank Total:</span>
                  <span className="text-white font-bold">${(bookingsEarningsByMethod.tarjeta + posSalesByMethod.tarjeta).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/60">Transferencias Bancarias Recibidas:</span>
                  <span className="text-white font-bold">${(bookingsEarningsByMethod.transferencia + posSalesByMethod.transferencia).toLocaleString('es-CL')}</span>
                </div>
              </div>

              {/* Earings by specialist */}
              <div className="space-y-2 bg-white/2 p-3 rounded-2xl">
                <h4 className="text-white font-bold uppercase text-[9px] tracking-wider mb-2">Ingresos por Especialista Independiente</h4>
                {dailyClosure.barberTodayEarnings.map(be => (
                  <div key={be.name} className="flex justify-between text-[11px] py-0.5">
                    <span className="text-white/70">{be.name}:</span>
                    <span className="text-amber-400 font-bold">${be.earnings.toLocaleString('es-CL')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Print trigger button action */}
            <div className="flex gap-2 pt-2 border-t border-white/10 justify-end print:hidden">
              <button
                onClick={() => {
                  window.print();
                }}
                className="py-2.5 px-5 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded-lg transition hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Reporte
              </button>
              <button
                onClick={() => setShowClosureModal(false)}
                className="py-2.5 px-4 bg-white/5 text-white test-xs uppercase hover:bg-white/10 rounded-lg"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
