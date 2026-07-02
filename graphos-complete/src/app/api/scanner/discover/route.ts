import { NextRequest, NextResponse } from 'next/server';
import { discoverRepo } from '@/scanner';
import { cacheScannerResult } from '@/graphos/scanner-cache';
import type { ViewName } from '@council/graphos';
import { VIEW_BUILDERS, VIEW_META } from '@council/graphos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { repoUrl, branch, githubToken, view } = body;

    if (!repoUrl) {
      return NextResponse.json({ ok: false, error: 'repoUrl is required' }, { status: 400 });
    }

    const result = await discoverRepo({ repoUrl, branch, githubToken });

    cacheScannerResult(repoUrl, result.graphosEngine, result);

    const selectedView: ViewName = view ?? 'board';
    const builder = VIEW_BUILDERS[selectedView];
    if (!builder) {
      return NextResponse.json({ ok: false, error: `Invalid view: ${view}` }, { status: 400 });
    }

    const viewResult = builder(result.graphosEngine);

    const entities = result.graphosEngine.getEntitiesByKind('agent');
    const allRels = result.graphosEngine.getRelationships();
    const entityCount = Array.from(new Set([
      ...allRels.map(r => r.sourceId),
      ...allRels.map(r => r.targetId),
    ])).filter(id => result.graphosEngine.getEntity(id)).length;

    return NextResponse.json({
      ok: true,
      data: {
        repo: {
          name: result.repo.name,
          fullName: result.repo.fullName,
          description: result.repo.description,
          stars: result.repo.stars,
          hasLicense: result.repo.hasLicense,
          licenseName: result.repo.licenseName,
          language: result.repo.language,
          fileCount: result.repo.fileCount,
          topics: result.repo.topics,
        },
        summary: {
          packageName: result.packages.name,
          totalDeps: Object.keys(result.packages.dependencies).length + Object.keys(result.packages.devDependencies).length,
          aiDeps: result.packages.aiDependencies,
          dbDeps: result.packages.dbDependencies,
          apiRoutes: result.source.apiRoutes.length,
          dataAssets: result.source.dataAssets.length,
          externalServices: result.source.externalServices.map(s => s.name),
          aiModels: result.source.aiModels.map(m => `${m.provider} ${m.modelId ?? ''}`.trim()),
          agentsDetected: result.source.agents.map(a => a.name),
          totalRisks: result.risks.length,
          totalEntities: entityCount,
          totalRelationships: allRels.length,
          criticalRisks: result.risks.filter(r => r.severity === 'critical').length,
          highRisks: result.risks.filter(r => r.severity === 'high').length,
          complianceScore: result.compliance.overallScore,
          complianceSummary: result.compliance.summary,
          strictMode: result.configs.typescript?.strict ?? false,
          hasTests: result.packages.hasTestFramework,
          hasCICD: result.configs.hasCICD,
          hasDocker: result.configs.hasDocker,
        },
        risks: result.risks.map(r => ({
          id: r.id,
          severity: r.severity,
          category: r.category,
          title: r.title,
          description: r.description,
          recommendation: r.recommendation,
          cgagControl: r.cgagControl,
        })),
        regulations: result.compliance.applicableRegulations.map(r => ({
          id: r.id,
          name: r.name,
          authority: r.authority,
          status: r.status,
          requirements: r.requirements,
          gaps: r.gaps,
          evidenceFound: r.evidenceFound,
        })),
        graphos: {
          view: selectedView,
          title: viewResult.title,
          description: viewResult.description,
          summary: viewResult.summary,
          meta: VIEW_META[selectedView],
        },
      },
    });
  } catch (err) {
    console.error('[Scanner API] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
