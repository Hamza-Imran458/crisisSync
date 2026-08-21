import { getCurrentSession, supabase } from './supabase';

export async function getUserRole() {
  const session = await getCurrentSession();

  console.log("🔐 CURRENT AUTH USER UID:", session?.user?.id);
  console.log("📧 CURRENT AUTH EMAIL:", session?.user?.email);

  if (!session?.user?.id) {
    console.log("❌ No logged-in user");
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', session.user.id)
    .maybeSingle();

  console.log("👤 PROFILE RESULT:", data);
  console.log("❌ PROFILE ERROR:", error);

  if (error) {
    throw error;
  }

  if (data?.is_admin) {
    return 'admin';
  }

  if (data?.role) {
    return data.role;
  }

  return 'citizen';
}

export async function canUserAccessAdmin() {
  const role = await getUserRole();
  return role === 'admin' || role === 'operator';
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
