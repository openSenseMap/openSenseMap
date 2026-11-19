# Instructions for AI Agents

This repository contains openSenseMap, a data platform for open environmental sensor data.

## General 

- Never commit secrets, real credentials or production values.
- .env.example should hold all variables required for local development
- Never edit generated code like `app/db/drizzle/**`
- Never run `db:seed` or any destructive database command against a shared or production instance. Always check .env before performing any of such operations and ask first.
- Ask before upgrading or adding heavyweight dependencies or cloud-service dependencies without; the project is resource-constrained and self-hosted.
- Ask before making database schema changes
- Ask before making changes to the deployment

## Git Guidelines

- Pull requests target `dev` and not `main`
- Do NOT amend, squash, or rebase commits that have already been pushed to the PR branch after the PR is opened.
- Use conventional commit style (`feat:`, `fix:`, `chore:`, `ci:`, `build(deps):`, ...)
- When opening a pull request, use the repository's PR template (.github/PULL_REQUEST_TEMPLATE.md). Never remove anything from the template, keep all checkboxes no matter if they are checked or not. Link issues if possible.

## Development Commands

- Use Vite+ to build, start and test
