Pull the latest changes, commit staged/unstaged changes to a new branch, and open a pull request.

1. Run `git status` and `git diff` in parallel to understand the current state of the working directory.
2. If the working tree is clean (nothing to commit and no untracked relevant files), skip to step 5.
3. If on `main` (or any protected branch), generate a short kebab-case branch name that describes the changes (e.g. `feat/us-locale-updates`, `fix/onboarding-phone-placeholder`). Use the diff and file names to infer the right prefix (`feat/`, `fix/`, `chore/`, `docs/`). Run `git checkout -b <generated-branch-name>`.
4. Stage all modified tracked files (`git add -u`) plus any relevant untracked files. Write a concise conventional commit message based on the changes and commit them.
5. Run `git pull origin main --rebase`. If there are rebase conflicts, report them and stop — do not attempt to resolve them automatically.
6. Run `git push -u origin HEAD` to push the branch to remote.
7. Check if the `gh` CLI is available (`gh --version`). If not, report that the GitHub CLI is not installed and provide the PR URL format instead: `https://github.com/<owner>/<repo>/compare/<branch>`.
8. Check if a PR already exists for this branch (`gh pr view`). If yes, report its URL and open it with `gh pr view --web`. If no, create one:

   ```
   gh pr create --title "<title>" --body "$(cat <<'EOF'
   ## Summary
   - <bullet points describing changes>

   ## Test plan
   - [ ] Verify changes work as expected on simulator

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

9. Report the PR URL when done.

Notes:

- Never force-push.
- Never skip pre-commit hooks (`--no-verify`).
- If the user provides a title or description in their message, use that instead of auto-generating.
- Prefer specific file staging over `git add -A` to avoid accidentally including `.env` or build artifacts.
