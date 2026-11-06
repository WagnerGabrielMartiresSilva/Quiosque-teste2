import React, { useEffect, useState } from 'react';
import type { Usuario, Loja } from './types/index';
import { Header } from './components/Header';
import { PosTerminal } from './components/pos/PosTerminal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AntiFraudClosure } from './components/admin/AntiFraudClosure';
import { DjangoSupabaseDocs } from './components/tech/DjangoSupabaseDocs';
import { Login } from './components/login';
import { supabase } from './lib/supabase';
import { playClickSound } from './utils/soundEffects';

type PapelLoja = 'admin' | 'caixa';

interface DadosAutenticados {
  usuario: Usuario;
  lojas: Loja[];
  papeisPorLoja: Record<string, PapelLoja>;
}

async function carregarDadosUsuario(
  authUser: { id: string; email?: string }
): Promise<DadosAutenticados> {
  // 1. Buscar o cadastro do usuário.
  const { data: perfil, error: erroPerfil } = await supabase
    .from('usuarios')
    .select('id, nome, ativo')
    .eq('id', authUser.id)
    .maybeSingle();

  if (erroPerfil) throw erroPerfil;

  if (!perfil || !perfil.ativo) {
    throw new Error('Usuário não cadastrado ou inativo no sistema.');
  }

  // 2. Buscar os vínculos ativos do usuário com as lojas.
  const { data: vinculos, error: erroVinculos } = await supabase
    .from('loja_usuarios')
    .select('loja_id, papel')
    .eq('usuario_id', authUser.id)
    .eq('ativo', true);

  if (erroVinculos) throw erroVinculos;

  if (!vinculos || vinculos.length === 0) {
    throw new Error('Este usuário não possui vínculo ativo com nenhuma loja.');
  }

  const idsLojas = [...new Set(vinculos.map((v) => v.loja_id))];

  // 3. Buscar somente as lojas às quais o usuário tem acesso.
  const { data: lojasBanco, error: erroLojas } = await supabase
    .from('lojas')
    .select('id, nome, cnpj, ativo')
    .in('id', idsLojas)
    .eq('ativo', true);

  if (erroLojas) throw erroLojas;

  if (!lojasBanco || lojasBanco.length === 0) {
    throw new Error('Nenhuma loja ativa e autorizada foi encontrada.');
  }

  const papeisPorLoja: Record<string, PapelLoja> = {};

  vinculos.forEach((vinculo) => {
    const lojaExiste = lojasBanco.some(
      (loja) => loja.id === vinculo.loja_id
    );

    if (lojaExiste) {
      papeisPorLoja[vinculo.loja_id] =
        vinculo.papel === 'administrador' ? 'admin' : 'caixa';
    }
  });

  const lojasMapeadas: Loja[] = lojasBanco.map((loja) => ({
    id: loja.id,
    nome: loja.nome,
    slug: loja.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    bairro: '',
    endereco: '',
    telefone: '',
    cnpj: loja.cnpj || '',
    ativa: loja.ativo,
  }));

  const primeiraLoja = lojasMapeadas[0];

  const usuario: Usuario = {
    id: perfil.id,
    nome: perfil.nome,
    email: authUser.email || '',
    role: papeisPorLoja[primeiraLoja.id] || 'caixa',
    lojaId: primeiraLoja.id,
    cargo:
      papeisPorLoja[primeiraLoja.id] === 'admin'
        ? 'Administrador'
        : 'Operador de caixa',
  };

  return {
    usuario,
    lojas: lojasMapeadas,
    papeisPorLoja,
  };
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [currentStore, setCurrentStore] = useState<Loja | null>(null);

  const [papeisPorLoja, setPapeisPorLoja] = useState<
    Record<string, PapelLoja>
  >({});

  const [activeView, setActiveView] = useState<
    'pdv' | 'admin' | 'antifraude' | 'tech'
  >('pdv');

  // Restaura a sessão quando a aplicação é aberta ou recarregada.
  useEffect(() => {
    let ativo = true;

    const restaurarSessao = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session?.user) {
          const dados = await carregarDadosUsuario(data.session.user);

          if (!ativo) return;

          setCurrentUser(dados.usuario);
          setLojas(dados.lojas);
          setPapeisPorLoja(dados.papeisPorLoja);
          setCurrentStore(dados.lojas[0]);
        }
      } catch (error) {
        if (!ativo) return;

        setAuthError(
          error instanceof Error
            ? error.message
            : 'Não foi possível restaurar a sessão.'
        );
      } finally {
        if (ativo) setAuthLoading(false);
      }
    };

    restaurarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  // Login com e-mail e senha pelo Supabase Auth.
  const handleLogin = async (email: string, senha: string) => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Não foi possível identificar o usuário.');
      }

      const dados = await carregarDadosUsuario(data.user);

      setCurrentUser(dados.usuario);
      setLojas(dados.lojas);
      setPapeisPorLoja(dados.papeisPorLoja);
      setCurrentStore(dados.lojas[0]);
      setActiveView('pdv');
    } catch (error) {
      await supabase.auth.signOut();

      setCurrentUser(null);
      setCurrentStore(null);
      setLojas([]);
      setPapeisPorLoja({});

      setAuthError(
        error instanceof Error
          ? error.message
          : 'Erro ao realizar login.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Encerrar a sessão autenticada.
  const handleLogout = async () => {
    setAuthLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError('Não foi possível encerrar a sessão: ' + error.message);
      setAuthLoading(false);
      return;
    }

    setCurrentUser(null);
    setCurrentStore(null);
    setLojas([]);
    setPapeisPorLoja({});
    setActiveView('pdv');
    setAuthLoading(false);
  };

  // Trocar de loja somente entre as lojas autorizadas.
  const handleSelectStore = (store: Loja) => {
    const lojaAutorizada = lojas.find((loja) => loja.id === store.id);

    if (!lojaAutorizada || !currentUser) return;

    const papel = papeisPorLoja[store.id] || 'caixa';

    setCurrentStore(lojaAutorizada);

    setCurrentUser({
      ...currentUser,
      lojaId: lojaAutorizada.id,
      role: papel,
      cargo: papel === 'admin' ? 'Administrador' : 'Operador de caixa',
    });

    if (papel !== 'admin' &&
      (activeView === 'admin' || activeView === 'antifraude')) {
      setActiveView('pdv');
    }
  };

  const isBlockedByRbac =
    currentUser?.role === 'caixa' &&
    (activeView === 'admin' || activeView === 'antifraude');

  const podeSelecionarLoja = Object.values(papeisPorLoja).includes('admin');

  // Tela de carregamento da sessão.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-stone-400">
            Verificando acesso ao Quiosque...
          </p>
        </div>
      </div>
    );
  }

  // Sem usuário autenticado: mostrar somente o login.
  if (!currentUser || !currentStore) {
    return (
      <Login
        onLogin={handleLogin}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-400 selection:text-stone-950">
      <Header
        currentUser={currentUser}
        currentStore={currentStore}
        lojas={lojas}
        activeView={activeView}
        canSelectStore={podeSelecionarLoja}
        onNavigate={setActiveView}
        onSelectStore={handleSelectStore}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col">
        {isBlockedByRbac ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <span className="text-3xl">!</span>
              </div>

              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-rose-400">
                  Acesso restrito
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  Acesso permitido somente ao administrador
                </h2>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  Seu perfil não possui autorização para acessar esta área.
                  Você está conectado à loja {currentStore.nome}.
                </p>
              </div>

              <button
                onClick={() => {
                  playClickSound();
                  setActiveView('pdv');
                }}
                className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl"
              >
                Voltar para o PDV
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeView === 'pdv' && (
              <PosTerminal
                currentUser={currentUser}
                currentStore={currentStore}
                onSaleCompleted={() => {}}
              />
            )}

            {activeView === 'admin' && currentUser.role === 'admin' && (
              <AdminDashboard
                currentUser={currentUser}
                lojas={lojas}
                onOpenAntiFraud={() => setActiveView('antifraude')}
              />
            )}

            {activeView === 'antifraude' && currentUser.role === 'admin' && (
              <AntiFraudClosure
                currentUser={currentUser}
                lojas={lojas}
              />
            )}

            {activeView === 'tech' && <DjangoSupabaseDocs />}
          </>
        )}
      </main>

      {/* Navegação inferior para dispositivos móveis */}
      <div className="md:hidden sticky bottom-0 z-40 bg-stone-950/95 border-t border-stone-800 px-2 py-2 flex items-center justify-around text-[10px] font-bold">
        <button
          onClick={() => {
            playClickSound();
            setActiveView('pdv');
          }}
          className={`py-1.5 px-3 rounded-lg ${
            activeView === 'pdv'
              ? 'text-amber-400 bg-stone-900'
              : 'text-stone-400'
          }`}
        >
          PDV Caixa
        </button>

        {currentUser.role === 'admin' && (
          <>
            <button
              onClick={() => {
                playClickSound();
                setActiveView('admin');
              }}
              className={`py-1.5 px-3 rounded-lg ${
                activeView === 'admin'
                  ? 'text-amber-400 bg-stone-900'
                  : 'text-stone-400'
              }`}
            >
              Painel Dono
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveView('antifraude');
              }}
              className={`py-1.5 px-3 rounded-lg ${
                activeView === 'antifraude'
                  ? 'text-amber-400 bg-stone-900'
                  : 'text-stone-400'
              }`}
            >
              Antifraude
            </button>
          </>
        )}

        <button
          onClick={() => {
            playClickSound();
            setActiveView('tech');
          }}
          className={`py-1.5 px-3 rounded-lg ${
            activeView === 'tech'
              ? 'text-amber-400 bg-stone-900'
              : 'text-stone-400'
          }`}
        >
          Django/SQL
        </button>
      </div>
    </div>
  );
}