# Mini Redis

A production-level "Mini Redis" cache server built in Node.js using TypeScript. 
It behaves like a single-instance Redis-compatible cache supporting core string commands via a RESP2 TCP interface, and also provides an Express HTTP API for health, metrics, and administration.

## Features
- **TCP RESP2 Server**: Compatible with standard Redis clients (like `redis-cli`, `ioredis`, `redis`).
- **HTTP API**: Provides health checks, Prometheus metrics, stats, and RESTful cache access.
- **Cache Engine**: Implements lazy/active expiration and eviction policies (LRU/NoEviction).
- **MiniStack Integration**: Included tooling to validate behavior against a real Redis provisioned through MiniStack ElastiCache locally.
- **Docker Ready**: Multi-stage build and test containers.

## Setup
```sh
npm install
cp .env.example .env
npm run dev
```

## Supported Commands
Check `docs/redis-command-support.md` for a full list of commands.

## Tests
```sh
npm run test:unit
npm run test:integration
npm run test:ministack
npm run test:e2e
```
