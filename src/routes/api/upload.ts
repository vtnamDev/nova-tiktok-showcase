import { createFileRoute } from "@tanstack/react-router";
import { put } from "@vercel/blob";
import { requireRoles } from "@/lib/access";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          await requireRoles(["owner", "admin", "editor"]);
          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) return Response.json({ error: "Missing file" }, { status: 400 });
          if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
            return Response.json({ error: "Unsupported image type" }, { status: 415 });
          }
          if (file.size > 4 * 1024 * 1024) {
            return Response.json({ error: "Image must be 4 MB or smaller" }, { status: 413 });
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
          const blob = await put(`products/${Date.now()}-${safeName}`, file, {
            access: "public",
            addRandomSuffix: true,
          });
          return Response.json({ url: blob.url });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed";
          const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
          return Response.json({ error: status === 500 ? "Upload failed" : message }, { status });
        }
      },
    },
  },
});
