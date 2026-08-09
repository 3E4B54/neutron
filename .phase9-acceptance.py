from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one replacement target, found {count}")
    write(path, text.replace(old, new, 1))


e2e = "test/e2e/local-kernel.spec.ts"

# Recreating the actor models a browser/client reload: the tenant grant and
# logical->physical installation mapping must come from persisted backend state,
# not from reducer/UI memory.
replace_once(
    e2e,
    '''    expect(\n      await tenantB.kernel_my_app_instance_for_app({ app_id: "demo" }),\n    ).toEqual([bDemo]);\n\n    expect(aHello).not.toBe(bHello);''',
    '''    expect(\n      await tenantB.kernel_my_app_instance_for_app({ app_id: "demo" }),\n    ).toEqual([bDemo]);\n\n    const tenantAReloaded = await createActorForSeed(tenantASeed);\n    expect(\n      await tenantAReloaded.kernel_my_app_instance_for_app({\n        app_id: "hello",\n      }),\n    ).toEqual([aHello]);\n    expect(\n      await tenantAReloaded.kernel_app_instance_allocate({\n        app_id: "hello",\n      }),\n    ).toEqual([aHello]);\n    expect(\n      [...await tenantAReloaded.kernel_my_tenant_apps(null)].sort(),\n    ).toEqual([aHello, aDemo].sort());\n\n    expect(aHello).not.toBe(bHello);''',
)

# Exercise the actual tenant launcher contract with the PocketIC-only Playwright
# identity hook. This verifies Sandstorm-like Install -> Open behavior and that
# opening the installed Element multiple times creates multiple workspace views
# of one physical Phase-9 Atom rather than allocating more pool instances.
replace_once(
    e2e,
    '''});\n\nfunction localDeveloperIdentity() {''',
    '''});\n\ntest("Plasmon tenant launcher installs once and reopens the same Element", async ({\n  page,\n}) => {\n  const runtime = resolveLocalNeutronRuntime();\n  const tenantSeed = (runtime.developerIdentitySeed + 1) % 256;\n\n  const loginAsTenant = async (): Promise<string> => {\n    await page.waitForFunction(() =>\n      typeof (window as Window & {\n        __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: unknown;\n      }).__NEUTRON_PLAYWRIGHT_LOGIN_AS__ === "function"\n    );\n\n    return await page.evaluate(async (seed) => {\n      const login = (window as Window & {\n        __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: (seed: number) => Promise<string>;\n      }).__NEUTRON_PLAYWRIGHT_LOGIN_AS__;\n      if (!login) throw new Error("Local Playwright identity hook is unavailable");\n      return await login(seed);\n    }, tenantSeed);\n  };\n\n  const revokeTenantGrant = async (\n    principalText: string,\n    appId: string,\n  ): Promise<void> => {\n    type RevokeActor = {\n      kernel_tenant_revoke: ActorMethod<[\n        { principal: Principal; app_id: string },\n      ], undefined>;\n    };\n\n    const agent = await HttpAgent.create({\n      host: localGatewayUrl(),\n      identity: localDeveloperIdentity(),\n      verifyQuerySignatures: false,\n    });\n    await agent.fetchRootKey();\n\n    const actor = Actor.createActor<RevokeActor>(\n      ({ IDL }) =>\n        IDL.Service({\n          kernel_tenant_revoke: IDL.Func(\n            [\n              IDL.Record({\n                principal: IDL.Principal,\n                app_id: IDL.Text,\n              }),\n            ],\n            [],\n            [],\n          ),\n        }),\n      { agent, canisterId: resolveCanisterId() },\n    );\n\n    await actor.kernel_tenant_revoke({\n      principal: Principal.fromText(principalText),\n      app_id: appId,\n    });\n  };\n\n  await page.goto(localKernelUrl());\n  const principal = await loginAsTenant();\n  let physicalAppId: string | null = null;\n\n  try {\n    await openLauncher(page);\n    const element = page.locator('[data-tid="launcher-element-hello"]');\n    await expect(element).toHaveAttribute("data-state", "install");\n    await expect(element).toHaveAccessibleName("Install Hello");\n    await element.click();\n\n    const firstFrame = page.locator(\n      'iframe.tile-iframe[data-app-id^="hello_"]',\n    ).first();\n    await expect(firstFrame).toBeVisible();\n    physicalAppId = await firstFrame.getAttribute("data-app-id");\n    expect(physicalAppId).toBeTruthy();\n\n    await openLauncher(page);\n    const installedElement = page.locator(\n      '[data-tid="launcher-element-hello"]',\n    );\n    await expect(installedElement).toHaveAttribute("data-state", "open");\n    await expect(installedElement).toHaveAccessibleName("Open Hello");\n    await installedElement.click();\n\n    const sameAtomFrames = page.locator(\n      `iframe.tile-iframe[data-app-id="${physicalAppId}"]`,\n    );\n    await expect(sameAtomFrames).toHaveCount(2);\n    const beforeReloadIds = await page\n      .locator('iframe.tile-iframe[data-app-id^="hello_"]')\n      .evaluateAll((frames) =>\n        frames.map((frame) => (frame as HTMLIFrameElement).dataset.appId ?? ""),\n      );\n    expect(new Set(beforeReloadIds)).toEqual(new Set([physicalAppId]));\n\n    await page.reload({ waitUntil: "domcontentloaded" });\n    const reloadedPrincipal = await loginAsTenant();\n    expect(reloadedPrincipal).toBe(principal);\n\n    await openLauncher(page);\n    const reloadedElement = page.locator(\n      '[data-tid="launcher-element-hello"]',\n    );\n    await expect(reloadedElement).toHaveAttribute("data-state", "open");\n    await reloadedElement.click();\n\n    const afterReloadIds = await page\n      .locator('iframe.tile-iframe[data-app-id^="hello_"]')\n      .evaluateAll((frames) =>\n        frames.map((frame) => (frame as HTMLIFrameElement).dataset.appId ?? ""),\n      );\n    expect(afterReloadIds.length).toBeGreaterThan(0);\n    expect(new Set(afterReloadIds)).toEqual(new Set([physicalAppId]));\n  } finally {\n    if (physicalAppId !== null) {\n      await revokeTenantGrant(principal, physicalAppId);\n    }\n  }\n});\n\nfunction localDeveloperIdentity() {''',
)

replace_once(
    "package.json",
    '''    "plasmon:test": "NEUTRON_NDEPLOY_CONFIG=plasmon.ndeploy.json playwright test test/e2e/local-kernel.spec.ts --grep \\\"Plasmon tenants cannot cross owner or allocation boundaries\\\""''',
    '''    "plasmon:test": "NEUTRON_NDEPLOY_CONFIG=plasmon.ndeploy.json playwright test test/e2e/local-kernel.spec.ts --grep \\\"Plasmon (tenants cannot cross owner or allocation boundaries|tenant launcher installs once and reopens the same Element)\\\""''',
)

print("Phase 9 acceptance coverage applied cleanly.")
