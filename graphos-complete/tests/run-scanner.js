// Direct scanner runner - bypasses Next.js API
const path = require('path');
process.env.NODE_ENV = 'test';
// Load dotenv manually
try {
  const dotenv = require('dotenv');
  const result = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
  if (result.error) console.error('dotenv error:', result.error.message);
} catch (e) {}

async function main() {
  // Register TS compilation
  require('ts-node').register({
    project: path.join(__dirname, '..', 'tsconfig.json'),
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      esModuleInterop: true,
      paths: {
        '@/*': [path.join(__dirname, '..', 'src', '*')]
      }
    }
  });

  const { discoverRepo } = require('../src/scanner/index');
  const { VIEW_BUILDERS, VIEW_META } = require('../src/graphos/views');

  const repoUrl = process.argv[2] || 'https://github.com/negraodenio/aegishub-ai';
  const viewName = process.argv[3] || 'ceo';

  console.log(`\n=== Scanning: ${repoUrl} [${viewName} view] ===\n`);

  const result = await discoverRepo({ repoUrl });

  // Print repo info
  console.log('REPO:', JSON.stringify({
    name: result.repo.name,
    fullName: result.repo.fullName,
    description: result.repo.description,
    stars: result.repo.stars,
    hasLicense: result.repo.hasLicense,
    licenseName: result.repo.licenseName,
    language: result.repo.language,
    fileCount: result.repo.fileCount,
    topics: result.repo.topics,
  }, null, 2));

  // Print summary
  console.log('\nSUMMARY:', JSON.stringify({
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
    criticalRisks: result.risks.filter(r => r.severity === 'critical').length,
    complianceScore: result.compliance.overallScore,
  }, null, 2));

  // Print risks
  console.log('\nRISKS:');
  for (const r of result.risks) {
    console.log(`  [${r.severity.toUpperCase()}] ${r.title}`);
    console.log(`         ${r.description.slice(0, 100)}`);
  }

  // Print regulations
  console.log('\nREGULATIONS:');
  for (const reg of result.compliance.applicableRegulations) {
    console.log(`  ${reg.name} [${reg.status.toUpperCase()}]: ${reg.gaps.join('; ') || 'OK'}`);
  }

  // Print all agents detected
  console.log('\nAGENTS DETECTED:', result.source.agents.map(a => ({
    name: a.name,
    type: a.type,
    tools: a.tools,
    models: a.models,
    riskLevel: a.riskLevel,
  })));

  // Print all data assets
  console.log('\nDATA ASSETS:', result.source.dataAssets.map(d => ({
    name: d.name,
    type: d.type,
    hasPII: d.hasPII,
    legalBasis: d.legalBasis,
  })));

  // Print all AI models
  console.log('\nAI MODELS:', result.source.aiModels);
  console.log('\nEXTERNAL SERVICES:', result.source.externalServices);
  console.log('\nAPI ROUTES:', result.source.apiRoutes.map(r => `${r.method} ${r.path} auth=${r.authRequired}`));
  console.log('\nLANGUAGES:', result.source.languages);
  console.log('\nFILE TREE (first 30):', result.source.fileTree.slice(0, 30));

  // Apply view
  const builder = VIEW_BUILDERS[viewName];
  if (builder) {
    const viewResult = builder(result.graphosEngine);
    console.log(`\nVIEW [${viewName}]:`, viewResult.title);
    console.log('  Description:', viewResult.description);
    console.log('  Summary:', viewResult.summary);
    if (viewResult.cards) console.log('  Cards:', JSON.stringify(viewResult.cards, null, 2));
    if (viewResult.nodes) console.log('  Nodes:', viewResult.nodes?.length);
    if (viewResult.edges) console.log('  Edges:', viewResult.edges?.length);
    if (viewResult.risks) console.log('  Risks:', viewResult.risks?.length);
    if (viewResult.score) console.log('  Score:', viewResult.score);
  }

  // Print graph stats
  const engine = result.graphosEngine;
  console.log(`\nGRAPH STATS: ${engine.entities.length} entities, ${engine.relationships.length} relationships`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
