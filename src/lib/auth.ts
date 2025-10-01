import 'server-only';
import { cookies } from 'next/headers';

export async function getCurrentUserId(): Promise<string | null> {
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value;
    return userId || null;
}
