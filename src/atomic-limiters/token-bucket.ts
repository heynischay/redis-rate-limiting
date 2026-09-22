import Express from "express";
import { Redis } from "ioredis";
import type { Request, Response, NextFunction } from "express";
const app = Express();
const redis = new Redis("redis://localhost:6379");

app.use(Express.json());

// in this file we are using a token bucket rate limiter
// although without atomicity

// rate limiting on auth route using token bucket algo
let acceptedCounter = 0;
let rejectCounter = 0;

app.use("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const script = await redis.eval(
      `
   local bucket_size = tonumber(ARGV[1])
    local refillInterval = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local key = KEYS[1]

    local data = redis.call("HMGET", key, "tokens", "lastRefill")

    local tokens = data[1]
    local lastRefill = data[2]


    if not tokens then
        redis.call("HSET", key,
            "tokens", bucket_size - 1,
            "lastRefill", now
        )

        return 1
    end

    tokens = tonumber(tokens)
    lastRefill = tonumber(lastRefill)

    local elapsed = now - lastRefill

    local tokens_to_add = elapsed / refillInterval

    tokens = math.min(bucket_size, tokens + tokens_to_add)

    if tokens < 1 then
        return 0
    end

    tokens = tokens - 1

    redis.call("HSET", key,
        "tokens", tokens,
        "lastRefill", now
    )

    return 1
    `,
      1,
      "token_bucket",
      "10",
      `${60_000 / 10}`,
      `${Date.now()}`,
    );
    if (script === 0) {
      rejectCounter++;
      console.log("rejected:", rejectCounter);
      return res.status(429).json({ message: "Try again later" });
    }
    if (script === 1) {
      console.log("initial req");
    }

    next();
  } catch (error) {
    next(error);
  }
});

app.post("/login", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    console.log(`accepted :  ${acceptedCounter++}`);
    res.json({ message: "login" });
  } catch (error) {
    console.log(error);
  }
});

app.listen(3000, () => {
  console.log("server running at port 3000");
});
