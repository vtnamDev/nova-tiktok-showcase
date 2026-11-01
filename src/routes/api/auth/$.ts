import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/lib/auth";

function authNotReady() {
  const missing = [
    !process.env.DATABASE_URL ? "DATABASE_URL" : null,
    !process.env.BETTER_AUTH_SECRET ? "BETTER_AUTH_SECRET" : null,
  ].filter(Boolean);

  if (missing.length === 0) return null;

  return Response.json(
    {
      error: "AUTH_NOT_CONFIGURED",
      message: "Hệ thống đăng nhập chưa được cấu hình đầy đủ.",
      missing,
    },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const unavailable = authNotReady();
        if (unavailable) return unavailable;
        return getAuth().handler(request);
      },
      POST: async ({ request }: { request: Request }) => {
        const unavailable = authNotReady();
        if (unavailable) return unavailable;
        return getAuth().handler(request);
      },
    },
  },
});
