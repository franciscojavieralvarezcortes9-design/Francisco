import React, { useState, useEffect } from 'react';
import { BARBER_SERVICES } from '../servicesData';
import { Service, Barber } from '../types';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MessageSquare, 
  Scissors, 
  Check, 
  Sparkles, 
  ExternalLink, 
  Star, 
  MapPin, 
  ChevronRight, 
  Instagram, 
  TrendingUp, 
  ShieldCheck, 
  Hourglass,
  Users,
  Trash2
} from 'lucide-react';

const BARBER_PHONE = '56946346791';

// ⚠️ CAMBIAR A true CUANDO SE QUIERA REACTIVAR LA SUBIDA
const SUBIDA_HABILITADA = false;

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatSpanishDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const dayName = weekdays[dateObj.getDay()];
  const monthName = months[dateObj.getMonth()];
  
  return `${dayName}, ${day} de ${monthName}`;
};

export default function ClientPortal() {
  const [barbersList, setBarbersList] = useState<Barber[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  
  // State for single-screen Order of Arrival Booking Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceForm, setServiceForm] = useState('Corte desvanecido / Fade');
  const [dayApprox, setDayApprox] = useState(getLocalDateString());
  
  // Gallery category
  const [galleryCategory, setGalleryCategory] = useState<'all' | 'fade' | 'barba' | 'clasicos' | 'modernos'>('all');

  // Media loading errors fallback state for custom user upload files
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});
  const [uploadingItem, setUploadingItem] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<number, string>>({});
  const [cacheBuster, setCacheBuster] = useState<Record<number, string>>({});

  // Loading / Submit states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBooking, setSuccessBooking] = useState<any>(null);

  // Fetch barbers for co-creators section
  useEffect(() => {
    setLoadingBarbers(true);
    fetch('/api/barbers')
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener barberos');
        return res.json();
      })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setBarbersList(list);
      })
      .catch(err => {
        console.error('Error fetching barbers:', err);
        setBarbersList([]);
      })
      .finally(() => setLoadingBarbers(false));
  }, []);

  // Handle Booking Create (Order of Arrival via WhatsApp)
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Por favor ingresa tu número de WhatsApp.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // Create WhatsApp link exactly as described by user
      const formattedDay = formatSpanishDate(dayApprox);
      const text = `Hola, soy ${name.trim()} y quiero reservar mi turno para ${serviceForm}, planeo venir el ${formattedDay}. 💈`;
      const waLink = `https://wa.me/56946346791?text=${encodeURIComponent(text)}`;

      setSuccessBooking({
        waLink,
        booking: {
          name: name.trim(),
          phone: phone.trim(),
          service: serviceForm,
          day: formattedDay
        }
      });

      // Attempt immediate redirect/open
      const windowRef = window.open(waLink, '_blank');
      if (!windowRef || windowRef.closed || typeof windowRef.closed === 'undefined') {
        window.location.href = waLink;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  // Precompiled Gallery referencing exact non-AI original files
  const galleryItems = [
    { 
      category: 'modernos', 
      title: 'Letrero LED Neon Sign', 
      img: '/src/assets/images/signo_neon_infinito.png', 
      fileName: 'signo_neon_infinito.png',
      instructions: 'Sube tu foto real del letrero LED original de Rojas Barber.'
    },
    { 
      category: 'modernos', 
      title: 'Rincón de Autor & Fe', 
      img: '/src/assets/images/barber_selfie_faith.png', 
      fileName: 'barber_selfie_faith.png',
      instructions: 'Sube tu foto original del selfie en el espejo con cartel de madera.'
    },
    { 
      category: 'fade', 
      title: 'Curly Taper Desvanecido', 
      img: '/src/assets/images/nuca_curly_taper_nape.png', 
      fileName: 'nuca_curly_taper_nape.png',
      instructions: 'Sube tu foto de la línea curva rasurada en la nuca.'
    },
    { 
      category: 'modernos', 
      title: 'Diseño Heart & Rizos', 
      img: '/src/assets/images/diseno_heart_rizos.png', 
      fileName: 'diseno_heart_rizos.png',
      instructions: 'Sube tu foto real con el corazón rasurado en la sien.'
    },
    { 
      category: 'modernos', 
      title: 'Diseño Heart en Movimiento', 
      img: '/src/assets/images/diseno_heart_rizos.png', 
      video: '/src/assets/images/video_cliente.mp4',
      fileName: 'video_cliente.mp4',
      instructions: 'Sube tu video real en calidad original de la clienta.'
    },
    { 
      category: 'fade', 
      title: 'Classic Side Fade & Línea Mandril', 
      img: '/src/assets/images/video_classic_fade.png', 
      video: '/src/assets/images/video_classic_fade.mp4',
      fileName: 'video_classic_fade.mp4',
      instructions: 'Sube tu primer video del corte clásico con raya marcada y degradado de precisión.'
    },
    { 
      category: 'modernos', 
      title: 'Diseño Geométrico Artístico / Hair Tattoo', 
      img: '/src/assets/images/video_hair_tattoo_geometric.png', 
      video: '/src/assets/images/video_hair_tattoo_geometric.mp4',
      fileName: 'video_hair_tattoo_geometric.mp4',
      instructions: 'Sube tu segundo video de líneas artísticas con patrón geométrico en el rapado.'
    },
    { 
      category: 'fade', 
      title: 'Curly Drop Fade & Low Mid Blending', 
      img: '/src/assets/images/video_curly_drop_fade.png', 
      video: '/src/assets/images/video_curly_drop_fade.mp4',
      fileName: 'video_curly_drop_fade.mp4',
      instructions: 'Sube tu tercer video de degradado Drop Fade texturizado con rizos.'
    },
    { 
      category: 'modernos', 
      title: 'Hair Tattoo Rayo Geométrico', 
      img: '/src/assets/images/diseno_rayo_latino.png', 
      fileName: 'diseno_rayo_latino.png',
      instructions: 'Sube tu foto real del joven con corte de diseño de rayo.'
    },
    { 
      category: 'fade', 
      title: 'Corte Pompadour Alto', 
      img: '/src/assets/images/corte_pompadour_fade.png', 
      fileName: 'corte_pompadour_fade.png',
      instructions: 'Sube tu foto real del corte executive con fondo de hiedra verde.'
    }
  ];

  const filteredGallery = galleryCategory === 'all' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === galleryCategory);

  // Scroll Helper
  const scrollToBooking = () => {
    const el = document.getElementById('reserva-directa-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Helper to handle interactive video/photo upload in real-time
  const handleMediaUpload = async (index: number, file: File, fileName: string) => {
    if (!SUBIDA_HABILITADA) {
      alert('La subida de contenido está deshabilitada temporalmente.');
      return;
    }
    setUploadStatus(prev => ({ ...prev, [index]: 'Cargando...' }));
    
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = async () => {
      const base64Data = fileReader.result as string;
      try {
        const response = await fetch('/api/upload-gallery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName,
            fileData: base64Data
          })
        });
        
        const data = await response.json();
        if (data.success) {
          const timestamp = String(Date.now());
          setCacheBuster(prev => ({ ...prev, [index]: timestamp }));
          setUploadStatus(prev => ({ ...prev, [index]: '¡Éxito!' }));
          
          setMediaErrors(prev => {
            const nextErrors = { ...prev };
            const item = galleryItems[index];
            if (item.img) delete nextErrors[item.img];
            if (item.video) delete nextErrors[item.video];
            return nextErrors;
          });
        } else {
          setUploadStatus(prev => ({ ...prev, [index]: `Status: ${data.error || 'Error'}` }));
        }
      } catch (err: any) {
        setUploadStatus(prev => ({ ...prev, [index]: 'Error de Red' }));
      }
    };
    fileReader.onerror = () => {
      setUploadStatus(prev => ({ ...prev, [index]: 'Error de Lectura' }));
    };
  };

  // Helper to handle resetting/deleting a file to restore the instructions card
  const handleMediaDelete = async (index: number, fileName: string) => {
    try {
      const response = await fetch('/api/delete-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName })
      });
      const data = await response.json();
      if (data.success) {
        setUploadStatus(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
        setCacheBuster(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
        // Put back the error so it shows the upload box with instructions
        const item = galleryItems[index];
        setMediaErrors(prev => ({
          ...prev,
          [item.img]: true,
          ...(item.video ? { [item.video]: true } : {})
        }));
      }
    } catch (err) {
      console.error('Failed to delete media:', err);
    }
  };

  return (
    <div className="space-y-20 pb-20" id="client-portal-root">
      
      {/* ======================== HERO PRINCIPAL FULLSCREEN ======================== */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 -mt-10 overflow-hidden rounded-3xl" id="hero-fullscreen">
        {/* Dark Matter ambient backgrounds */}
        <div className="absolute inset-0 bg-[#070707] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0b]/80 via-black to-[#050505] z-10" />
          {/* Subtle moving light or grid lines to emulate luxury video vibe */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        </div>

        {/* Brand Banner Overlay */}
        <div className="relative z-20 max-w-4xl space-y-6 mx-auto" id="hero-content">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/25 text-amber-400 text-[10px] font-bold uppercase tracking-widest font-mono mx-auto shadow-[0_0_15px_rgba(212,175,55,0.08)]">
            <Sparkles className="w-4 h-4" />
            ROJAS BARBER • EXPERIENCIA DE LUJO
          </div>

          <h1 className="text-5xl md:text-[80px] leading-none font-black italic uppercase tracking-tight text-white font-display" id="hero-title">
            Tu mejor versión <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 drop-shadow-md">comienza aquí.</span>
          </h1>

          <p className="text-sm md:text-lg max-w-2xl mx-auto text-white/70 leading-relaxed font-sans font-light">
            Reserva tu hora en segundos y vive una experiencia premium bajo la firma de <span className="text-white font-bold">Emmanuel Rojas</span> en Rancagua, O’Higgins.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6" id="hero-actions">
            <button
              onClick={scrollToBooking}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 active:scale-95 text-black font-extrabold text-xs uppercase tracking-widest rounded-full transition duration-150 cursor-pointer shadow-[0_0_25px_rgba(212,175,55,0.35)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)]"
              id="hero-reserve-btn"
            >
              Reservar ahora
            </button>
            <a
              href="#services-section"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/95 font-bold text-xs uppercase tracking-widest rounded-full border border-white/10 transition duration-150"
              id="hero-services-btn"
            >
              Ver Servicios
            </a>
          </div>

          {/* Social Proof metrics */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto pt-10 text-center border-t border-white/5 mt-10" id="hero-social-proof">
            <div>
              <div className="flex items-center justify-center text-amber-400">
                <span className="text-xl md:text-2xl font-black font-mono">4.9</span>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 ml-1" />
              </div>
              <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest mt-1">Calificación</p>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white font-mono">+1,200</div>
              <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest mt-1">Satisfechos</p>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono">Disponible</div>
              <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest mt-1">Hoy en Rancagua</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================== SECCIÓN DE SERVICIOS ======================== */}
      <section className="scroll-mt-24 space-y-8" id="services-section">
        <div className="text-center space-y-2">
          <span className="text-[10px] tracking-widest font-mono text-amber-400 font-bold uppercase">NUESTRA CARTA PREMIUM</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-white">Servicios & Rituales</h2>
          <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-2 rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="services-cards-grid">
          {BARBER_SERVICES.map(service => (
            <div 
              key={service.id}
              className="glass rounded-3xl p-6 border border-white/10 group hover:border-amber-500/40 hover:bg-white/5 transition-all duration-300 flex flex-col justify-between shadow-xl"
              id={`service-detail-card-${service.id}`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest text-amber-400 font-mono">
                    {service.category}
                  </span>
                  <div className="text-white/40 group-hover:text-amber-400 transition">
                    <Scissors className="w-5 h-5 shrink-0" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                  {service.name}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed font-light">
                  {service.description}
                </p>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-6">
                <div>
                  <div className="text-[10px] text-white/40 font-mono">PRECIO NETO</div>
                  <div className="font-extrabold text-lg text-white font-mono">
                    ${service.price.toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40 font-mono">DURACIÓN</div>
                  <div className="text-xs text-amber-400 font-bold font-mono">
                    {service.duration} minutos
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  const mapServiceIdToFormValue = (id: string): string => {
                    if (id === 'corte-clasico') return 'Corte clásico';
                    if (id === 'corte-fade') return 'Corte desvanecido / Fade';
                    if (id === 'combo-infinity') return 'Corte + Barba';
                    if (id === 'perfilado-barba') return 'Barba';
                    if (id === 'corte-diseno') return 'Diseño de barba';
                    return 'Otro';
                  };
                  setServiceForm(mapServiceIdToFormValue(service.id));
                  scrollToBooking();
                }}
                className="w-full mt-4 py-2 bg-white/5 group-hover:bg-amber-500 group-hover:text-black hover:scale-103 font-bold text-[10px] uppercase tracking-widest rounded-xl transition duration-200 cursor-pointer text-center text-white flex items-center justify-center gap-1"
              >
                Reservar Servicio <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ======================== PERFIL DE BARBEROS ======================== */}
      <section className="space-y-8" id="barberos-section">
        <div className="text-center space-y-2">
          <span className="text-[10px] tracking-widest font-mono text-amber-400 font-bold uppercase">EL CO-CREADOR</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-white">Especialista Exclusivo</h2>
          <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-2 rounded"></div>
        </div>

        <div className="flex justify-center" id="barbers-photo-profile-grid">
          {barbersList.map(barber => (
            <div 
              key={barber.id}
              className="glass rounded-3xl p-6 border border-white/10 text-center space-y-4 hover:border-white/30 hover:bg-[#0c0c0c]/90 transition duration-300 relative group flex flex-col justify-between shadow-2xl max-w-sm w-full"
              id={`barber-expert-card-${barber.id}`}
            >
              <div className="space-y-4">
                {/* Profile Image */}
                <div className="relative w-24 h-24 mx-auto">
                  <img 
                    src={barber.avatarUrl} 
                    alt={barber.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    width={96}
                    height={96}
                    className="w-full h-full rounded-full object-cover border-2 border-amber-500/35 grayscale group-hover:grayscale-0 group-hover:scale-105 transition duration-300"
                    id={`barber-avatar-img-${barber.id}`}
                  />
                  <div className="absolute -bottom-1.5 -right-1 bg-black p-1 uppercase rounded-full border border-amber-500/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                    {barber.name}
                  </h3>
                  <span className="text-[10px] text-white/55 font-mono uppercase tracking-widest">
                    {barber.specialty}
                  </span>
                </div>

                <div className="flex justify-around border-y border-white/5 py-3 text-xs text-white/60 font-mono">
                  <div>
                    <span className="block font-bold text-amber-400">{barber.experience} años</span>
                    <span>Trayectoria</span>
                  </div>
                  <div className="border-r border-white/5"></div>
                  <div>
                    <span className="block font-bold text-white">5.0/5 ★</span>
                    <span>Reputación</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={barber.instagram.startsWith('http') ? barber.instagram : `https://www.instagram.com/${barber.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 font-medium transition"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>{barber.instagram.startsWith('http') ? '@rojas_barber123' : barber.instagram}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================== SISTEMA DE RESERVAS (ORDEN DE LLEGADA VIA WHATSAPP) ======================== */}
      <section className="scroll-mt-24 max-w-lg mx-auto space-y-8" id="reserva-directa-section">
        <div className="text-center space-y-2">
          <span className="text-[10px] tracking-widest font-mono text-amber-400 font-bold uppercase">RITUAL DE ESTILO</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-white uppercase">Reserva tu turno</h2>
          <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-2 rounded"></div>
        </div>

        {successBooking ? (
          /* RESERVATION SUCCESS PANEL */
          <div className="glass rounded-3xl p-6 md:p-8 text-center shadow-2xl animate-fade-in border border-amber-500/20" id="success-panel">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-amber-400" />
            </div>
            
            <h2 className="text-xl font-display italic text-white uppercase tracking-tight">¡Turno Guardado en Agenda!</h2>
            <p className="mt-3 text-white/70 text-xs leading-relaxed max-w-sm mx-auto">
              Tu turno ha quedado registrado. **Atendemos por orden de llegada al confirmar tu turno**. Haz clic abajo para enviar tu confirmación directa a Emmanuel por WhatsApp.
            </p>

            <div className="my-6 p-5 bg-white/5 rounded-2xl border border-white/10 text-left space-y-2 text-xs" id="booking-details-summary">
              <h3 className="font-semibold text-amber-400 text-[10px] border-b border-white/10 pb-1.5 mb-1.5 uppercase tracking-widest font-mono">Resumen del Turno</h3>
              <div className="flex justify-between">
                <span className="text-white/50">Cliente:</span>
                <span className="text-white font-semibold">{successBooking.booking.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">WhatsApp:</span>
                <span className="text-white font-mono">{successBooking.booking.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Servicio:</span>
                <span className="text-white font-semibold">{successBooking.booking.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Día Estimado:</span>
                <span className="text-amber-400 font-bold">{successBooking.booking.day}</span>
              </div>
            </div>

            <div className="space-y-4 max-w-xs mx-auto" id="success-actions">
              <a
                href={successBooking.waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-[#25d366] hover:bg-[#20ba59] font-extrabold rounded-full shadow-[0_0_20px_rgba(37,211,102,0.35)] text-xs text-white uppercase tracking-widest transition duration-150"
                id="whatsapp-confirm-anchor"
              >
                <ExternalLink className="w-4 h-4 text-white" />
                Mandar WhatsApp
              </a>

              <button
                onClick={() => {
                  setSuccessBooking(null);
                  setName('');
                  setPhone('');
                  setServiceForm('Corte desvanecido / Fade');
                  setDayApprox(getLocalDateString());
                }}
                className="text-xs text-white/40 hover:text-white/80 underline font-semibold transition py-2 block mx-auto cursor-pointer"
                id="new-booking-btn"
              >
                Solicitar otro turno
              </button>
            </div>
          </div>
        ) : (
          /* FORMULARIO SIMPLE "RESERVA TU TURNO" */
          <div className="glass rounded-3xl p-6 md:p-8 shadow-2xl border border-white/5 relative space-y-6" id="arrival-booking-box">
            <form onSubmit={handleBookingSubmit} className="space-y-5">
              
              {/* FIELD 1: Nombre */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1.5" htmlFor="cust-name-arrival">
                  Nombre Completo <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  id="cust-name-arrival"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition"
                />
              </div>

              {/* FIELD 2: WhatsApp */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1.5" htmlFor="cust-phone-arrival">
                  Número de WhatsApp <span className="text-amber-400">*</span>
                </label>
                <input
                  type="tel"
                  id="cust-phone-arrival"
                  required
                  placeholder="Ej. +56912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono placeholder-white/20 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition"
                />
              </div>

              {/* FIELD 3: Desired Service */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1.5" htmlFor="cust-service-arrival">
                  Servicio que desea <span className="text-amber-400">*</span>
                </label>
                <select
                  id="cust-service-arrival"
                  value={serviceForm}
                  onChange={(e) => setServiceForm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0e0e0e] border border-white/10 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23fbbf24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'calc(100% - 12px) center', backgroundSize: '16px', backgroundRepeat: 'no-repeat', paddingRight: '40px' }}
                >
                  <option value="Corte clásico">Corte clásico</option>
                  <option value="Corte desvanecido / Fade">Corte desvanecido / Fade</option>
                  <option value="Corte + Barba">Corte + Barba</option>
                  <option value="Barba">Barba</option>
                  <option value="Diseño de barba">Diseño de barba</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* FIELD 4: Day selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1.5" htmlFor="cust-day-arrival">
                  Selecciona la fecha planificada <span className="text-amber-400">*</span>
                </label>
                <input
                  type="date"
                  id="cust-day-arrival"
                  required
                  min={getLocalDateString()}
                  value={dayApprox}
                  onChange={(e) => setDayApprox(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0e0e0e] border border-white/10 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {errorMsg && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              {/* FIELD 5: Confirm Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-black font-extrabold text-xs uppercase tracking-widest rounded-full transition duration-150 cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center justify-center gap-1.5 font-bold"
              >
                {submitting ? 'Abriendo WhatsApp...' : 'CONFIRMAR TURNO'} <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </form>

            {/* INFORMATIONAL MESSAGE */}
            <div className="pt-2 text-center text-[11px] text-white/55 leading-relaxed flex flex-col justify-center items-center space-y-1 bg-white/2 p-4 rounded-2xl border border-white/5" id="info-arrival-caption">
              <span>⏱️ Atendemos por orden de llegada al confirmar tu turno.</span>
              <span>Tu reserva quedará guardada en nuestra agenda para organizar el día de mejor manera.</span>
            </div>
          </div>
        )}
      </section>

      {/* ======================== GALERÍA PREMIUM DE ANTES & DESPUÉS ======================== */}
      <section className="space-y-8" id="gallery-premium-section">
        <div className="text-center space-y-2">
          <span className="text-[10px] tracking-widest font-mono text-amber-400 font-bold uppercase">PORTAFOLIO DE PRECISIÓN</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-white">Galería de Estilos Recientes</h2>
          <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-2 rounded"></div>
        </div>

        {/* Categories grid menu */}
        <div className="flex flex-wrap justify-center gap-2" id="gallery-category-pills">
          {(['all', 'fade', 'barba', 'clasicos', 'modernos'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setGalleryCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition ${
                galleryCategory === cat
                  ? 'bg-amber-400 text-black font-extrabold shadow-md'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
              id={`gallery-category-pill-${cat}`}
            >
              {cat === 'all' ? 'Ver Todos' : cat}
            </button>
          ))}
        </div>

        {/* Instagram/Pinterest style Grid with Hover overlays */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" id="gallery-grid">
          {filteredGallery.map((item, index) => {
            const buster = cacheBuster[index] ? `?t=${cacheBuster[index]}` : '';

            return (
              <div 
                key={index}
                className="relative aspect-square overflow-hidden rounded-2xl group border border-white/5 bg-[#080808]"
                id={`gallery-item-${index}`}
              >
                {item.video ? (
                  <div className="w-full h-full relative">
                    <video 
                      src={`${item.video}${buster}`} 
                      poster={item.img && !item.img.includes('video_') ? `${item.img}${buster}` : undefined}
                      autoPlay={false}
                      loop={true}
                      muted={true}
                      playsInline={true}
                      controls={true}
                      preload="none"
                      style={{ maxWidth: '100%', height: 'auto' }}
                      onClick={(e) => {
                        const v = e.currentTarget;
                        if (v.paused) {
                          v.play().catch(() => {});
                        } else {
                          v.pause();
                        }
                      }}
                      onTouchStart={(e) => {
                        const v = e.currentTarget;
                        if (v.paused) {
                          v.play().catch(() => {});
                        }
                      }}
                      className="w-full h-full object-cover hover:scale-105 transition duration-300 cursor-pointer"
                    />
                    <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[8px] font-bold tracking-widest uppercase font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 z-10 animate-pulse shadow-md">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      VIDEO
                    </div>
                  </div>
                ) : (
                  <img 
                    src={`${item.img}${buster}`} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col justify-end p-4">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">{item.category}</span>
                  <h4 className="text-xs font-bold text-white mt-1 uppercase tracking-wider">{item.title}</h4>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================== EXQUISITA SECCIÓN DE RESEÑAS ======================== */}
      <section className="space-y-8" id="testimonials-section">
        <div className="text-center space-y-2">
          <span className="text-[10px] tracking-widest font-mono text-amber-400 font-bold uppercase">REPUTACIÓN GOOGLE REVIEWS</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-white">Comentarios Reales</h2>
          <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-2 rounded"></div>
        </div>

        {/* Global badge stat */}
        <div className="max-w-sm mx-auto p-4 bg-white/5 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center space-y-1.5" id="social-reviews-badge">
          <div className="flex gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400" />)}
          </div>
          <p className="text-sm font-bold text-white">4.9 ★ de 186 comentarios oficiales</p>
          <p className="text-[10px] text-white/40">Sincronizado vía Google Business Profile en Rancagua</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="testimonials-grid">
          {[
            {
              name: "Felipe Valenzuela",
              date: "Hace 3 días",
              review: "Espectacular experiencia. Cortarse con Emmanuel Rojas es otro nivel, el ritual de la toalla caliente te relaja completamente y el degradado quedó impecable. Se nota la dedicación y el profesionalismo. 100% recomendado.",
              initial: "F"
            },
            {
              name: "Eduardo Carrasco",
              date: "Hace 1 semana",
              review: "Rojas Barber es por lejos la mejor barbería de Rancagua. El ambiente es super premium y te atienden con tragos e hidratación de cortesía. El corte y perfilado de barba que me hizo Carlos Mendoza fue perfecto y prolijo.",
              initial: "E"
            },
            {
              name: "Ignacio Henríquez",
              date: "Hace 2 semanas",
              review: "Me atendí por primera vez con Seba y el resultado superó todas las expectativas. El ritual de hidratación facial es genial y sus recomendaciones de corte para mi tipo de cara fueron acertadas. Ideal para consentirse.",
              initial: "I"
            }
          ].map((item, idx) => (
            <div key={idx} className="glass p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl" id={`testimonial-card-${idx}`}>
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 font-bold text-amber-400 rounded-full flex items-center justify-center text-xs">
                    {item.initial}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.name}</h4>
                    <span className="text-[10px] text-white/40">{item.date}</span>
                  </div>
                </div>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed font-light italic">
                "{item.review}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================== UBICACIÓN ======================== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-white/5 pt-16" id="location-guide-section">
        <div className="space-y-6" id="location-text-box">
          <span className="text-[10px] tracking-widest font-mono text-amber-400 font-bold uppercase">CÓMO ENCONTRARNOS</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-white leading-tight">Rojas Barber Rancagua</h2>
          <p className="text-xs md:text-sm text-white/70 leading-relaxed">
            Estamos ubicados estratégicamente en una zona privilegiada y segura de Rancagua. Ven a disfrutar de un espacio impecable diseñado exclusivamente para el cuidado masculino premium.
          </p>

          <div className="space-y-4" id="address-details-box">
            <div className="flex gap-3 items-start">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">Dirección Física</h4>
                <p className="text-xs text-white/60">José Domingo Mujica 385, Rancagua (Diagonal Open Plaza), Región de O’Higgins.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">Horarios de Entrada</h4>
                <p className="text-xs text-white/60">Lunes a Sábado: 10:00 hrs – 20:00 hrs. <br />Domingos & Feriados: Cerrado.</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="https://maps.google.com/?q=José+Domingo+Mujica+385,+Rancagua"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 py-3 px-6 bg-white hover:bg-slate-100 text-black font-extrabold text-xs uppercase tracking-widest rounded-full transition shadow-lg"
              id="maps-navigation-btn"
            >
              Cómo llegar al local <ChevronRight className="w-4 h-4 shrink-0" />
            </a>
          </div>
        </div>

        {/* Embedded Interactive Vector Map Mockup */}
        <div className="relative h-72 rounded-3xl overflow-hidden border border-white/10 shadow-2xl glass flex items-center justify-center p-3" id="mockup-maps-canvas">
          {/* Detailed visual container */}
          <div className="absolute inset-0 bg-neutral-900 overflow-hidden leading-tight flex flex-col justify-between p-6 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(135deg, rgba(8,8,8,0.95), rgba(20,20,20,0.85))" }}>
            <div className="space-y-1">
              <span className="text-[9px] font-bold font-mono tracking-widest text-amber-400 uppercase">MAP DE COBERTURA</span>
              <h4 className="font-bold text-white text-base font-display">José Domingo Mujica 385</h4>
              <p className="text-[11px] text-white/40">Rancagua Centro • Diagonal Open Plaza</p>
            </div>
            
            {/* Abstract visual coordinate design representation */}
            <div className="relative h-28 my-2 border border-white/5 rounded-2xl flex items-center justify-center overflow-hidden bg-black/40">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_200px_100px_at_50%_50%,rgba(212,175,55,0.08),transparent)]"></div>
              {/* Fake pins in golden slate mapping lines */}
              <div className="h-0.5 w-[80%] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className="h-[80%] w-0.5 bg-gradient-to-b from-transparent via-white/10 to-transparent absolute"></div>
              <div className="relative w-8 h-8 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center animate-bounce">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-white/45 font-mono pt-2 border-t border-white/5">
              <span>LAT: -34.1702</span>
              <span>•</span>
              <span>LNG: -70.7406</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================== BRANDED WHATSAPP FLOATING BUTTON ======================== */}
      <a
        href="https://wa.me/56946346791?text=Hola%2C%20quiero%20reservar%20una%20hora%20en%20Rojas%20Barber%20%F0%9F%92%88"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25d366] hover:bg-[#20ba59] rounded-full flex items-center justify-center shadow-[0_4px_25px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 z-50 animate-bounce group"
        id="floating-whatsapp-trigger"
        title="Contáctanos vía WhatsApp"
      >
        <span className="absolute right-16 scale-0 group-hover:scale-100 bg-black text-amber-400 font-mono text-[9px] uppercase tracking-widest font-extrabold px-3 py-1.5 rounded-xl border border-white/10 whitespace-nowrap shadow-xl transition-all duration-200">
          ¿Dudas? Chat Directo
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.1 1.455 4.7 1.456 5.48-.003 9.94-4.47 9.94-9.96 0-2.658-1.034-5.155-2.91-7.034C16.5 1.74 14.1 1.34 12 1.34c-5.48 0-9.94 4.47-9.94 9.96 0 2 .5 3.9 1.5 5.6l-.98 3.56 3.65-.96z" />
        </svg>
      </a>

    </div>
  );
}
