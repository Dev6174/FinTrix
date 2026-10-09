.PHONY: install dev build test lint typecheck check contract

install:
	pnpm install --frozen-lockfile

contract:
	pnpm --filter @fintrix/contract generate

dev: install
	pnpm dev

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

## Everything CI runs, locally.
check: lint typecheck test build
