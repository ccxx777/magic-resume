import { createFileRoute } from "@tanstack/react-router";
import AIOptimizePage from "@/app/app/dashboard/ai-optimize/page";

export const Route = createFileRoute("/app/dashboard/ai-optimize")({
  component: AIOptimizePage
});
