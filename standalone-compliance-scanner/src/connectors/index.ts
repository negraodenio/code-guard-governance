// ─────────────────────────────────────────────────────────────────────────────
// CodeGuard Connector SDK
// "Connect any source. Govern every agent."
// ─────────────────────────────────────────────────────────────────────────────

// Types
export type {
  SourceConnector, ConnectorConfig, ConnectorFile, ConnectorRepoMeta,
  CiCdSignal, IacAiSignal, SourceProvider,
} from './types';

// Providers
export { GitHubConnector } from './github';
export { GitLabConnector } from './gitlab';
export { GiteaConnector, ForgejoConnector } from './gitea';
export { BitbucketConnector } from './bitbucket';
export { AzureDevOpsConnector } from './azure-devops';

// Registry + factory
export {
  getConnector, getConnectorForUrl, detectProvider, buildConfig, normaliseRepoUrl, CONNECTORS,
} from './registry';

// CI/CD + IaC detectors (file-based, zero API)
export { detectCiCd, detectIacAi } from './cicd-iac';

// Identity connectors (Entra ID, Okta, Keycloak)
export type {
  IdentityConnector, IdentityConfig, IdentityUser, IdentityGroup,
  IdentitySyncResult, IdentityProvider,
} from './identity';
export { EntraIdConnector, OktaConnector, KeycloakConnector, getIdentityConnector, isGovernanceRelevant } from './identity';

// Docs connectors (Confluence, SharePoint, Notion)
export type { DocsConnector, DocsConfig, DocsPage, DocsProvider } from './docs';
export { ConfluenceConnector, SharePointConnector, NotionConnector, getDocsConnector, htmlToText } from './docs';
