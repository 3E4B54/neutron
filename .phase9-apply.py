from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one replacement target, found {count}")
    write(path, text.replace(old, new, 1))


def replace_section(path: str, start: str, end: str, replacement: str) -> None:
    text = read(path)
    start_at = text.find(start)
    if start_at < 0:
        raise RuntimeError(f"{path}: missing section start: {start!r}")
    end_at = text.find(end, start_at + len(start))
    if end_at < 0:
        raise RuntimeError(f"{path}: missing section end: {end!r}")
    if text.find(start, start_at + len(start)) >= 0:
        raise RuntimeError(f"{path}: section start is not unique: {start!r}")
    write(path, text[:start_at] + replacement + text[end_at:])


# Keep Phase 9's lookup rule in a small generic Neutron helper. Plasmon's
# product layer may call the physical app instance an Atom for this POC, but
# the kernel remains expressed in app/app-instance vocabulary so upstream
# Neutron merges do not inherit Plasmon-specific terminology.
write(
    "apps/kernel/backend/app_instances/Allocation.mo",
    '''import Map "mo:core/Map";
import Text "mo:core/Text";

module {
    // Resolve the physical instance already assigned to one logical app.
    //
    // Tenant grants remain physical app-instance ids for stable-memory
    // compatibility. The logical relation is derived through the existing
    // app-instance registry rather than introducing a second installation or
    // Atom schema into the Neutron kernel.
    //
    // Older state may contain duplicate grants for one logical app. Reads are
    // deterministic in that case; all new Phase 9 writes prevent duplicates.
    public func allocatedInstanceForApp(
        grants : [Text],
        instances : Map.Map<Text, Text>,
        appId : Text,
        usable : (Text) -> Bool,
    ) : ?Text {
        var selected : ?Text = null;

        for (appInstanceId in grants.vals()) {
            switch (Map.get(instances, Text.compare, appInstanceId)) {
                case (?registeredAppId) {
                    if (registeredAppId == appId and usable(appInstanceId)) {
                        switch (selected) {
                            case null selected := ?appInstanceId;
                            case (?current) {
                                if (Text.compare(appInstanceId, current) == #less) {
                                    selected := ?appInstanceId;
                                };
                            };
                        };
                    };
                };
                case null {};
            };
        };

        selected;
    };
};
''',
)

write(
    "apps/kernel/test/motoko/app_instance_allocation_test.mo",
    '''import Map "mo:core/Map";
import Text "mo:core/Text";
import Allocation "../../backend/app_instances/Allocation";

let instances = Map.empty<Text, Text>();
Map.add(instances, Text.compare, "hello_001", "hello");
Map.add(instances, Text.compare, "hello_002", "hello");
Map.add(instances, Text.compare, "demo_001", "demo");

let grants = ["hello_002", "demo_001", "hello_001", "unregistered_001"];

// Legacy duplicate grants resolve deterministically.
assert (
    Allocation.allocatedInstanceForApp(
        grants,
        instances,
        "hello",
        func(_appInstanceId : Text) : Bool { true },
    ) == ?"hello_001"
);

// Unusable/retired instances are ignored.
assert (
    Allocation.allocatedInstanceForApp(
        grants,
        instances,
        "hello",
        func(appInstanceId : Text) : Bool { appInstanceId != "hello_001" },
    ) == ?"hello_002"
);

assert (
    Allocation.allocatedInstanceForApp(
        grants,
        instances,
        "demo",
        func(_appInstanceId : Text) : Bool { true },
    ) == ?"demo_001"
);

assert (
    Allocation.allocatedInstanceForApp(
        grants,
        instances,
        "missing",
        func(_appInstanceId : Text) : Bool { true },
    ) == null
);

assert (
    Allocation.allocatedInstanceForApp(
        ["unregistered_001"],
        instances,
        "hello",
        func(_appInstanceId : Text) : Bool { true },
    ) == null
);
''',
)

main_path = "apps/kernel/backend/main.mo"
replace_once(
    main_path,
    'import AppCatalogMemory "./memory/app_catalog/v1";\nimport ActivationService "./activation/Service";',
    'import AppCatalogMemory "./memory/app_catalog/v1";\nimport AppInstanceAllocation "./app_instances/Allocation";\nimport ActivationService "./activation/Service";',
)
replace_once(
    main_path,
    '''        // Returns true when any tenant currently owns this app instance.\n        func app_instance_retired(appInstanceId : Text) : Bool {''',
    '''        // Retirement is permanent for a physical pool slot. It is\n        // independent from whether a tenant currently owns that slot.\n        func app_instance_retired(appInstanceId : Text) : Bool {''',
)
replace_once(
    main_path,
    '''        func app_instance_assigned(appInstanceId : Text) : Bool {''',
    '''        // Returns true when any tenant currently owns this physical instance.\n        func app_instance_assigned(appInstanceId : Text) : Bool {''',
)

helper_marker = "        // Owner-only through the compiler-generated kernel wrapper.\n"
helper = '''        // Resolve one tenant's existing physical instance for a logical app.\n        //\n        // Phase 9 models Element installation by deriving\n        // (principal, logical app) -> physical app instance from the existing\n        // grant + app-instance registries. It intentionally does not introduce\n        // a logical Atom record; Phase 10 can add porter-defined Atoms without\n        // changing this persistence-sensitive v1 tenant schema.\n        func tenant_app_instance_for_app(\n            id : Principal,\n            appId : Text,\n        ) : ?Text {\n            AppInstanceAllocation.allocatedInstanceForApp(\n                tenant_apps(id),\n                appInstancesMem.instances,\n                appId,\n                func(appInstanceId : Text) : Bool {\n                    not app_instance_retired(appInstanceId) and\n                    InstallMemory.committedScope(\n                        mem.install,\n                        appInstanceId,\n                    ) != null;\n                },\n            );\n        };\n\n'''
replace_once(main_path, helper_marker, helper + helper_marker)

replace_section(
    main_path,
    "        // Owner-only administrative query.\n",
    "        // Owner-only logical app catalog listing.\n",
    '''        // Owner-only administrative query.\n        public func /*query*/kernel_app_instances_for_app(\n            input : { app_id : Text },\n        ) : [Text] {\n            var result : [Text] = [];\n\n            for (\n                (appInstanceId, registeredAppId)\n                in Map.entries(appInstancesMem.instances)\n            ) {\n                if (registeredAppId == input.app_id) {\n                    result := Array.concat(result, [appInstanceId]);\n                };\n            };\n\n            Array.sort(result, Text.compare);\n        };\n\n        // Self-scoped tenant installation lookup.\n        //\n        // Keep the owner pool-inspection method above unchanged. This separate\n        // query exposes only the caller's own 0-or-1 physical allocation and\n        // therefore adds the Phase 9 product need without broadening an existing\n        // generic Neutron administrative contract.\n        public func /*query:unauthorized*/kernel_my_app_instance_for_app(\n            input : { app_id : Text },\n            /*caller*/ caller : Principal,\n        ) : ?Text {\n            assert(is_session_authorized(caller));\n            tenant_app_instance_for_app(caller, input.app_id);\n        };\n\n''',
)

replace_section(
    main_path,
    "        // Tenant-facing catalog.\n",
    "        // Tenant-facing allocator.\n",
    '''        // Tenant-facing logical app catalog.\n        //\n        // An installed logical app remains visible even when the physical pool\n        // is otherwise exhausted, allowing the shell to render Open instead of\n        // losing the Element after installation. Uninstalled Elements are shown\n        // only while at least one usable free physical slot exists.\n        public func /*query:unauthorized*/kernel_available_apps(\n            (),\n            /*caller*/ caller : Principal,\n        ) : [Text] {\n            assert(is_session_authorized(caller));\n\n            var result : [Text] = [];\n\n            for ((appId, _) in Map.entries(appCatalogMem.apps)) {\n                var visible = tenant_app_instance_for_app(caller, appId) != null;\n\n                if (not visible) {\n                    label pool for (\n                        (appInstanceId, registeredAppId)\n                        in Map.entries(appInstancesMem.instances)\n                    ) {\n                        if (\n                            registeredAppId == appId and\n                            InstallMemory.committedScope(\n                                mem.install,\n                                appInstanceId,\n                            ) != null and\n                            not app_instance_retired(appInstanceId) and\n                            not app_instance_assigned(appInstanceId)\n                        ) {\n                            visible := true;\n                            break pool;\n                        };\n                    };\n                };\n\n                if (visible) {\n                    result := Array.concat(result, [appId]);\n                };\n            };\n\n            Array.sort(result, Text.compare);\n        };\n\n''',
)

replace_section(
    main_path,
    "        // Tenant-facing allocator.\n",
    "        // Owner-only through the compiler-generated kernel authorization\n",
    '''        // Tenant-facing allocator.\n        //\n        // Phase 9 establishes Element installation semantics: one principal may\n        // have at most one physical instance for a given logical app. Repeating\n        // Install therefore returns the existing allocation instead of consuming\n        // another pool slot. This update contains no await, so lookup + mutation\n        // execute atomically within one canister message.\n        public func /*update:unauthorized*/kernel_app_instance_allocate(\n            input : { app_id : Text },\n            /*caller*/ caller : Principal,\n        ) : ?Text {\n            assert(is_session_authorized(caller));\n\n            switch (tenant_app_instance_for_app(caller, input.app_id)) {\n                case (?existing) return ?existing;\n                case null {};\n            };\n\n            var selected : ?Text = null;\n\n            for (\n                (appInstanceId, registeredAppId)\n                in Map.entries(appInstancesMem.instances)\n            ) {\n                if (\n                    registeredAppId == input.app_id and\n                    InstallMemory.committedScope(\n                        mem.install,\n                        appInstanceId,\n                    ) != null and\n                    not app_instance_retired(appInstanceId) and\n                    not app_instance_assigned(appInstanceId)\n                ) {\n                    switch (selected) {\n                        case null selected := ?appInstanceId;\n                        case (?current) {\n                            if (Text.compare(appInstanceId, current) == #less) {\n                                selected := ?appInstanceId;\n                            };\n                        };\n                    };\n                };\n            };\n\n            switch (selected) {\n                case null null;\n                case (?appInstanceId) {\n                    let current = tenant_apps(caller);\n\n                    Map.add(\n                        tenantsMem.grants,\n                        Principal.compare,\n                        caller,\n                        Array.sort(\n                            Array.concat(current, [appInstanceId]),\n                            Text.compare,\n                        ),\n                    );\n\n                    ?appInstanceId;\n                };\n            };\n        };\n\n''',
)

replace_section(
    main_path,
    "        // Owner-only through the compiler-generated kernel authorization\n",
    "        // Owner-only. An empty grant list is retained so tenant membership\n",
    '''        // Owner-only through the compiler-generated kernel authorization\n        // wrapper. A grant may target only a currently installed non-kernel app.\n        //\n        // Registered pool instances obey the same one-principal + one-logical-app\n        // installation invariant as the self-service allocator. Generic direct\n        // grants for unregistered Neutron apps retain their previous semantics.\n        public func /*update*/kernel_tenant_grant(\n            input : {\n                principal : Principal;\n                app_id : Text;\n            },\n        ) : () {\n            assert(SettingsAccess.validPrincipal(input.principal));\n            assert(input.app_id != "kernel");\n            assert(not app_instance_retired(input.app_id));\n            assert(\n                InstallMemory.committedScope(\n                    mem.install,\n                    input.app_id,\n                ) != null\n            );\n\n            // A physical app instance belongs to at most one tenant.\n            // Re-granting the same instance to the same tenant is idempotent.\n            assert(\n                not app_instance_assigned(input.app_id) or\n                tenant_has_app(input.principal, input.app_id)\n            );\n\n            switch (\n                Map.get(\n                    appInstancesMem.instances,\n                    Text.compare,\n                    input.app_id,\n                )\n            ) {\n                case (?logicalAppId) {\n                    switch (tenant_app_instance_for_app(\n                        input.principal,\n                        logicalAppId,\n                    )) {\n                        case null {};\n                        case (?existing) assert(existing == input.app_id);\n                    };\n                };\n                case null {};\n            };\n\n            let current = tenant_apps(input.principal);\n\n            if (\n                Array.any(\n                    current,\n                    func(appId : Text) : Bool { appId == input.app_id },\n                )\n            ) return;\n\n            Map.add(\n                tenantsMem.grants,\n                Principal.compare,\n                input.principal,\n                Array.sort(\n                    Array.concat(current, [input.app_id]),\n                    Text.compare,\n                ),\n            );\n        };\n\n''',
)

replace_once(
    "apps/kernel/neutron.json",
    '''    "kernel_app_instances_for_app": {\n      "type": "query",\n      "async": false\n    },\n    "kernel_app_catalog_list": {''',
    '''    "kernel_app_instances_for_app": {\n      "type": "query",\n      "async": false\n    },\n    "kernel_my_app_instance_for_app": {\n      "type": "query",\n      "async": false,\n      "arg": [\n        "caller"\n      ],\n      "allow": "unauthorized"\n    },\n    "kernel_app_catalog_list": {''',
)

replace_once(
    "apps/kernel/backend/memory/malstorm_tenants/v1.mo",
    '''    // Tenant -> assigned physical app instance ids.\n    //\n    // Intentionally simple for v1. Typical tenants will have only a\n    // handful of grants, so copying/scanning a small [Text] is preferable\n    // to introducing more complicated persistent structures.''',
    '''    // Tenant -> assigned physical app instance ids.\n    //\n    // IMPORTANT: this module path is persistence-sensitive and intentionally\n    // retains its historical name. Phase 9 also keeps physical ids as the\n    // stored representation: (principal, logical app) uniqueness is derived\n    // through memory/app_instances/v1 rather than by replacing this schema.\n    // Typical tenants have only a handful of grants, so copying/scanning a\n    // small [Text] remains preferable to a more complicated stable structure.''',
)

# Frontend control-plane types and tenant catalog state.
auth_path = "apps/kernel/src/reducer/auth.ts"
replace_once(
    auth_path,
    '''  kernel_my_tenant_apps(req: null): Promise<string[]>;\n  kernel_app_instance_allocate(req: {''',
    '''  kernel_my_tenant_apps(req: null): Promise<string[]>;\n  kernel_my_app_instance_for_app(req: {\n    app_id: string;\n  }): Promise<[] | [string]>;\n  kernel_app_instance_allocate(req: {''',
)

replace_section(
    auth_path,
    "export type AvailableApp = {\n",
    "export async function allocateAppInstance(\n",
    '''export type AvailableApp = {\n  appId: string;\n  name: string;\n  description: string;\n  appInstanceId: string | null;\n};\n\n/**\n * Tenant-facing logical Element rows. The self-scoped kernel query reports\n * whether this caller already has the Element installed. For Phase 9 the\n * returned physical app-instance id is also the POC Atom identity; Phase 10\n * can add porter-defined Atoms without changing this installation lookup.\n */\nexport async function getAvailableApps(): Promise<AvailableApp[]> {\n  const neutron = await getNeutronCan();\n  const appIds = await neutron.kernel_available_apps(null);\n\n  return Promise.all(\n    appIds.map(async (appId) => {\n      const [metadata, installation] = await Promise.all([\n        neutron.kernel_app_catalog_get({ app_id: appId }),\n        neutron.kernel_my_app_instance_for_app({ app_id: appId }),\n      ]);\n\n      return {\n        appId,\n        name: metadata[0] ?? appId,\n        description: metadata[1] ?? "",\n        appInstanceId: installation[0] ?? null,\n      };\n    }),\n  );\n}\n\nexport type CatalogApp = Omit<AvailableApp, "appInstanceId"> & {\n  capacity: number;\n};\n\nexport async function getCatalogApps(): Promise<CatalogApp[]> {\n  const neutron = await getNeutronCan();\n  const appIds = await neutron.kernel_app_catalog_list(null);\n\n  return Promise.all(\n    appIds.map(async (appId) => {\n      const [metadata, instances] = await Promise.all([\n        neutron.kernel_app_catalog_get({ app_id: appId }),\n        neutron.kernel_app_instances_for_app({ app_id: appId }),\n      ]);\n\n      return {\n        appId,\n        name: metadata[0] ?? appId,\n        description: metadata[1] ?? "",\n        capacity: instances.length,\n      };\n    }),\n  );\n}\n\n''',
)

replace_once(
    auth_path,
    '''    kernel_my_tenant_apps: IDL.Func(\n      [IDL.Null],\n      [IDL.Vec(IDL.Text)],\n      ["query"],\n    ),\n    kernel_app_instance_allocate: IDL.Func(''',
    '''    kernel_my_tenant_apps: IDL.Func(\n      [IDL.Null],\n      [IDL.Vec(IDL.Text)],\n      ["query"],\n    ),\n    kernel_my_app_instance_for_app: IDL.Func(\n      [IDL.Record({ app_id: IDL.Text })],\n      [IDL.Opt(IDL.Text)],\n      ["query"],\n    ),\n    kernel_app_instance_allocate: IDL.Func(''',
)

# Tenant launcher: preserve existing Neutron styling/classes, but present one
# logical Element row instead of leaking each physical pool slot into the UX.
launcher = "apps/kernel/src/workspace/Launcher.tsx"
replace_once(
    launcher,
    '''  const entries = useMemo(\n    () => launcherEntriesFromApps(visibleApps, query),\n    [visibleApps, query],\n  );''',
    '''  // Owners continue to use Neutron's physical app/tile launcher. Tenants\n  // instead see one logical Element row, keeping workspace Tiles separate from\n  // installation/Atom allocation.\n  const entries = useMemo(\n    () => (owner ? launcherEntriesFromApps(visibleApps, query) : []),\n    [visibleApps, query, owner],\n  );\n  const tenantElements = useMemo(() => {\n    const normalized = query.trim().toLocaleLowerCase();\n    if (!normalized) return availableApps;\n\n    return availableApps.filter((app) =>\n      [app.appId, app.name, app.description].some((value) =>\n        value.toLocaleLowerCase().includes(normalized),\n      ),\n    );\n  }, [availableApps, query]);''',
)

replace_once(
    launcher,
    '''  const installPackage = async (source: AppInstallSource) => {''',
    '''  const appInstanceEntry = (appInstanceId: string): LauncherEntry | null => {\n    const registered = apps[appInstanceId];\n    if (!registered) return null;\n\n    return (\n      launcherEntriesFromApps(\n        { [appInstanceId]: registered } as typeof apps,\n        "",\n      )[0] ?? null\n    );\n  };\n\n  const launchAppInstance = (\n    appInstanceId: string,\n    elementName: string,\n  ): boolean => {\n    const entry = appInstanceEntry(appInstanceId);\n    if (!entry) {\n      setAllocateError(\n        `${elementName} is installed, but its runtime tile is unavailable.`,\n      );\n      return false;\n    }\n\n    launch(entry);\n    return true;\n  };\n\n  const activateTenantElement = async (\n    app: (typeof availableApps)[number],\n  ): Promise<void> => {\n    // Open is only a workspace operation. Only Install calls the allocator, so\n    // opening the same installed Element repeatedly can create multiple Tiles\n    // while all of them still reference the same physical Phase 9 Atom.\n    if (app.appInstanceId !== null) {\n      launchAppInstance(app.appInstanceId, app.name);\n      return;\n    }\n    if (allocateBusyAppId !== null) return;\n\n    setAllocateBusyAppId(app.appId);\n    setAllocateError(null);\n\n    try {\n      const appInstanceId = await allocateAppInstance(app.appId);\n      if (appInstanceId === null) {\n        setAllocateError(`${app.name} is temporarily unavailable.`);\n        return;\n      }\n\n      // Reflect Install -> Open immediately. The appIds refresh performed by\n      // allocateAppInstance causes the normal catalog effect to re-read the\n      // same persisted installation mapping afterward.\n      setAvailableApps((current) =>\n        current.map((item) =>\n          item.appId === app.appId ? { ...item, appInstanceId } : item,\n        ),\n      );\n      launchAppInstance(appInstanceId, app.name);\n    } catch (error) {\n      setAllocateError(\n        error instanceof Error\n          ? error.message\n          : `Unable to install ${app.name}.`,\n      );\n    } finally {\n      setAllocateBusyAppId(null);\n    }\n  };\n\n  const installPackage = async (source: AppInstallSource) => {''',
)

replace_once(
    launcher,
    '''            aria-label="Search app tiles"\n            ref={inputRef}\n            data-tid={testId("launcher-search")}\n            value={query}\n            placeholder="Search tiles"''',
    '''            aria-label={owner ? "Search app tiles" : "Search Elements"}\n            ref={inputRef}\n            data-tid={testId("launcher-search")}\n            value={query}\n            placeholder={owner ? "Search tiles" : "Search Elements"}''',
)
replace_once(
    launcher,
    '''            onKeyDown={(event) => {\n              if (event.key === "Enter" && entries[0]) launch(entries[0]);\n            }}''',
    '''            onKeyDown={(event) => {\n              if (event.key !== "Enter") return;\n              if (owner && entries[0]) launch(entries[0]);\n              else if (!owner && tenantElements[0]) {\n                void activateTenantElement(tenantElements[0]);\n              }\n            }}''',
)

replace_section(
    launcher,
    "          {!owner ? (\n",
    "          {allocateError ? (\n",
    '''          {!owner ? (\n            <>\n              {tenantElements.map((app) => {\n                const installed = app.appInstanceId !== null;\n                const installedEntry = installed\n                  ? appInstanceEntry(app.appInstanceId!)\n                  : null;\n                const busy = allocateBusyAppId === app.appId;\n\n                return (\n                  <div\n                    className="launcher-tile-row"\n                    key={`element-${app.appId}`}\n                  >\n                    <button\n                      type="button"\n                      className="launcher-tile"\n                      aria-label={`${installed ? "Open" : "Install"} ${app.name}`}\n                      data-tid={testId(`launcher-element-${app.appId}`)}\n                      data-state={installed ? "open" : "install"}\n                      disabled={allocateBusyAppId !== null}\n                      onClick={() => { void activateTenantElement(app); }}\n                    >\n                      {installedEntry ? (\n                        <img src={installedEntry.icon} alt="" />\n                      ) : (\n                        <span aria-hidden="true" className="launcher-install-icon">\n                          <IoAdd />\n                        </span>\n                      )}\n\n                      <span\n                        style={{\n                          display: "flex",\n                          flexDirection: "column",\n                          gap: "0.15rem",\n                          minWidth: 0,\n                          textAlign: "left",\n                        }}\n                      >\n                        <span className="launcher-tile-title">\n                          {busy ? `Installing ${app.name}...` : app.name}\n                        </span>\n                        <span\n                          style={{\n                            fontSize: "0.75rem",\n                            opacity: 0.72,\n                            whiteSpace: "normal",\n                            overflowWrap: "anywhere",\n                            lineHeight: 1.25,\n                          }}\n                        >\n                          {app.description ||\n                            (installed ? "Installed" : "Install this Element")}\n                        </span>\n                        <span\n                          style={{\n                            fontSize: "0.7rem",\n                            fontWeight: 600,\n                            opacity: 0.8,\n                          }}\n                        >\n                          {installed ? "Open" : "Install"}\n                        </span>\n                      </span>\n                    </button>\n                  </div>\n                );\n              })}\n            </>\n          ) : null}\n\n''',
)

replace_once(
    launcher,
    '''          {entries.length === 0 ? (\n            <div className="launcher-empty">No matching tiles</div>\n          ) : null}''',
    '''          {(owner ? entries.length === 0 : tenantElements.length === 0) ? (\n            <div className="launcher-empty">\n              {owner ? "No matching tiles" : "No matching Elements"}\n            </div>\n          ) : null}''',
)

# Update the existing Plasmon security/allocation E2E from "consume another
# physical slot" to idempotent Element installation. Keep the test title
# unchanged because the plasmon:test npm script selects it by name.
e2e = "test/e2e/local-kernel.spec.ts"
replace_once(
    e2e,
    '''      kernel_app_instance_allocate: IDL.Func(\n        [IDL.Record({ app_id: IDL.Text })],\n        [IDL.Opt(IDL.Text)],\n        [],\n      ),''',
    '''      kernel_app_instance_allocate: IDL.Func(\n        [IDL.Record({ app_id: IDL.Text })],\n        [IDL.Opt(IDL.Text)],\n        [],\n      ),\n      kernel_my_app_instance_for_app: IDL.Func(\n        [IDL.Record({ app_id: IDL.Text })],\n        [IDL.Opt(IDL.Text)],\n        ["query"],\n      ),''',
)
replace_once(
    e2e,
    '''    kernel_app_instance_allocate(req: {\n      app_id: string;\n    }): Promise<[] | [string]>;''',
    '''    kernel_app_instance_allocate(req: {\n      app_id: string;\n    }): Promise<[] | [string]>;\n    kernel_my_app_instance_for_app(req: {\n      app_id: string;\n    }): Promise<[] | [string]>;''',
)
replace_once(
    e2e,
    '''    const appId = result[0]!;\n    allocations.push({ principal, appId });\n    return appId;''',
    '''    const appId = result[0]!;\n    if (\n      !allocations.some(\n        (allocation) =>\n          allocation.principal.toText() === principal.toText() &&\n          allocation.appId === appId,\n      )\n    ) {\n      allocations.push({ principal, appId });\n    }\n    return appId;''',
)
replace_section(
    e2e,
    "  try {\n    await allocate(tenantA, tenantAPrincipal, \"hello\");\n",
    "  } finally {\n",
    '''  try {\n    const aHello = await allocate(tenantA, tenantAPrincipal, "hello");\n    expect(await allocate(tenantA, tenantAPrincipal, "hello")).toBe(aHello);\n    const aDemo = await allocate(tenantA, tenantAPrincipal, "demo");\n    expect(await allocate(tenantA, tenantAPrincipal, "demo")).toBe(aDemo);\n\n    const bHello = await allocate(tenantB, tenantBPrincipal, "hello");\n    expect(await allocate(tenantB, tenantBPrincipal, "hello")).toBe(bHello);\n    const bDemo = await allocate(tenantB, tenantBPrincipal, "demo");\n    expect(await allocate(tenantB, tenantBPrincipal, "demo")).toBe(bDemo);\n\n    const aGrants = [...await tenantA.kernel_my_tenant_apps(null)].sort();\n    const bGrants = [...await tenantB.kernel_my_tenant_apps(null)].sort();\n\n    expect(aGrants).toEqual([aHello, aDemo].sort());\n    expect(bGrants).toEqual([bHello, bDemo].sort());\n    expect(aGrants).toHaveLength(2);\n    expect(bGrants).toHaveLength(2);\n\n    expect(\n      await tenantA.kernel_my_app_instance_for_app({ app_id: "hello" }),\n    ).toEqual([aHello]);\n    expect(\n      await tenantA.kernel_my_app_instance_for_app({ app_id: "demo" }),\n    ).toEqual([aDemo]);\n    expect(\n      await tenantB.kernel_my_app_instance_for_app({ app_id: "hello" }),\n    ).toEqual([bHello]);\n    expect(\n      await tenantB.kernel_my_app_instance_for_app({ app_id: "demo" }),\n    ).toEqual([bDemo]);\n\n    expect(aHello).not.toBe(bHello);\n    expect(aDemo).not.toBe(bDemo);\n    expect(aGrants.filter((appId) => bGrants.includes(appId))).toEqual([]);\n\n    // AppScope remains the real security boundary. Direct physical method calls\n    // succeed only for the tenant that owns the allocated instance.\n    await expect(\n      callPhysicalHelloWorld(tenantASeed, aHello, "tenant-a-own-atom"),\n    ).resolves.toEqual(expect.any(String));\n    await expect(\n      callPhysicalHelloWorld(tenantBSeed, bHello, "tenant-b-own-atom"),\n    ).resolves.toEqual(expect.any(String));\n    await expect(\n      callPhysicalHelloWorld(tenantASeed, bHello, "tenant-a-attacking-b"),\n    ).rejects.toThrow();\n    await expect(\n      callPhysicalHelloWorld(tenantBSeed, aHello, "tenant-b-attacking-a"),\n    ).rejects.toThrow();\n''',
)

replace_once(
    "apps/kernel/test/motoko/run.ts",
    '''  "activation_service_test.mo",\n  "public_ingress_service_test.mo",''',
    '''  "activation_service_test.mo",\n  "app_instance_allocation_test.mo",\n  "public_ingress_service_test.mo",''',
)

print("Phase 9 patch applied cleanly.")
