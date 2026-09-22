# Redis Rate Limiters

Implementation of **Sliding Window** and **Token Bucket** rate limiters using Redis, with both non-atomic and atomic versions.

## Structure

```text
src/
├── script.ts              # Mocks concurrent requests
├── slidingWindow.ts       # Non-atomic Sliding Window
├── tokenBucket.ts         # Non-atomic Token Bucket
└── atomic-limiters/
    ├── slidingWindow.ts   # Atomic Sliding Window
    └── tokenBucket.ts     # Atomic Token Bucket
```

The atomic implementations use **Redis Lua scripts** to make the check-and-update operation atomic and prevent race conditions under concurrency.

## Concurrency Test

With a limit of **10 requests** and **200 concurrent requests**:

| Implementation | Accepted | Rejected |
| -------------- | -------: | -------: |
| Non-atomic     |       33 |      167 |
| Atomic         |       10 |      190 |

The logs show the accepted and rejected requests. The non-atomic implementation allows **33 requests**, exceeding the configured limit due to concurrent race conditions, while the atomic implementation correctly allows only **10 requests** and rejects the remaining **190**.
