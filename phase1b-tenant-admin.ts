import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { localIdentityFromSeed } from "./packages/neutron-provision/src/kernel.ts";

const [action, canisterId, principalText, appId] = Bun.argv.slice(2);

if (
  !["grant", "revoke", "list"].includes(action ?? "") ||
  !canisterId ||
  !principalText
) {
  console.error(
    "Usage:\n" +
      "  bun phase1b-tenant-admin.ts grant  CANISTER PRINCIPAL APP_ID\n" +
      "  bun phase1b-tenant-admin.ts revoke CANISTER PRINCIPAL APP_ID\n" +
      "  bun phase1b-tenant-admin.ts list   CANISTER PRINCIPAL",
  );
  process.exit(1);
}

if ((action === "grant" || action === "revoke") && !appId) {
  throw new Error(`${action} requires APP_ID`);
}

const idlFactory = ({ IDL }: { IDL: typeof import("@dfinity/candid").IDL }) =>
  IDL.Service({
    kernel_tenant_grant: IDL.Func(
      [
        IDL.Record({
          principal: IDL.Principal,
          app_id: IDL.Text,
        }),
      ],
      [],
      [],
    ),

    kernel_tenant_revoke: IDL.Func(
      [
        IDL.Record({
          principal: IDL.Principal,
          app_id: IDL.Text,
        }),
      ],
      [],
      [],
    ),

    kernel_tenant_apps: IDL.Func(
      [
        IDL.Record({
          principal: IDL.Principal,
        }),
      ],
      [IDL.Vec(IDL.Text)],
      ["query"],
    ),
  });

type TenantActor = {
  kernel_tenant_grant(input: {
    principal: Principal;
    app_id: string;
  }): Promise<void>;

  kernel_tenant_revoke(input: {
    principal: Principal;
    app_id: string;
  }): Promise<void>;

  kernel_tenant_apps(input: {
    principal: Principal;
  }): Promise<string[]>;
};

const identity = localIdentityFromSeed(2);

console.log("Admin principal:", identity.getPrincipal().toText());

const agent = await HttpAgent.create({
  host: "http://127.0.0.1:8000",
  identity,
  verifyQuerySignatures: false,
});

await agent.fetchRootKey();

const actor = Actor.createActor<TenantActor>(idlFactory, {
  agent,
  canisterId: Principal.fromText(canisterId),
});

const principal = Principal.fromText(principalText);

switch (action) {
  case "grant":
    await actor.kernel_tenant_grant({
      principal,
      app_id: appId!,
    });
    console.log(`Granted ${principalText} -> ${appId}`);
    break;

  case "revoke":
    await actor.kernel_tenant_revoke({
      principal,
      app_id: appId!,
    });
    console.log(`Revoked ${principalText} -> ${appId}`);
    break;

  case "list":
    break;
}

const apps = await actor.kernel_tenant_apps({ principal });

console.log("Tenant apps:", apps);
