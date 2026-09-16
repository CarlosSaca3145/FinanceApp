import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Mail, Sparkles, Video, BarChart2 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Brand presentation */}
        <div className="lg:col-span-7 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" /> AI-Powered Sponsorships
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Brand Campaign Manager
          </h1>
          
          <p className="text-lg text-slate-400 max-w-2xl">
            Gestiona tus colaboraciones con marcas de manera inteligente. Crea plantillas de contenido optimizadas, realiza envíos automáticos de correos y automatiza el seguimiento de campañas con ayuda de IA.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <Mail className="h-6 w-6 text-blue-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Correos Automatizados</h3>
                <p className="text-xs text-slate-400 mt-1">Envía propuestas de campaña y recordatorios con un solo clic.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-purple-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Generación con IA</h3>
                <p className="text-xs text-slate-400 mt-1">Crea ideas de contenido personalizadas para cada nicho de marca.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <Video className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Plantillas de Contenido</h3>
                <p className="text-xs text-slate-400 mt-1">Importa desde Excel y organiza tus mejores links y estadísticas.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
              <BarChart2 className="h-6 w-6 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Panel de Control</h3>
                <p className="text-xs text-slate-400 mt-1">Controla las métricas clave de tus envíos y respuestas en tiempo real.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <Card className="w-full max-w-md bg-slate-900/40 border-slate-800/80 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/20 to-transparent blur-xl"></div>
            <CardHeader className="text-center pt-8">
              <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-4">
                <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-100">Iniciar Sesión</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Conecta tu cuenta para continuar al gestor de campañas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <Button 
                onClick={handleLogin}
                className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/15 border-0 transition-all duration-300 transform hover:-translate-y-0.5"
                data-testid="button-login"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" stroke="none" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Iniciar sesión con Google
              </Button>

              <div className="text-center text-xs text-slate-500">
                Al iniciar sesión, aceptas que asociemos los datos de tus campañas a tu cuenta de Google.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
