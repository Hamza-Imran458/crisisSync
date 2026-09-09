import { getCurrentSession, supabase } from './supabase';

export async function getUserRole() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', session.user.id)
    .maybeSingle();

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
