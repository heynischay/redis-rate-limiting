import Express from "express";
import { Redis } from "ioredis";
import type { Request, Response, NextFunction } from "express";
const app = Express();
const redis = new Redis("redis://localhost:6379");

app.use(Express.json());

// in this file we are using a token bucket rate limiter
// although without atomicity

// rate limiting on auth route using token bucket algo
let counter = 0;

app.use("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bucketSize = 5; // maximum tokens
    const requestsPerMinute = 4;
    const refillRate = requestsPerMinute / 60_000; // tokens per ms

    const now = Date.now();

    const data = await redis.hgetall("token_bucket");
    // First request
    if (!data.tokens) {
      await redis.hset("token_bucket", {
        tokens: bucketSize - 1,
        lastRefill: now,
      });

      return next();
    }

    let tokens = Number(data.tokens);
    const lastRefill = Number(data.lastRefill);

    // How much time has passed?
    const elapsed = now - lastRefill;

    // How many tokens should have been added?
    const tokensToAdd = elapsed * refillRate;

    // Refill, but never exceed bucket capacity
    tokens = Math.min(bucketSize, tokens + tokensToAdd);

    // No token available
    if (tokens < 1) {
      return res.status(429).json({
        message: "Try again later",
      });
    }

    // Consume one token for this request
    tokens -= 1;

    await redis.hset("token_bucket", {
      tokens,
      lastRefill: now,
    });

    next();
  } catch (error) {
    next(error);
  }
});

app.post("/login", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    console.log(`${counter++}`);
    res.json({ message: "login" });
  } catch (error) {
    console.log(error);
  }
});

app.listen(3000, () => {
  console.log("server running at port 3000");
});
