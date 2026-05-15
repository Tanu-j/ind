import { connectDB } from "@/lib/db/mongodb";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}

export async function getAdminUser() {
  const session = await getSession();
  if (!session) return null;

  await connectDB();
  const user = await User.findById(session.userId).select("-passwordHash");
  if (!user || !isAdminEmail(user.email)) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    credits: user.credits,
  };
}
