
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById } from "@/lib/data";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  // The middleware ensures that the user has a cookie.
  // As a fallback, we redirect if the userId is missing.
  if (!userId) {
    return redirect("/");
  }

  const user = await getUserById(userId);

   // If the user doesn't exist in the DB (e.g., has been deleted),
   // redirect to the homepage. This allows the logout action to be used
   // to clear the invalid cookie.
   if (!user) {
    return redirect("/");
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header user={user} />
      <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
