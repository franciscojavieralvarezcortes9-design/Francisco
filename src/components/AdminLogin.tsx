import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [simulatedLink, setSimulatedLink] = useState('');

  // Handle URL parsing on mount to process incoming magic links: ?token=XYZ
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setLoading(true);
      setErrorMsg('');
      
      // Verify token with backend
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('El enlace de acceso ha expirado o es inválido.');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            // Save token to localStorage
            localStorage.setItem('rojas_admin_token', token);
            localStorage.setItem('infinity_admin_token', token);
            // Notify parent component
            onLoginSuccess(token);
            // Clean URL query params safely
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch(err => {
          console.error(err);
          setErrorMsg(err.message || 'Error de autenticación.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [onLoginSuccess]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setSimulatedLink('');

    try {
      const resp = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'No se pudo generar el enlace.');
      }

      setSuccessMsg(data.message);
      
      // Expose simulated link in dev to make debugging super easy in AI Studio preview
      if (data.linkSimulado) {
        setSimulatedLink(data.linkSimulado);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-12" id="admin-login-view">
      <div className="glass rounded-3xl p-8 shadow-2xl">
        
        {/* Branding/Header */}
        <div className="text-center mb-8" id="login-header">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-2xl font-display italic text-white">Acceso Privado</h2>
          <p className="text-xs text-white/50 mt-1 font-sans">
            Panel exclusivo de administración para <span className="font-semibold text-white">Rojas Barber</span>.
          </p>
        </div>

        {loading && !successMsg ? (
          <div className="text-center py-8" id="login-authenticating">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-white/90">Autenticando enlace de ingreso...</p>
            <p className="text-xs text-white/40 mt-1">Espera un momento mientras validamos tu sesión segura.</p>
          </div>
        ) : successMsg ? (
          /* SUCCESS SCREEN */
          <div className="space-y-6 animate-fade-in" id="magic-link-sent-success">
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="font-semibold text-emerald-300 text-sm">¡Enlace enviado con éxito!</h3>
              <p className="text-xs text-white/70 mt-1.5 leading-relaxed">
                Hemos enviado un correo a <span className="font-semibold text-white">{email}</span> con tu enlace directo. (Simulado en terminal local)
              </p>
            </div>

            {/* Quick access simulated button for seamless AI Studio testing */}
            {simulatedLink && (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10" id="dev-sim-access">
                <p className="text-xs text-amber-400 font-semibold mb-3 flex items-center gap-1 font-mono uppercase tracking-wider">
                  ⚠️ Entorno de pruebas:
                </p>
                <a
                  href={simulatedLink}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-black text-xs font-extrabold rounded-full transition uppercase tracking-widest"
                  id="direct-simulate-admin-link"
                >
                  Entrar Directamente <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setSuccessMsg('');
                setSimulatedLink('');
              }}
              className="w-full text-center text-xs text-white/40 hover:text-white/80 underline font-medium transition py-2"
              id="back-to-login"
            >
              Volver a ingresar correo
            </button>
          </div>
        ) : (
          /* LOGIN INPUT FORM */
          <form onSubmit={handleSendMagicLink} className="space-y-5" id="login-form">
            <div>
              <label htmlFor="admin-email" className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">
                Correo Clínico
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="admin-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="emmanuel.rojas@rojas.barber"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition font-mono"
                />
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
              </div>
              <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
                El correo autorizado es <span className="font-semibold text-white/70 italic">emmanuel.rojas@rojas.barber</span>. No requiere contraseña.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold text-center animate-fade-in" id="login-error-banner">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-slate-100 active:scale-95 text-black font-extrabold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] transition duration-150 cursor-pointer uppercase tracking-widest text-xs"
              id="request-magic-link-btn"
            >
              {loading ? 'Generando...' : 'Obtener Acceso Directo'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
