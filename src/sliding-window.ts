import Express from "express";
import { Redis } from "ioredis";
import type { Request, Response, NextFunction } from "express";
const app = Express();
const redis = new Redis("redis://localhost:6379");

app.use(Express.json());

// in this file we are using a sliding window log rate limiter
// although without atomicity

// rate limiting on auth route using sliding window log
let counter = 0;
app.use("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // rate limit of 10 request / minute
    const log_size = 10;
    // minute in milliseconds
    const interval = 1000 * 60;
    // current time in milliseconds
    const arrival_time = Date.now();
    const window = arrival_time - interval;

    // trim the sorted set by score  to later get recent logs
    await redis.zremrangebyscore("ratelimit", 0, window);

    // getting total logs in current window
    const log_count = await redis.zcard("ratelimit");
    console.log("logcount", log_count);

    // if limit is reached
    if (log_count >= log_size) {
      console.log("Limit reached");
      return res.json({ message: "try again later" });
    }

    // adding req log  in memory with random hash as value to prevent multiple req at the same time
    // as sets only accepts unique values
    console.log("counter", counter++);
    await redis.zadd("ratelimit", arrival_time, crypto.randomUUID());

    next();
  } catch (error) {}
});

app.post("/login", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    return res.json({ message: "you are logged in" });
  } catch (error) {
    console.log(error);
  }
});

app.listen(3000, () => {
  console.log("server running at port 3000");
});
