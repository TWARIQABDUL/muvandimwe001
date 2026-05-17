import { useEffect, useState } from 'react';
import type { User, ApiResponse } from '@my-app/shared';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      try {
        const [healthRes, usersRes] = await Promise.all([
          fetch(`${apiUrl}/api/health`),
          fetch(`${apiUrl}/api/users`)
        ]);

        const healthData: ApiResponse<string> = await healthRes.json();
        const usersData: ApiResponse<User[]> = await usersRes.json();

        if (healthData.success) setHealth(healthData.data || '');
        if (usersData.success) setUsers(usersData.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 selection:bg-primary-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-lg shadow-lg shadow-primary-500/20" />
            <span className="text-xl font-bold tracking-tight">Monorepo<span className="text-primary-400">App</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-primary-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary-400 transition-colors">GitHub</a>
            <button className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-full transition-all shadow-lg shadow-primary-600/20 active:scale-95">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold uppercase tracking-wider animate-fade-in">
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            System Online: {health || 'Connecting...'}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            Full-Stack Monorepo <br />
            <span className="text-primary-500">Built for Speed.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            A premium starting point for your next big project. TypeScript everywhere, 
            Vite for the speed, Express for the power, and Tailwind for the beauty.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 transition-all group">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-primary-500">01.</span> Backend Integration
            </h2>
            <div className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm border border-slate-700 group-hover:border-primary-500/20 transition-all">
                  <pre className="text-emerald-400">GET /api/users</pre>
                  <div className="mt-2 text-slate-500">
                    {JSON.stringify(users, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 transition-all group">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-primary-500">02.</span> Shared Types
            </h2>
            <p className="text-slate-400 mb-4">
              Using <code className="text-primary-400">@my-app/shared</code> to maintain type safety across the entire stack.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm border border-slate-700 group-hover:border-primary-500/20 transition-all">
              <pre className="text-blue-400">interface User {'{'}</pre>
              <pre className="pl-4">id: string;</pre>
              <pre className="pl-4">name: string;</pre>
              <pre className="pl-4">email: string;</pre>
              <pre className="text-blue-400">{'}'}</pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-40 py-10 border-t border-slate-800 text-center text-slate-500 text-sm">
        Built with ❤️ using React, Tailwind, and Node.js
      </footer>
    </div>
  );
}

export default App;
