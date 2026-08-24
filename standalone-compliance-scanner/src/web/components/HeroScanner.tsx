import React, { useState, useRef } from 'react';
import { Search, FolderUp, FileArchive, Play, Sparkles, ArrowRight, Shield, Layers, Lock, Cpu } from 'lucide-react';
import { DEMO_PROJECTS, DemoProject } from '../services/demo-projects';

interface HeroScannerProps {
  onScanGitHub: (url: string) => void;
  onScanZip: (file: File) => void;
  onScanFolder: (fileList: FileList) => void;
  onSelectDemo: (demo: DemoProject) => void;
  isScanning: boolean;
  scanProgress: { message: string; percent: number };
}

export const HeroScanner: React.FC<HeroScannerProps> = ({
  onScanGitHub,
  onScanZip,
  onScanFolder,
  onSelectDemo,
  isScanning,
  scanProgress,
}) => {
  const [gitUrl, setGitUrl] = useState('https://github.com/negraodenio/CompliancePRO');
  const [isDragOver, setIsDragOver] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gitUrl.trim()) {
      onScanGitHub(gitUrl.trim());
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        onScanZip(file);
      } else {
        onScanFolder(e.dataTransfer.files);
      }
    }
  };

  return (
    <div className="relative pt-6 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Title */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-cyan-400 text-xs font-medium backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Motor 100% Gratuito & Independente • Auditoria de 13 Regulações</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Governança, Riscos & Compliance para <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Agentes e Modelos de IA
          </span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Escaneie repositórios para descobrir <strong>Shadow AI</strong>, avaliar conformidade com <strong>EU AI Act, LGPD, GDPR, NIST AI RMF, ISO 42001 e OWASP</strong>, e gerar correções com inteligência artificial.
        </p>
      </div>

      {/* Main Scanner Box */}
      <div className="max-w-3xl mx-auto">
        <div className="glass-panel p-2 sm:p-3 rounded-2xl border border-surface-border shadow-2xl relative">
          
          {/* GitHub URL Form */}
          <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <input
                type="text"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="Insira a URL pública do GitHub (ex: https://github.com/owner/repo)..."
                disabled={isScanning}
                className="w-full pl-10 pr-4 py-3 bg-[#0b1120] text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700/60 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isScanning || !gitUrl.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm rounded-xl transition-all shadow-glow-cyan flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <span>Escanear Repositório</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Drag & Drop or Upload bar */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`mt-3 p-3 rounded-xl border-2 border-dashed transition-all flex flex-wrap items-center justify-between text-xs gap-3 ${
              isDragOver ? 'border-cyan-400 bg-cyan-950/20' : 'border-slate-800 bg-[#0b1120]/60'
            }`}
          >
            <div className="flex items-center space-x-2 text-slate-400">
              <FolderUp className="w-4 h-4 text-slate-300" />
              <span>Ou analise localmente sem subir para a nuvem: <strong>arraste pasta ou .zip aqui</strong></span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => e.target.files?.[0] && onScanZip(e.target.files[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                disabled={isScanning}
                className="px-2.5 py-1 bg-surface rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors flex items-center space-x-1"
              >
                <FileArchive className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload .ZIP</span>
              </button>

              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={(e) => e.target.files && onScanFolder(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isScanning}
                className="px-2.5 py-1 bg-surface rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors flex items-center space-x-1"
              >
                <FolderUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Selecionar Pasta</span>
              </button>
            </div>
          </div>

          {/* Scanning Progress Bar */}
          {isScanning && (
            <div className="mt-3 p-3 bg-surface rounded-xl border border-cyan-800/40 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300 font-mono flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>{scanProgress.message}</span>
                </span>
                <span className="text-slate-400 font-mono">{scanProgress.percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${scanProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Demo Projects Quick Start */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Play className="w-3 h-3 text-cyan-400" />
              <span>Experimente com 1 clique (Projetos de Demonstração):</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_PROJECTS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => onSelectDemo(demo)}
                disabled={isScanning}
                className="text-left p-3 rounded-xl bg-surface/70 border border-surface-border hover:border-cyan-500/40 hover:bg-surface transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {demo.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                  {demo.description}
                </p>
                <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-cyan-950/80 text-cyan-300 rounded border border-cyan-800/40">
                  {demo.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Feature Highlights Grid */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-6 border-t border-surface-border/50 text-center">
        <div className="p-3">
          <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-200">13 Regulações</div>
          <div className="text-[11px] text-slate-500">EU AI Act, LGPD, GDPR, NIST</div>
        </div>

        <div className="p-3">
          <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-200">Detecção de Shadow AI</div>
          <div className="text-[11px] text-slate-500">CrewAI, LangChain, Swarm</div>
        </div>

        <div className="p-3">
          <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-200">SiliconFlow AI</div>
          <div className="text-[11px] text-slate-500">Auto-remediação & Pareceres</div>
        </div>

        <div className="p-3">
          <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-200">100% Client-Side</div>
          <div className="text-[11px] text-slate-500">Privacidade Total de Código</div>
        </div>
      </div>

    </div>
  );
};
