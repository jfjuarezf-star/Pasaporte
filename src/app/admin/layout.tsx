
import { Header } from '@/components/dashboard/Header';
import { User } from '@/lib/types';
import { getUserById } from '@/lib/data';
import { getCurrentUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  // The middleware ensures that a userId cookie exists. As a fallback, redirect if not found.
  if (!userId) {
     return redirect('/');
  }

  const user = await getUserById(userId);

  // If the user does not exist in the DB (e.g., deleted), redirect.
  if (!user) {
     return redirect('/');
  }

  // If the user is not an admin, redirect to their own dashboard.
  if (user.role !== 'admin') {
     return redirect('/dashboard');
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header user={user} />
      <main className="flex-1 bg-background/50 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
