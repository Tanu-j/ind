import { connectDB } from "@/lib/db/mongodb";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  await connectDB();
  const user = await User.findById(session.userId).select("-passwordHash");
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    credits: user.credits,
  };
}
