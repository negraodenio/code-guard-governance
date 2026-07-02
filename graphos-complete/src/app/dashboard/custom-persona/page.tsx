'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/ui/Navbar';

type Persona = {
    id: string;
    name: string;
    role: string;
    description: string;
    color: string;
    emoji: string;
    document_count: number;
    is_active: boolean;
    created_at: string;
    custom_persona_documents?: Doc[];
};

type Doc = {
    id: string;
    filename: string;
    file_type: string;
    chunk_count: number;
    status: string;
    created_at: string;
};

const COLORS = ['#0ECFB8', '#5B50F0', '#F59E0B', '#F87171', '#94A3B8', '#F0F4FA'];
const EMOJIS = ['🏛️', '📊', '🧠', '🎯', '🔬', '💡', '🛡️', '⚡'];

export default function CustomPersonaPage() {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [role, setRole] = useState('Internal Strategic Advisor');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#0ECFB8');
    const [emoji, setEmoji] = useState('🏛️');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);


    const fetchPersonas = useCallback(async () => {
        const res = await fetch('/api/custom-persona');
        const data = await res.json();
        setPersonas(data.personas || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/custom-persona', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, role, description, color, emoji }),
            });
            const data = await res.json();
            if (res.ok) {
                const newPersonaId = data.persona.id;

                if (pendingFiles.length > 0) {
                    setUploading(true);
                    for (const file of pendingFiles) {
                        const formData = new FormData();
                        formData.append('persona_id', newPersonaId);
                        formData.append('file', file);
                        formData.append('filename', file.name);
                        await fetch('/api/custom-persona/upload', { method: 'POST', body: formData });
                    }
                    setUploading(false);
                }

                setName(''); setDescription('');
                setPendingFiles([]);
                await fetchPersonas();
            } else {
                if (data.code === 'UPGRADE_REQUIRED') {
                    alert(`Access Denied: ${data.error}`);
                    window.location.href = '/pricing';
                } else {
                    alert(`Failed to create expert: ${data.error || 'Unknown error'}`);
                }
            }
        } catch (err) {
            alert('A network error occurred while creating the expert.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this persona? All documents and training data will be permanently removed.')) return;
        await fetch(`/api/custom-persona?id=${id}`, { method: 'DELETE' });
        await fetchPersonas();
    };

    const handleUpload = async (personaId: string, files: FileList) => {
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('persona_id', personaId);
                formData.append('file', file);
                formData.append('filename', file.name);
                const res = await fetch('/api/custom-persona/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                    const data = await res.json();
                    alert(`Failed to upload ${file.name}: ${data.error || 'Unknown error'}`);
                }
            }
        } catch (err) {
            alert('A network error occurred during upload.');
        } finally {
            await fetchPersonas();
            setUploading(false);
        }
    };

    const handleTextUpload = async (personaId: string) => {
        const text = prompt('Paste your text content (business plan, strategy doc, financials, etc.):');
        if (!text || text.length < 100) { alert('Content must be at least 100 characters.'); return; }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('persona_id', personaId);
            formData.append('text_content', text);
            formData.append('filename', `text-${Date.now()}.txt`);
            const res = await fetch('/api/custom-persona/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const data = await res.json();
                alert(`Failed to save text content: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            alert('A network error occurred while saving text.');
        } finally {
            await fetchPersonas();
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            
            <main className="max-w-[1160px] mx-auto px-6 md:px-15 py-16 animate-fade-up">
                
                {/* Header */}
                <div className="mb-16">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted)] hover:text-[var(--teal)] transition-colors mb-8">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Back to Dashboard
                    </Link>
                    <h1 className="premium-heading text-5xl md:text-6xl text-[var(--text)] mb-4">Perspective <span className="text-[var(--muted)] italic font-light">Training</span></h1>
                    <p className="text-lg text-[var(--muted-2)] font-light max-w-2xl leading-relaxed">
                        Synthesize corporate knowledge into a proprietary Council member. By ingesting your internal documentation, this perspective argues using your specific business logic.
                    </p>
                </div>

                {/* Create Form */}
                <div className="premium-card premium-card-accent mb-12">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-10">Initialize Training</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] block mb-3">Perspective Name</label>
                            <input
                                type="text" value={name} onChange={e => setName(e.target.value)}
                                placeholder="e.g. Acme Strategic Advisor"
                                className="premium-input"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] block mb-3">Organizational Role</label>
                            <input
                                type="text" value={role} onChange={e => setRole(e.target.value)}
                                placeholder="e.g. Chief Strategy Officer"
                                className="premium-input"
                            />
                        </div>
                    </div>

                    <div className="mb-10">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] block mb-3">Behavioral Brief (Optional)</label>
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Define the cognitive framework, priorities, and adversarial triggers for this perspective..."
                            rows={3}
                            className="premium-input min-h-[100px] resize-none"
                        />
                    </div>

                    {/* Training Data Input */}
                    <div className="mb-10">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] block mb-4">Training Assets (.pdf, .txt, .md)</label>
                        <div className="space-y-4">
                            <label className="flex items-center justify-center gap-4 w-full bg-[var(--surface-2)] border border-dashed border-[var(--border)] rounded-2xl py-10 cursor-pointer hover:border-[var(--teal)] transition-all group">
                                <input type="file" multiple accept=".txt,.md,.pdf" className="hidden"
                                    onChange={e => e.target.files && setPendingFiles([...pendingFiles, ...Array.from(e.target.files)])} />
                                <span className="material-symbols-outlined text-[var(--muted)] group-hover:scale-110 transition-transform">upload_file</span>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Attach Strategic Documents</span>
                            </label>

                            {pendingFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {pendingFiles.map((f, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-full px-4 py-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px] text-[var(--text)]">{f.name}</span>
                                            <button onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                                                className="text-red-400 hover:text-red-600 transition-colors">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-12 mb-12">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] block mb-4">Color Profile</label>
                            <div className="flex gap-3">
                                {COLORS.map(c => (
                                    <button key={c} onClick={() => setColor(c)}
                                        className={`size-6 rounded-full transition-all ${color === c ? 'ring-2 ring-[var(--teal)] ring-offset-4 ring-offset-[var(--surface)] scale-110' : 'opacity-40 hover:opacity-100'}`}
                                        style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)] block mb-4">Perspective Icon</label>
                            <div className="flex gap-2">
                                {EMOJIS.map(e => (
                                    <button key={e} onClick={() => setEmoji(e)}
                                        className={`size-10 rounded-xl flex items-center justify-center text-xl transition-all ${emoji === e ? 'bg-gradient-to-br from-[var(--teal)] to-[var(--indigo)] text-white shadow-lg' : 'bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface)]'}`}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleCreate} disabled={creating || !name.trim()}
                        className="premium-button premium-button-primary px-12 py-4">
                        {creating || uploading ? (uploading ? 'Processing Assets...' : 'Synchronizing...') : 'Finalize Training'}
                    </button>
                </div>

                {/* Active Perspectives */}
                <div className="mb-8 flex items-center gap-4">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Active Perspectives</h2>
                    <div className="flex-1 h-px bg-[var(--border)]"></div>
                </div>

                {loading ? (
                    <div className="text-center text-[var(--muted)] py-20 font-bold uppercase tracking-[0.4em] text-[11px] animate-premium-pulse">Syncing Perspectives...</div>
                ) : personas.length === 0 ? (
                    <div className="premium-card py-24 text-center border-dashed border-[var(--border)] bg-transparent">
                        <span className="material-symbols-outlined text-4xl text-[var(--border-hover)] mb-6">psychology_alt</span>
                        <h3 className="text-2xl font-syne font-bold mb-2">No Trained Perspectives</h3>
                        <p className="text-[var(--muted-2)] max-w-xs mx-auto font-light">Initialize training to create a proprietary voice for the Council.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {personas.map((p, idx) => {
                            const docs = p.custom_persona_documents || [];
                            const isOpen = selectedPersona === p.id;
                            const readyDocs = docs.filter(d => d.status === 'ready').length;
                            const totalChunks = docs.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

                            return (
                                <div key={p.id} className="premium-card p-0 animate-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    {/* Persona Header */}
                                    <div 
                                        className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                                        onClick={() => setSelectedPersona(isOpen ? null : p.id)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="size-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-[var(--border)]"
                                                style={{ backgroundColor: p.color + '10' }}>
                                                {p.emoji}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold font-syne tracking-tight uppercase" style={{ color: p.color }}>{p.name}</h3>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{p.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-10">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[var(--text)]">{readyDocs} Documents</p>
                                                <p className="text-[10px] font-medium text-[var(--muted)] tracking-wider">{totalChunks} Strategic Chunks</p>
                                            </div>
                                            <span className="material-symbols-outlined text-[var(--muted)] transition-transform duration-500" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isOpen && (
                                        <div className="border-t border-[var(--border)] p-8 space-y-10 bg-[var(--surface-2)]/30">
                                            {p.description && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Strategic Brief</h4>
                                                    <p className="text-sm text-[var(--muted-2)] leading-relaxed italic font-light">&quot;{p.description}&quot;</p>
                                                </div>
                                            )}

                                            {/* Upload Area */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="cursor-pointer">
                                                    <input type="file" multiple accept=".txt,.md,.csv,.pdf"
                                                        className="hidden"
                                                        onChange={e => e.target.files && handleUpload(p.id, e.target.files)} />
                                                    <div className="border border-dashed border-[var(--border)] rounded-2xl p-8 text-center hover:border-[var(--teal)] hover:bg-[var(--surface-2)] transition-all group">
                                                        <span className="material-symbols-outlined text-[var(--muted)] mb-2 group-hover:scale-110 transition-transform">add_circle</span>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                                                            {uploading ? 'Processing...' : 'Upload Asset'}
                                                        </p>
                                                    </div>
                                                </label>
                                                <button onClick={() => handleTextUpload(p.id)}
                                                    className="border border-[var(--border)] rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-[var(--surface-2)] hover:border-[var(--teal)] transition-all group">
                                                    <span className="material-symbols-outlined text-[var(--muted)] mb-2 group-hover:scale-110 transition-transform">edit_note</span>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Paste Intelligence</p>
                                                </button>
                                            </div>

                                            {/* Document List */}
                                            {docs.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Intelligence Assets</h4>
                                                    {docs.map(d => (
                                                        <div key={d.id} className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 transition-all hover:border-[var(--border-hover)]">
                                                            <div className="flex items-center gap-4">
                                                                <span className="material-symbols-outlined text-[var(--muted)] text-xl">{d.file_type === 'pdf' ? 'picture_as_pdf' : 'description'}</span>
                                                                <span className="text-[12px] font-medium tracking-tight truncate max-w-[250px] text-[var(--text)]">{d.filename}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{d.chunk_count} Chunks</span>
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${d.status === 'ready'
                                                                    ? 'text-[var(--teal)] border border-[var(--teal-dim)]'
                                                                    : 'text-[var(--indigo)] border border-[var(--indigo-dim)]'
                                                                    }`}>
                                                                    {d.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex justify-end pt-4">
                                                <button onClick={() => handleDelete(p.id)}
                                                    className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    Delete Perspective
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
