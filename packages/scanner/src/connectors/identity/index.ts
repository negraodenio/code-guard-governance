export type { IdentityConnector, IdentityConfig, IdentityUser, IdentityGroup, IdentitySyncResult, IdentityProvider } from './types';
export { isGovernanceRelevant } from './types';
export { EntraIdConnector } from './entra-id';
export { OktaConnector } from './okta';
export { KeycloakConnector } from './keycloak';

import type { IdentityProvider } from './types';
import type { IdentityConnector } from './types';
import { EntraIdConnector } from './entra-id';
import { OktaConnector } from './okta';
import { KeycloakConnector } from './keycloak';

const IDENTITY_CONNECTORS: Record<IdentityProvider, IdentityConnector> = {
  'entra-id': new EntraIdConnector(),
  'okta': new OktaConnector(),
  'keycloak': new KeycloakConnector(),
};

export function getIdentityConnector(provider: IdentityProvider): IdentityConnector {
  const c = IDENTITY_CONNECTORS[provider];
  if (!c) throw new Error(`No identity connector: ${provider}`);
  return c;
}
