import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isAdminEmail } from "@/lib/auth/admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell user={user} isAdmin={isAdminEmail(user.email)}>
      {children}
    </DashboardShell>
  );
}
