---
description: Bump version, tag, and push a release
argument-hint: [patch|minor|major]
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git tag:*), Bash(git push:*), Bash(npm version:*), Read
---

## Context

- Current version: !`node -p "require('./package.json').version"`
- Git status: !`git status --short`
- Current branch: !`git branch --show-current`
- Recent tags: !`git tag --sort=-v:refname | head -5`

## Your task

Cut a release by following these steps **in order**, running all git commands in a single message:

1. **Check preconditions**: If the working tree is not clean (git status shows uncommitted changes), stop and tell the user to commit or stash their changes first. Do not proceed.

2. **Determine bump type**: Use the argument `$ARGUMENTS` if provided (`patch`, `minor`, or `major`). Default to `patch` if no argument given.

3. **Bump version**: Run `npm version <bump-type> --no-git-tag-version` to update `package.json` only (no auto-commit or tag from npm).

4. **Commit**: Run `git add package.json package-lock.json` then commit with message `bump version to <new-version>` (no Co-Authored-By line needed for release commits).

5. **Tag**: Create an annotated git tag `v<new-version>` with message `Release v<new-version>`.

6. **Push**: Push the commit and the tag to origin in a single step: `git push origin HEAD --tags`.

7. **Report**: Tell the user the new version and the tag that was pushed.

Do all of steps 3–6 in a single message with parallel-safe tool calls where possible.
