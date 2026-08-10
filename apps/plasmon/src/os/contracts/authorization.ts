import type { JsonValue } from "./common.ts";

/** Opaque provider locator for a published Plasmon resource. */
export interface ResourceRef {
  providerId: string;
  resourceId: string;
  revision: string;
  metadata?: Record<string, JsonValue>;
}

export type ResourceRight = "read" | "write" | "reshare";

export interface IssueResourceGrantRequest {
  resource: ResourceRef;
  rights: readonly ResourceRight[];
  audience?: string;
  expiresAt?: number;
}

export interface IssuedResourceGrant {
  grantId: string;
  token: string;
  resource: ResourceRef;
  rights: readonly ResourceRight[];
  audience?: string;
  expiresAt?: number;
}

export interface ResourceGrantSummary {
  grantId: string;
  resource: ResourceRef;
  rights: readonly ResourceRight[];
  audience?: string;
  expiresAt?: number;
  revoked: boolean;
}

export interface RedeemResourceGrantRequest {
  token: string;
}

/**
 * Authorization result returned by the authorization provider. Callers treat
 * it as evidence of rights over one ResourceRef; MTN-specific trusted context
 * and authorization-epoch enforcement remain inside the adapter/runtime.
 */
export interface ResourceAuthorization {
  grantId: string;
  resource: ResourceRef;
  rights: readonly ResourceRight[];
  audience?: string;
  expiresAt?: number;
}

/**
 * Generic authorization boundary. The production implementation may be backed
 * by MTN, while preview tests can use a fake and vanilla Neutron can expose an
 * unavailable implementation. Plasmon sharing must not implement bearer-secret
 * hashing, grant revocation semantics, authorization epochs, or AppScope routing.
 */
export interface ResourceAuthorizationService {
  readonly available: boolean;
  issue(request: IssueResourceGrantRequest): Promise<IssuedResourceGrant>;
  inspect(grantId: string): Promise<ResourceGrantSummary>;
  redeem(request: RedeemResourceGrantRequest): Promise<ResourceAuthorization>;
  revoke(grantId: string): Promise<void>;
}
