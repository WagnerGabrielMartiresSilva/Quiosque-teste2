import React, { useState, useEffect, useMemo } from 'react';
import { Loja, Usuario, Venda, Produto } from '../../types';
import { getVendas, getProdutos, saveProduto, subscribeToSales } from '../../services/storeService';
import { playClickSound, playSuccessChime } from '../../utils/soundEffects';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Store,
  CreditCard,
  Banknote,
  QrCode,
  Radio,
  Edit2,
  Check,
  X,
  Plus,
  Flame,
  Cookie,
  Coffee,
  CupSoda,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: Usuario;
  lojas: Loja[];
  onOpenAntiFraud: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  lojas,
  onOpenAntiFraud,
}) => {
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>('todas');
  const [vendas, setVendas] = useState<Venda[]>(() => getVendas());
  const [produtos, setProdutos] = useState<Produto[]>(() => getProdutos());
  const [activeTab, setActiveTab] = useState<'visão-geral' | 'produtos'>('visão-geral');
  const [newSaleAlert, setNewSaleAlert] = useState<Venda | null>(null);

  // Editing product modal/inline
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  // Subscribe to realtime sales (Supabase channel emulation)
  useEffect(() => {
    const unsubscribe = subscribeToSales((newSale) => {
      setVendas((prev) => [newSale, ...prev]);
      setNewSaleAlert(newSale);
      playSuccessChime();
      setTimeout(() => setNewSaleAlert(null), 5000);
    });
    return () => unsubscribe();
  }, []);

  // Filtered sales based on store selection
  const filteredSales = useMemo(() => {
    if (selectedLojaFilter === 'todas') return vendas;
    return vendas.filter((v) => v.lojaId === selectedLojaFilter);
  }, [vendas, selectedLojaFilter]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, v) => acc + v.valorTotal, 0);
  }, [filteredSales]);

  const totalOrders = filteredSales.length;

  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const revenueByMethod = useMemo(() => {
    return filteredSales.reduce(
      (acc, v) => {
        if (v.formaPagamento === 'PIX') acc.pix += v.valorTotal;
        else if (v.formaPagamento === 'DINHEIRO') acc.dinheiro += v.valorTotal;
        else acc.cartao += v.valorTotal;
        return acc;
      },
      { pix: 0, dinheiro: 0, cartao: 0 }
    );
  }, [filteredSales]);

  // Revenue by store (when 'todas' is selected)
  const revenueByStore = useMemo(() => {
    return lojas.map((l) => {
      const storeSales = vendas.filter((v) => v.lojaId === l.id);
      const rev = storeSales.reduce((sum, v) => sum + v.valorTotal, 0);
      return {
        ...l,
        faturamento: rev,
        totalVendas: storeSales.length,
      };
    });
  }, [lojas, vendas]);

  const handleStartEditProduct = (prod: Produto) => {
    playClickSound();
    setEditingProduct(prod);
    setEditPrice(prod.preco.toFixed(2));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const priceNum = parseFloat(editPrice) || editingProduct.preco;
    const updated: Produto = {
      ...editingProduct,
      preco: priceNum,
    };
    const newProds = saveProduto(updated);
    setProdutos(newProds);
    setEditingProduct(null);
    playSuccessChime();
  };

  const handleToggleProductStatus = (prod: Produto) => {
    playClickSound();
    const updated = { ...prod, disponivel: !prod.disponivel };
    const newProds = saveProduto(updated);
    setProdutos(newProds);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Realtime Alert Banner */}
      {newSaleAlert && (
        <div className="bg-amber-400 text-stone-950 p-4 rounded-xl font-bold flex items-center justify-between shadow-xl animate-bounce-subtle">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-stone-950 animate-pulse" />
            <div>
              <span>NOVA VENDA EM TEMPO REAL: </span>
              <span className="font-black">R$ {newSaleAlert.valorTotal.toFixed(2)}</span>
              <span className="ml-2 font-normal text-xs">
                na {newSaleAlert.lojaNome} ({newSaleAlert.formaPagamento})
              </span>
            </div>
          </div>
          <span className="text-xs bg-stone-950 text-amber-300 px-2.5 py-1 rounded-md font-mono">
            {newSaleAlert.codigoVenda}
          </span>
        </div>
      )}

      {/* Header & Store Selector */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Painel Central da Rede
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Supabase Realtime Ativo
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            Gestão Multi-Loja & Fluxo de Caixa
          </h1>
          <p className="text-xs text-stone-400">
            Conectado ao PostgreSQL em nuvem. Monitorando 3 filiais simultâneas.
          </p>
        </div>

        {/* Store Selector & Anti-Fraud CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-stone-950 border border-stone-700 rounded-xl p-1 flex items-center">
            <button
              onClick={() => {
                playClickSound();
                setSelectedLojaFilter('todas');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedLojaFilter === 'todas'
                  ? 'bg-amber-400 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Todas (3 Unidades)
            </button>
            {lojas.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  playClickSound();
                  setSelectedLojaFilter(l.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLojaFilter === l.id
                    ? 'bg-amber-400 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {l.slug.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              playClickSound();
              onOpenAntiFraud();
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Auditoria Antifraude de Caixa</span>
          </button>
        </div>
      </div>

      {/* Tabs: Visão Geral vs Gestão de Produtos */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('visão-geral');
          }}
          className={`px-4 py-2 font-bold text-xs rounded-lg transition-all ${
            activeTab === 'visão-geral'
              ? 'bg-stone-800 text-white'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Visão Geral & Tempo Real
        </button>
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('produtos');
          }}
          className={`px-4 py-2 font-bold text-xs rounded-lg transition-all ${
            activeTab === 'produtos'
              ? 'bg-stone-800 text-white'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Cardápio & Preços ({produtos.length} itens)
        </button>
      </div>

      {activeTab === 'visão-geral' && (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-bold uppercase tracking-wider">Faturamento Hoje</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2 tabular-nums">
                R$ {totalRevenue.toFixed(2)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                {selectedLojaFilter === 'todas' ? 'Consolidado da rede' : 'Unidade selecionada'}
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-bold uppercase tracking-wider">Vendas Realizadas</span>
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2 tabular-nums">
                {totalOrders}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Cupons emitidos no balcão</div>
            </div>

            {/* Average Ticket */}
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-bold uppercase tracking-wider">Ticket Médio</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2 tabular-nums">
                R$ {averageTicket.toFixed(2)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Média gasta por cliente</div>
            </div>

            {/* Cash in Drawer vs Digital */}
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-bold uppercase tracking-wider">Em Espécie (Gaveta)</span>
                <Banknote className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-2xl font-black text-white mt-2 tabular-nums">
                R$ {revenueByMethod.dinheiro.toFixed(2)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                PIX: R$ {revenueByMethod.pix.toFixed(2)} · Cartão: R$ {revenueByMethod.cartao.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Breakdown by Store (if All is selected) */}
          {selectedLojaFilter === 'todas' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-400" />
                Desempenho por Unidade (Faturamento & Pedidos)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {revenueByStore.map((store) => {
                  const share =
                    totalRevenue > 0 ? (store.faturamento / totalRevenue) * 100 : 0;
                  return (
                    <div
                      key={store.id}
                      className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {store.nome}
                          </span>
                          <span className="text-[11px] text-stone-500">{store.bairro}</span>
                        </div>
                        <span className="text-xs bg-stone-900 text-amber-400 font-bold px-2 py-0.5 rounded">
                          {share.toFixed(0)}% da rede
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-lg font-black text-amber-400 tabular-nums">
                          R$ {store.faturamento.toFixed(2)}
                        </span>
                        <span className="text-xs text-stone-400">
                          {store.totalVendas} vendas
                        </span>
                      </div>
                      <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Realtime Live Sales Feed */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Feed de Vendas em Tempo Real (Supabase Realtime)
                </h3>
                <span className="text-xs text-stone-500">
                  Transmitido instantaneamente assim que o caixa clica em emitir cupom
                </span>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {filteredSales.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 font-semibold">
                    <th className="py-2.5 px-3">Cupom</th>
                    <th className="py-2.5 px-3">Unidade</th>
                    <th className="py-2.5 px-3">Operador(a)</th>
                    <th className="py-2.5 px-3">Itens</th>
                    <th className="py-2.5 px-3">Pagamento</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredSales.map((v) => (
                    <tr key={v.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {v.codigoVenda}
                      </td>
                      <td className="py-3 px-3 text-stone-200 font-medium">
                        {v.lojaNome}
                      </td>
                      <td className="py-3 px-3 text-stone-400">{v.operadorNome}</td>
                      <td className="py-3 px-3 text-stone-300">
                        <span className="font-semibold text-white">{v.quantidadeTotal} unid</span>
                        <span className="text-[11px] text-stone-500 block truncate max-w-xs">
                          {v.itens.map((i) => `${i.quantidade}x ${i.produtoNome}`).join(', ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-bold text-[11px]">
                          {v.formaPagamento === 'PIX' && (
                            <span className="text-emerald-400">PIX</span>
                          )}
                          {v.formaPagamento === 'DINHEIRO' && (
                            <span className="text-amber-400">Dinheiro</span>
                          )}
                          {(v.formaPagamento === 'CARTAO_DEBITO' ||
                            v.formaPagamento === 'CARTAO_CREDITO') && (
                            <span className="text-blue-400">Cartão</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums font-black text-white text-sm">
                        R$ {v.valorTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-stone-500 font-mono">
                        {new Date(v.dataHora).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Product & Price Manager */}
      {activeTab === 'produtos' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white">
                Gestão Centralizada de Cardápio e Preços
              </h3>
              <p className="text-xs text-stone-400">
                Qualquer alteração de preço reflete imediatamente no PDV dos operadores das 3 filiais.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {produtos.map((prod) => (
              <div
                key={prod.id}
                className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{prod.nome}</span>
                    <span className="text-[10px] text-stone-500 uppercase font-semibold">
                      {prod.categoria}
                    </span>
                  </div>
                  <div className="text-sm font-black text-amber-400 tabular-nums mt-1">
                    R$ {prod.preco.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleProductStatus(prod)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                      prod.disponivel
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {prod.disponivel ? 'Ativo' : 'Pausado'}
                  </button>

                  <button
                    onClick={() => handleStartEditProduct(prod)}
                    className="p-1.5 text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                    title="Editar preço do salgado"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Price Modal */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Editar Preço no PDV</h4>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-stone-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-stone-400">{editingProduct.nome}</p>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Novo Preço Unitário (R$):
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0.50"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-white font-bold text-lg"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="flex-1 py-2 text-xs font-bold text-stone-400 hover:text-white bg-stone-800 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl"
                    >
                      Salvar Alteração
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
