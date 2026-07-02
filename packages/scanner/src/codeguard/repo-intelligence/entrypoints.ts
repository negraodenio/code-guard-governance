import type { RepoFileInfo, Service } from "./types";

const ENTRYPOINT_PATTERNS: Array<{ name: string; regex: RegExp; type: string }> = [
  { name: "main.ts", regex: /\/main\.ts$/, type: "entrypoint" },
  { name: "main.tsx", regex: /\/main\.tsx$/, type: "entrypoint" },
  { name: "index.ts", regex: /\/index\.ts$/, type: "entrypoint" },
  { name: "server.ts", regex: /\/server\.ts$/, type: "entrypoint" },
  { name: "app.ts", regex: /\/app\.ts$/, type: "entrypoint" },
  { name: "main.py", regex: /\/main\.py$/, type: "entrypoint" },
  { name: "manage.py", regex: /\/manage\.py$/, type: "entrypoint" },
  { name: "app.py", regex: /\/app\.py$/, type: "entrypoint" },
  { name: "wsgi.py", regex: /\/wsgi\.py$/, type: "entrypoint" },
  { name: "asgi.py", regex: /\/asgi\.py$/, type: "entrypoint" },
  { name: "Program.cs", regex: /\/Program\.cs$/, type: "entrypoint" },
  { name: "Startup.cs", regex: /\/Startup\.cs$/, type: "entrypoint" },
  { name: "main.go", regex: /\/main\.go$/, type: "entrypoint" },
  { name: "cmd/main.go", regex: /cmd\/main\.go$/, type: "entrypoint" },
  { name: "main.rs", regex: /\/main\.rs$/, type: "entrypoint" },
  { name: "Application.java", regex: /\/Application\.java$/, type: "entrypoint" },
  { name: "next.config", regex: /next\.config\.[jt]s/, type: "framework_config" },
  { name: "package.json", regex: /\/package\.json$/, type: "project_manifest" },
  { name: "Cargo.toml", regex: /\/Cargo\.toml$/, type: "project_manifest" },
  { name: "go.mod", regex: /\/go\.mod$/, type: "project_manifest" },
  { name: "pom.xml", regex: /\/pom\.xml$/, type: "project_manifest" },
  { name: "requirements.txt", regex: /\/requirements\.txt$/, type: "project_manifest" },
  { name: "pyproject.toml", regex: /\/pyproject\.toml$/, type: "project_manifest" },
  { name: "Dockerfile", regex: /\/Dockerfile$/, type: "infrastructure" },
  { name: "docker-compose", regex: /docker-compose\.ya?ml$/, type: "infrastructure" },
  { name: "Makefile", regex: /\/Makefile$/, type: "infrastructure" },
];

const SERVICE_PATTERNS: Array<{ type: string; pathRegexes: RegExp[]; namePattern: RegExp }> = [
  { type: "api_service", pathRegexes: [/\/api\//, /\/routes\//, /\/controllers\//], namePattern: /^(api|routes|controllers)$/i },
  { type: "batch_service", pathRegexes: [/\/workers\//, /\/jobs\//, /\/consumers\//, /\/cron\//], namePattern: /^(worker|job|cron|consumer|processor)s?$/i },
  { type: "domain_service", pathRegexes: [/\/services\//, /\/domain\//, /\/usecases\//], namePattern: /^(service|domain|usecase)s?$/i },
  { type: "data_service", pathRegexes: [/\/repositories\//, /\/dao\//, /\/database\//, /\/db\//], namePattern: /^(repo|repository|dao|database|db)$/i },
  { type: "ai_service", pathRegexes: [/\/agents\//, /\/ai\//, /\/llm\//, /\/orchestrat\//], namePattern: /^(agent|ai|llm|orchestrat).*$/i },
  { type: "notification_service", pathRegexes: [/\/notifications?\//, /\/email\//, /\/sms\//], namePattern: /^(notification|email|sms|messaging).*$/i },
  { type: "webhook_service", pathRegexes: [/\/webhooks?\//, /\/hooks\//], namePattern: /^(webhook|hook|callback).*$/i },
];

export function detectEntrypoints(files: RepoFileInfo[]): {
  entrypoints: string[];
  services: Service[];
  frameworks: string[];
} {
  const entrypoints: string[] = [];
  const services: Service[] = [];
  const frameworkHints = new Set<string>();

  for (const file of files) {
    for (const pattern of ENTRYPOINT_PATTERNS) {
      if (pattern.regex.test(file.path)) {
        if (pattern.type === "entrypoint") entrypoints.push(file.path);
        if (pattern.type === "framework_config") frameworkHints.add(pattern.name);
        break;
      }
    }
  }

  const dirsWithFiles = new Map<string, RepoFileInfo[]>();
  for (const file of files) {
    const dir = file.dir || "root";
    if (!dirsWithFiles.has(dir)) dirsWithFiles.set(dir, []);
    dirsWithFiles.get(dir)!.push(file);
  }

  for (const [dir, dirFiles] of dirsWithFiles) {
    if (dir === "root" || dirFiles.length < 3) continue;

    for (const pattern of SERVICE_PATTERNS) {
      const matchesPath = pattern.pathRegexes.some((r) => r.test(dir));
      const dirName = dir.split("/").pop() ?? "";
      const matchesName = pattern.namePattern.test(dirName);

      if (matchesPath || matchesName) {
        const existing = services.find((s) => s.path === dir);
        if (!existing) {
          services.push({
            name: dirName,
            type: pattern.type,
            path: dir,
            confidence: matchesPath ? 75 : 50,
          });
        }
      }
    }
  }

  if (entrypoints.length === 0) {
    entrypoints.push(files[0]?.path ?? "unknown");
  }

  return { entrypoints: entrypoints.filter((v, i, a) => a.indexOf(v) === i), services, frameworks: [...frameworkHints] };
}