# Contributing to Kontrol

## Branch naming

Format: `type/short-description`

| Type | When to use |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Refactoring without behavior change |
| `docs/` | Documentation only |
| `test/` | Adding or updating tests |
| `chore/` | Build, config, dependency updates |

**Examples**
```
feat/user-crud
fix/jwt-expiry-handling
docs/readme-setup
refactor/pool-connection
```

Rules:
- Lowercase and hyphens only — no underscores, no slashes beyond the prefix
- Keep it short (3–5 words max)
- Branch off `main` unless the work depends on another branch

---

## Commit messages

We use **Conventional Commits**: `type(scope): short description`

```
feat(auth): add JWT login endpoint
fix(users): prevent duplicate email on update
refactor(db): extract pool config to separate module
docs(readme): add Docker setup instructions
chore(deps): upgrade express to 4.21
```

**Types:** `feat` `fix` `refactor` `docs` `test` `chore` `perf`

**Scopes** (use the area of the codebase): `auth` `users` `projects` `tasks` `db` `middleware` `docker` `readme`

Rules:
- Use the imperative mood: "add" not "added" or "adds"
- No period at the end
- Keep the subject line under 72 characters
- Add a body if the change needs explanation (blank line after subject)

---

## Pull requests

- One PR per feature or fix — avoid mixing unrelated changes
- PR title must follow the same `type(scope): description` format as commits
- Fill out the PR template completely
- Link the related issue or task (`Closes #12` / `Task T-07`)
- Request at least one review before merging
- Do not merge your own PR without review (except solo hotfixes on `main`)
- Squash commits when merging if the branch has noisy WIP commits

---

## Issues

Use the appropriate issue template:
- **Bug Report** — something is broken
- **Feature Request** — new functionality or improvement
- **Task** — planned sprint work (T-XX format)

Label every issue before assigning it.

---

## Environment & secrets

- Never commit `.env` files with real credentials
- Always update `.env.example` when adding new environment variables
- Never expose `password_hash` or raw passwords in API responses or logs
