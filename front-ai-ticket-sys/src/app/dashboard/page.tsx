'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authStorage, UserSession } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const session = authStorage.getUser();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session);
  }, [router]);

  const handleLogout = () => {
    authStorage.clear();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between pb-6 border-b border-card-border">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-light mt-1">
              Hola, <span className="text-foreground font-semibold">{user.username}</span> ·{' '}
              <span className="text-primary">{user.role}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-card-border rounded-lg hover:bg-input transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </header>

        <section className="mt-8 p-6 rounded-xl border border-card-border bg-card">
          <h2 className="text-lg font-semibold">Bienvenido a IncidentFlow</h2>
          <p className="mt-2 text-muted-light">
            Aquí irá el dashboard operativo: tickets abiertos, métricas, tendencias.
          </p>
        </section>
      </div>
    </main>
  );
}