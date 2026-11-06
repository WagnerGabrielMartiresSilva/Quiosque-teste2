
import React, { useState } from 'react';
import type { Usuario, Loja } from '../types/index';
import {
  Volume2,
  VolumeX,
  Shield,
  User,
  Store,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import {
  playClickSound,
  isSoundEnabled,
  setSoundEnabled,
} from '../utils/soundEffects';

interface HeaderProps {
  currentUser: Usuario;
  currentStore: Loja;
  lojas: Loja[];
  activeView: 'pdv' | 'admin' | 'antifraude' | 'tech';
  canSelectStore: boolean;
  onNavigate: (view: 'pdv' | 'admin' | 'antifraude' | 'tech') => void;
  onSelectStore: (store: Loja) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentStore,
  lojas,
  activeView,
  canSelectStore,
  onNavigate,
  onSelectStore,
  onLogout,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  const toggleSound = () => {
    const next = !soundOn;

    setSoundOn(next);
    setSoundEnabled(next);

    if (next) {
      playClickSound();
    }
  };

  const handleNavigate = (
    view: 'pdv' | 'admin' | 'antifraude' | 'tech'
  ) => {
    playClickSound();
    onNavigate(view);
  };

  const handleSelectStore = (store: Loja) => {
    playClickSound();
    onSelectStore(store);
    setIsStoreMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/90 flex items-center justify-between gap-4 lg:gap-8 px-4 sm:px-6 py-3">
      {/* Identificação do sistema */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => handleNavigate('pdv')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black text-sm shadow-md shadow-amber-500/20">
            SC
          </div>

          <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap group-hover:text-amber-400 transition-colors">
            Salgadinho do Carioca
          </span>
        </button>
      </div>

      {/* Navegação principal */}
      <nav className="hidden md:flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => handleNavigate('pdv')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'pdv'
              ? 'bg-amber-400 text-stone-950 shadow-sm'
              : 'text-stone-300 hover:text-white hover:bg-stone-900'
          }`}
        >
          Frente de Caixa (PDV)
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => handleNavigate('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              Painel do Dono
            </button>

            <button
              onClick={() => handleNavigate('antifraude')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'antifraude'
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              Auditoria Antifraude
            </button>
          </>
        )}

        <button
          onClick={() => handleNavigate('tech')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'tech'
              ? 'bg-amber-400 text-stone-950 shadow-sm'
              : 'text-stone-300 hover:text-white hover:bg-stone-900'
          }`}
        >
          Código Django & Supabase
        </button>
      </nav>

      {/* Usuário, loja e controle de som */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={toggleSound}
          className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-900 transition-colors cursor-pointer"
          title={soundOn ? 'Desativar sons' : 'Ativar sons'}
        >
          {soundOn ? (
            <Volume2 className="w-4 h-4 text-amber-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-stone-500" />
          )}
        </button>

        {/* Seleção de loja: somente quando há vínculo administrativo */}
        <div className="relative">
          {canSelectStore ? (
            <>
              <button
                onClick={() => {
                  playClickSound();
                  setIsStoreMenuOpen(!isStoreMenuOpen);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl transition-all cursor-pointer"
              >
                <Store className="w-4 h-4 text-amber-400" />

                <div className="text-left hidden sm:block max-w-36">
                  <span className="text-xs font-bold text-white block leading-tight truncate">
                    {currentStore.nome}
                  </span>

                  <span className="text-[10px] text-stone-400 block leading-tight">
                    {isAdmin ? 'Administrador' : 'Caixa'}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {isStoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-stone-800 mb-1">
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Lojas autorizadas
                    </span>
                  </div>

                  <div className="space-y-1">
                    {lojas.map((loja) => (
                      <button
                        key={loja.id}
                        onClick={() => handleSelectStore(loja)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                          currentStore.id === loja.id
                            ? 'bg-amber-500/15 border border-amber-500/30 text-white'
                            : 'hover:bg-stone-800 text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />

                          <span className="text-xs font-bold truncate">
                            {loja.nome}
                          </span>
                        </div>

                        {currentStore.id === loja.id && (
                          <span className="text-[10px] font-bold text-amber-400">
                            Ativa
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl">
              <Store className="w-4 h-4 text-amber-400" />

              <div className="text-left hidden sm:block max-w-36">
                <span className="text-xs font-bold text-white block leading-tight truncate">
                  {currentStore.nome}
                </span>

                <span className="text-[10px] text-stone-400 block leading-tight">
                  Loja vinculada
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Identificação do usuário autenticado */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl">
          <div
            className={`w-2 h-2 rounded-full ${
              isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />

          <div className="text-left max-w-32">
            <span className="text-xs font-bold text-white block leading-tight truncate">
              {currentUser.nome}
            </span>

            <span className="text-[10px] text-stone-400 block leading-tight">
              {isAdmin ? 'Administrador' : 'Operador de caixa'}
            </span>
          </div>

          {isAdmin ? (
            <Shield className="w-4 h-4 text-amber-400" />
          ) : (
            <User className="w-4 h-4 text-emerald-400" />
          )}
        </div>

        {/* Encerrar sessão */}
        <button
          onClick={() => {
            playClickSound();
            onLogout();
          }}
          className="p-2 text-stone-400 hover:text-rose-400 rounded-lg hover:bg-stone-900 transition-colors cursor-pointer"
          title="Sair da conta"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
