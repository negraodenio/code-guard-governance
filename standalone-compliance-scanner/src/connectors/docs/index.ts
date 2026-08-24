export type { DocsConnector, DocsConfig, DocsPage, DocsProvider } from './types';
export { htmlToText } from './types';
export { ConfluenceConnector } from './confluence';
export { SharePointConnector } from './sharepoint';
export { NotionConnector } from './notion';

import type { DocsProvider, DocsConnector } from './types';
import { ConfluenceConnector } from './confluence';
import { SharePointConnector } from './sharepoint';
import { NotionConnector } from './notion';

const DOCS_CONNECTORS: Record<DocsProvider, DocsConnector> = {
  confluence: new ConfluenceConnector(),
  sharepoint: new SharePointConnector(),
  notion: new NotionConnector(),
};

export function getDocsConnector(provider: DocsProvider): DocsConnector {
  const c = DOCS_CONNECTORS[provider];
  if (!c) throw new Error(`No docs connector: ${provider}`);
  return c;
}
