import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MarketplacePage() {
    const supabase = await createClient();

    const { data: templates } = await supabase
        .from('council_templates')
        .select('*')
        .eq('public', true)
        .order('vertical');

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Council Templates Marketplace</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates?.map((t) => (
                        <div key={t.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-purple-500/50 transition-colors">
                            <div className="text-xs font-bold uppercase text-purple-400 mb-2">{t.vertical}</div>
                            <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
                            <p className="text-sm text-slate-300 mb-4">{t.description}</p>

                            <div className="flex gap-2 text-xs text-slate-400 mb-4">
                                <span className="px-2 py-1 bg-white/5 rounded">{t.region}</span>
                                <span className="px-2 py-1 bg-white/5 rounded">{t.sensitivity}</span>
                            </div>

                            <Link
                                href={`/?template=${t.id}`}
                                className="block text-center px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-400 rounded font-bold text-sm"
                            >
                                Use Template
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
