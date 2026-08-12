# GitHub Actions maintenance notes

## Ancestry-only pull requests

A pull request that changes Git ancestry while preserving the target tree byte-for-byte can have a zero-file diff. GitHub path filters then may not schedule a required workflow even though branch protection still expects its status context.

For an ancestry-only PR targeting a protected branch, run the required workflow manually with `workflow_dispatch` on the PR head when GitHub reports a required context as `expected`. Do not add unrelated product changes or weaken the required status check merely to make the PR mergeable.
