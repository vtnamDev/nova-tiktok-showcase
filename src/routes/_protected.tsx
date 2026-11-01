import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentAccess } from "@/lib/access";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location }) => {
    const access = await getCurrentAccess();
    if (!access.user) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    return { access };
  },
  component: () => <Outlet />,
});
