import type {
  IssueResourceGrantRequest,
  IssuedResourceGrant,
  RedeemResourceGrantRequest,
  ResourceAuthorization,
  ResourceAuthorizationService,
  ResourceGrantSummary,
} from "../contracts/index.ts";

interface FakeGrantState {
  grant: IssuedResourceGrant;
  revoked: boolean;
}

function cloneGrant(grant: IssuedResourceGrant): IssuedResourceGrant {
  return {
    ...grant,
    resource: {
      ...grant.resource,
      ...(grant.resource.metadata ? { metadata: { ...grant.resource.metadata } } : {}),
    },
    rights: [...grant.rights],
  };
}

export class FakeResourceAuthorizationService implements ResourceAuthorizationService {
  readonly available = true;
  private readonly grants = new Map<string, FakeGrantState>();
  private readonly byToken = new Map<string, string>();

  async issue(request: IssueResourceGrantRequest): Promise<IssuedResourceGrant> {
    const grantId = `grant:${crypto.randomUUID()}`;
    const token = `fake-share:${crypto.randomUUID()}`;
    const grant: IssuedResourceGrant = {
      grantId,
      token,
      resource: {
        ...request.resource,
        ...(request.resource.metadata ? { metadata: { ...request.resource.metadata } } : {}),
      },
      rights: [...request.rights],
      ...(request.audience === undefined ? {} : { audience: request.audience }),
      ...(request.expiresAt === undefined ? {} : { expiresAt: request.expiresAt }),
    };
    this.grants.set(grantId, { grant, revoked: false });
    this.byToken.set(token, grantId);
    return cloneGrant(grant);
  }

  async inspect(grantId: string): Promise<ResourceGrantSummary> {
    const state = this.grants.get(grantId);
    if (!state) throw new Error(`Unknown resource grant: ${grantId}`);
    const grant = state.grant;
    return {
      grantId: grant.grantId,
      resource: {
        ...grant.resource,
        ...(grant.resource.metadata ? { metadata: { ...grant.resource.metadata } } : {}),
      },
      rights: [...grant.rights],
      ...(grant.audience === undefined ? {} : { audience: grant.audience }),
      ...(grant.expiresAt === undefined ? {} : { expiresAt: grant.expiresAt }),
      revoked: state.revoked,
    };
  }

  async redeem(request: RedeemResourceGrantRequest): Promise<ResourceAuthorization> {
    const grantId = this.byToken.get(request.token);
    if (!grantId) throw new Error("Unknown resource grant token");
    const state = this.grants.get(grantId);
    if (!state || state.revoked) throw new Error("Resource grant is revoked");
    if (state.grant.expiresAt !== undefined && state.grant.expiresAt <= Date.now()) {
      throw new Error("Resource grant is expired");
    }
    const grant = state.grant;
    return {
      grantId: grant.grantId,
      resource: {
        ...grant.resource,
        ...(grant.resource.metadata ? { metadata: { ...grant.resource.metadata } } : {}),
      },
      rights: [...grant.rights],
      ...(grant.audience === undefined ? {} : { audience: grant.audience }),
      ...(grant.expiresAt === undefined ? {} : { expiresAt: grant.expiresAt }),
    };
  }

  async revoke(grantId: string): Promise<void> {
    const state = this.grants.get(grantId);
    if (!state) throw new Error(`Unknown resource grant: ${grantId}`);
    state.revoked = true;
  }
}

export class UnavailableResourceAuthorizationService implements ResourceAuthorizationService {
  readonly available = false;

  private unavailable(): never {
    throw new Error("Resource authorization is unavailable in this runtime");
  }

  async issue(_request: IssueResourceGrantRequest): Promise<IssuedResourceGrant> {
    return this.unavailable();
  }

  async inspect(_grantId: string): Promise<ResourceGrantSummary> {
    return this.unavailable();
  }

  async redeem(_request: RedeemResourceGrantRequest): Promise<ResourceAuthorization> {
    return this.unavailable();
  }

  async revoke(_grantId: string): Promise<void> {
    return this.unavailable();
  }
}
