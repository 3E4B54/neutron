import { main } from "./packages/neutron-provision/src/cli.ts";
import {
  runLocalReinstall,
  type LocalReinstallResult,
} from "./packages/neutron-provision/src/local_deploy.ts";
import { bootstrapAppPools } from "./plasmon-bootstrap.ts";

const [configPath, command] = Bun.argv.slice(2);

if (!configPath || command !== "reinstall") {
  console.error(
    "Usage: bun plasmon-provision.ts CONFIG.ndeploy.json reinstall",
  );
  process.exit(1);
}

let deploymentResult: LocalReinstallResult | undefined;

await main(
  [configPath, "reinstall"],
  console,
  {
    localReinstall: async (options, dependencies) => {
      const result = await runLocalReinstall(
        options,
        dependencies,
      );

      deploymentResult = result;
      return result;
    },
  },
);

if (!deploymentResult) {
  throw new Error(
    "Plasmon bootstrap currently supports PocketIC reinstall only",
  );
}

const runtime = deploymentResult.session.runtime;

if (runtime.kind !== "pocketic") {
  throw new Error(
    "Plasmon local bootstrap expected a PocketIC runtime",
  );
}

console.log("");
console.log("Seeding Plasmon app catalog and pools...");

for (const node of deploymentResult.nodes) {
  console.log("");
  console.log(
    `Shard ${node.label}: ${node.canisterId}`,
  );

  await bootstrapAppPools({
    canisterId: node.canisterId,
    host: runtime.gateway.url,
  });
}

console.log("");
console.log("Plasmon deployment ready.");

for (const node of deploymentResult.nodes) {
  console.log(
    `${node.label}: ${node.canisterId} ${node.url}`,
  );
}
