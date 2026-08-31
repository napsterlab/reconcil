import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { persistenceMode } from "../lib/supabase";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok", persistence: persistenceMode });
  res.json(data);
});

export default router;
