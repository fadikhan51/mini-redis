# Redis Command Support

This project implements a subset of Redis commands focused on core string and expiration use-cases.

## Supported Commands
- **Connection**: `PING`, `ECHO`, `QUIT`, `AUTH`, `SELECT` (supports index 0 only)
- **Strings**: `SET`, `GET`, `MGET`, `MSET`, `DEL`, `EXISTS`, `GETDEL`, `GETEX`, `INCR`, `DECR`, `INCRBY`, `DECRBY`
- **Keys/Expiry**: `EXPIRE`, `PEXPIRE`, `TTL`, `PTTL`, `PERSIST`
- **Admin**: `DBSIZE`, `FLUSHDB`, `KEYS`, `SCAN`

## Unsupported
- Clustering, Pub/Sub, Streams, Lists, Sets, Hashes.
- Persistence (AOF/RDB).
