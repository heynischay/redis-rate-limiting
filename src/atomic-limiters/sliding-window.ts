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
      `local log_size = tonumber(ARGV[1])
        local interval = tonumber(ARGV[2])
        local arrival_time = tonumber(ARGV[3])
        local randomHash = ARGV[4]
        local window = arrival_time - interval
        local key = KEYS[1]

        redis.call("zremrangebyscore",key,0,window)

        local log_count = redis.call("zcard",key)

        if log_count >= log_size  then
            return 0
        end

        redis.call("zadd",key,arrival_time,randomHash)
        
        return 1
        `,

      1, // number of keys used in the script
      "ratelimit", // key
      "10", // ..args
      "60000",
      `${Date.now()}`,
      crypto.randomUUID(),
    );

    if (script === 1) next();
    else {
      rejectCounter++;
      console.log("rejected", rejectCounter);
      return res.json({ rejectCounter: rejectCounter });
    }
  } catch (error) {
    next(error);
  }
});

app.post("/login", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    console.log(`accepted : ${acceptedCounter++}`);
    res.json({ message: "login" });
  } catch (error) {
    console.log(error);
  }
});

app.listen(3000, () => {
  console.log("server running at port 3000");
});
