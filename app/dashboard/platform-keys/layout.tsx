import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";

/** Admin-only: platform GCP rotation pool */
export default async function PlatformKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/dashboard?error=admin_required");
  }
  return <>{children}</>;
}
