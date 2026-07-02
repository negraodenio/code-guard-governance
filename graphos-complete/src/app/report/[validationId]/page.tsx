import { createClient } from '@/lib/supabase/server';
import ConsensusReport from '@/ui/ConsensusReport';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ validationId: string }> }) {
    const { validationId } = await params;
    const supabase = await createClient();

    // 1) Buscar validation
    const { data: validation, error: vErr } = await supabase
        .from('validations')
        .select('*')
        .eq('id', validationId)
        .single();

    if (vErr || !validation) {
        redirect('/login');
    }

    // 2) Buscar patches associados
    const { data: _patches } = await supabase
        .from('code_patches')
        .select('*')
        .eq('validation_id', validationId)
        .order('created_at', { ascending: false });

    // 3) Pass para componente client
    return <ConsensusReport validation={validation} />;
}
