# Instructions for AI Agents

This repository contains openSenseMap, a data platform for open environmental
sensor data.

## General Instructions

- Never commit secrets, real credentials or production values.
- .env.example should hold all variables required for local development
- Never edit generated code like `app/db/drizzle/**`
- Never run `db:seed` or any destructive database command against a shared or
  production instance. Always check .env before performing any of such
  operations and ask first.
- Ask before upgrading or adding heavyweight dependencies or cloud-service
  dependencies without; the project is resource-constrained and self-hosted.
- Ask before making database schema changes
- Ask before making changes to the deployment

## Git Guidelines

- Pull requests target `dev` and not `main`
- Do NOT amend, squash, or rebase commits that have already been pushed to the
  PR branch after the PR is opened.
- Use conventional commit style (`feat:`, `fix:`, `chore:`, `ci:`,
  `build(deps):`, ...)
- When opening a pull request, use the repository's PR template
  (.github/PULL_REQUEST_TEMPLATE.md). Never remove anything from the template,
  keep all checkboxes no matter if they are checked or not. Link issues if
  possible.

## Development and Testing Commands

- The project uses Vite+ for package management, runtime managment and command
  execution
- To run tests, use `vp test`. Always ensure the `.env` points to the local
  database instance before testing.
- To start the development environment, spin up the local docker instance of the
  database using `docker compose up -d` and use `vp run dev` to start the
  server. Always make sure the `.env` file is configured to use the local
  database.
- Add packages with `vp add <flags>`, install using `vp install <flags>` and
  remove with `vp remove <flags>`. Vite+ uses NodeJS in our case, so flags work
  like they would with the corresponding NodeJS commands
- Use `vp update` to update packages, run `vp dedupe` afterwards to remove
  duplications if necessary
- Use `vp why <flags>` to find out why a dependency is installed
- Use `vp check` to check for linting, formatting and typing issues.
  `vp run typegen` needs to run before, for the typechecking step to work.
  `vp check` first runs the format check and will stop if there are formatting
  issues. Linting is only run when no formatting issues are found.
  - Use `vp fmt . --write` to fix formatting issues
