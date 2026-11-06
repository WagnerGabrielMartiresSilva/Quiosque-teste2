
import React, { useState } from 'react';
import { Lock, Mail, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, senha: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function Login({
  onLogin,
  loading = false,
  error = ''
}: LoginProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    await onLogin(email.trim(), senha);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-6 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center">
            <Lock size={30} />
          </div>

          <h1 className="text-2xl font-black text-white">
            Quiosque
          </h1>

          <p className="text-sm text-stone-400">
            Acesse sua conta para continuar
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-300">
            E-mail
          </label>

          <div className="flex items-center gap-3 bg-stone-950 border border-stone-700 rounded-xl px-4">
            <Mail size={18} className="text-stone-500" />

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              required
              className="w-full bg-transparent py-3 text-white outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-300">
            Senha
          </label>

          <div className="flex items-center gap-3 bg-stone-950 border border-stone-700 rounded-xl px-4">
            <Lock size={18} className="text-stone-500" />

            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Digite sua senha"
              required
              className="w-full bg-transparent py-3 text-white outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <LogIn size={18} />
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
