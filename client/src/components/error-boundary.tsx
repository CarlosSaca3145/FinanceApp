import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Ha ocurrido un error en la aplicación</h2>
            <p className="text-sm font-semibold text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50 break-words">
              {this.state.error?.message || "Ocurrió un error inesperado al cargar esta página."}
            </p>
            {this.state.error?.stack && (
              <details className="text-left bg-slate-950 p-2.5 rounded text-[11px] font-mono text-slate-400 max-h-32 overflow-auto">
                <summary className="cursor-pointer text-slate-300 font-sans font-medium mb-1">Ver detalles del error</summary>
                <pre className="whitespace-pre-wrap break-all">{this.state.error.stack}</pre>
              </details>
            )}
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => {
                  window.location.href = window.location.origin + window.location.pathname + "?reload=" + Date.now();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Forzar Recarga (Limpiar Caché)
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
