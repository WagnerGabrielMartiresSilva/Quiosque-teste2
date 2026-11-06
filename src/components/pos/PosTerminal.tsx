import React, { useState, useMemo } from 'react';
import { Produto, ProductCategory, ItemCarrinho, Usuario, Loja, Venda, PaymentMethod } from '../../types';
import { getProdutos, registrarVenda } from '../../services/storeService';
import { PaymentModal } from './PaymentModal';
import { ThermalReceipt } from './ThermalReceipt';
import { playClickSound, playDeleteSound, playSuccessChime } from '../../utils/soundEffects';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Layers,
  Flame,
  Cookie,
  Coffee,
  CupSoda,
  CheckCircle2,
  RefreshCw,
  Clock,
  Store,
  User,
} from 'lucide-react';

interface PosTerminalProps {
  currentUser: Usuario;
  currentStore: Loja;
  onSaleCompleted?: (sale: Venda) => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  currentUser,
  currentStore,
  onSaleCompleted,
}) => {
  const [produtos] = useState<Produto[]>(() => getProdutos());
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'Todos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<ItemCarrinho[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Venda | null>(null);
  const [quickFlashItemId, setQuickFlashItemId] = useState<string | null>(null);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return produtos.filter((p) => {
      if (!p.disponivel) return false;
      const matchesCat = activeCategory === 'Todos' || p.categoria === activeCategory;
      const matchesSearch =
        p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [produtos, activeCategory, searchQuery]);

  // Cart calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantidade, 0);
  }, [cart]);

  // Handlers for cart
  const handleAddToCart = (produto: Produto) => {
    playClickSound();
    setQuickFlashItemId(produto.id);
    setTimeout(() => setQuickFlashItemId(null), 300);

    setCart((prev) => {
      const existing = prev.find((i) => i.produto.id === produto.id);
      if (existing) {
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const handleUpdateQuantity = (produtoId: string, delta: number) => {
    playClickSound();
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.produto.id === produtoId) {
            const newQtd = item.quantidade + delta;
            return newQtd > 0 ? { ...item, quantidade: newQtd } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrinho[];
    });
  };

  const handleRemoveItem = (produtoId: string) => {
    playDeleteSound();
    setCart((prev) => prev.filter((i) => i.produto.id !== produtoId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    playDeleteSound();
    setCart([]);
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    playClickSound();
    setIsPaymentOpen(true);
  };

  const handleConfirmPayment = (
    formaPagamento: PaymentMethod,
    valorRecebido?: number,
    troco?: number
  ) => {
    const itensVenda = cart.map((item) => ({
      id: `it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      produtoId: item.produto.id,
      produtoNome: item.produto.nome,
      categoria: item.produto.categoria,
      quantidade: item.quantidade,
      precoUnitario: item.produto.preco,
      subtotal: Number((item.produto.preco * item.quantidade).toFixed(2)),
    }));

    const novaVenda = registrarVenda({
      lojaId: currentStore.id,
      lojaNome: currentStore.nome,
      operadorId: currentUser.id,
      operadorNome: currentUser.nome,
      itens: itensVenda,
      quantidadeTotal: totalItemCount,
      valorTotal: totalAmount,
      formaPagamento,
      valorRecebido,
      troco,
      dataHora: new Date().toISOString(),
    });

    setIsPaymentOpen(false);
    setCart([]);
    setLastCompletedSale(novaVenda);
    playSuccessChime();

    if (onSaleCompleted) {
      onSaleCompleted(novaVenda);
    }
  };

  // Category Icon helper
  const getCategoryIcon = (cat: ProductCategory | 'Todos') => {
    switch (cat) {
      case 'Fritos':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'Assados':
        return <Cookie className="w-4 h-4 text-orange-400" />;
      case 'Copo':
        return <Coffee className="w-4 h-4 text-yellow-400" />;
      case 'Bebidas':
        return <CupSoda className="w-4 h-4 text-cyan-400" />;
      default:
        return <Layers className="w-4 h-4 text-stone-400" />;
    }
  };

  const categories: (ProductCategory | 'Todos')[] = ['Todos', 'Fritos', 'Assados', 'Copo', 'Bebidas'];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-[calc(100vh-4.5rem)] bg-stone-950 overflow-hidden">
      {/* LEFT / CENTER: Products Grid (Optimized for Mouse Clicks) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
        {/* Top Control Bar: Store details, Search & Categories */}
        <div className="space-y-4 mb-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm tracking-tight">{currentStore.nome}</span>
                  <span className="text-xs text-stone-500 font-mono">({currentStore.bairro})</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>Operador:</span>
                  <strong className="text-stone-200">{currentUser.nome}</strong>
                  <span className="text-stone-600">·</span>
                  <span className="text-emerald-400 font-medium">PDV Conectado</span>
                </div>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar salgado ou bebida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Large Ergonomic Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const count = produtos.filter(
                (p) => cat === 'Todos' || p.categoria === cat
              ).length;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    playClickSound();
                    setActiveCategory(cat);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-400/20 scale-[1.02]'
                      : 'bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 border-stone-800'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-stone-950/20 text-stone-950' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid: Large, High-Contrast, Mouse-Friendly */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((produto) => {
              const inCartItem = cart.find((i) => i.produto.id === produto.id);
              const isFlashing = quickFlashItemId === produto.id;

              return (
                <div
                  key={produto.id}
                  onClick={() => handleAddToCart(produto)}
                  className={`group relative bg-stone-900 border rounded-2xl overflow-hidden p-3.5 flex flex-col justify-between transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    isFlashing
                      ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/10'
                      : inCartItem
                      ? 'border-amber-500/60 bg-stone-900/90 shadow-md shadow-amber-500/5'
                      : 'border-stone-800 hover:border-stone-700 hover:bg-stone-850'
                  }`}
                >
                  {/* Image & Category Header */}
                  <div>
                    <div className="relative w-full h-28 rounded-xl overflow-hidden bg-stone-950 border border-stone-800/80 mb-3 flex items-center justify-center">
                      {produto.imagemUrl ? (
                        <img
                          src={produto.imagemUrl}
                          alt={produto.nome}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-stone-600">
                          {getCategoryIcon(produto.categoria)}
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                            {produto.categoria}
                          </span>
                        </div>
                      )}

                      {/* In-Cart Quantity Badge in Corner */}
                      {inCartItem && (
                        <div className="absolute top-2 right-2 bg-amber-400 text-stone-950 font-black text-xs px-2 py-0.5 rounded-lg shadow-md animate-scale-up">
                          {inCartItem.quantidade}x
                        </div>
                      )}

                      {/* Category Tag */}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-black/70 backdrop-blur-sm text-stone-300">
                        {produto.categoria}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm leading-tight group-hover:text-amber-300 transition-colors line-clamp-2">
                      {produto.nome}
                    </h3>
                  </div>

                  {/* Price & Fast Plus Button */}
                  <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-semibold block leading-none">
                        Preço Unit.
                      </span>
                      <span className="text-base font-black text-amber-400 tabular-nums">
                        R$ {produto.preco.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(produto);
                      }}
                      className="w-9 h-9 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-stone-950 flex items-center justify-center shadow transition-all active:scale-90"
                      title="Adicionar à comanda (+1)"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-stone-900/50 rounded-2xl border border-stone-800 text-stone-400">
              <Search className="w-10 h-10 text-stone-600 mb-2" />
              <p className="text-sm font-semibold text-stone-300">Nenhum salgado encontrado</p>
              <p className="text-xs text-stone-500 mt-1">Tente mudar o filtro ou termo de busca.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Lateral Order / Comanda em Tempo Real */}
      <div className="w-full lg:w-[410px] xl:w-[440px] bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-800 flex flex-col shrink-0">
        {/* Cart Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wide">
                Comanda do Cliente
              </h2>
              <span className="text-[11px] text-stone-400">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens adicionados'}
              </span>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-900/30 transition-colors flex items-center gap-1 cursor-pointer"
              title="Cancelar / Limpar todos os itens da comanda"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.map((item) => {
            const subtotal = item.produto.preco * item.quantidade;
            return (
              <div
                key={item.produto.id}
                className="bg-stone-950 border border-stone-800/90 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-stone-700 transition-colors"
              >
                {/* Item description */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {item.produto.nome}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                    <span>R$ {item.produto.preco.toFixed(2)} cada</span>
                    <span className="text-stone-600">·</span>
                    <span className="text-amber-400 font-semibold tabular-nums">
                      R$ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Mouse-friendly quantity counter (+ / -) */}
                <div className="flex items-center gap-1.5 shrink-0 bg-stone-900 p-1 rounded-lg border border-stone-800">
                  <button
                    onClick={() => handleUpdateQuantity(item.produto.id, -1)}
                    className="w-7 h-7 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    title="Diminuir quantidade"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-7 text-center font-bold text-xs text-white tabular-nums">
                    {item.quantidade}
                  </span>

                  <button
                    onClick={() => handleUpdateQuantity(item.produto.id, 1)}
                    className="w-7 h-7 rounded-md bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    title="Aumentar quantidade"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleRemoveItem(item.produto.id)}
                  className="p-1.5 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {cart.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-stone-500 border border-dashed border-stone-800 rounded-2xl">
              <ShoppingCart className="w-12 h-12 text-stone-700 mb-3" />
              <p className="text-sm font-semibold text-stone-400">Comanda Vazia</p>
              <p className="text-xs text-stone-600 mt-1 max-w-[220px]">
                Clique nos salgados e bebidas no painel ao lado para registrar o pedido.
              </p>
            </div>
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
          {/* Subtotal & Total Display */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-stone-400">
              <span>Subtotal dos itens:</span>
              <span className="tabular-nums text-white">R$ {totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-stone-800">
              <span className="text-sm font-bold text-stone-300">TOTAL A COBRAR:</span>
              <span className="text-2xl font-black text-amber-400 tabular-nums">
                R$ {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Large Action Button for Checkout */}
          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className={`w-full py-4 px-6 rounded-xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              cart.length === 0
                ? 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 active:scale-[0.98]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Cobrar (R$ {totalAmount.toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentOpen && (
        <PaymentModal
          valorTotal={totalAmount}
          quantidadeItens={totalItemCount}
          onConfirm={handleConfirmPayment}
          onCancel={() => setIsPaymentOpen(false)}
        />
      )}

      {/* Thermal Receipt Modal (Cupom Não Fiscal) */}
      {lastCompletedSale && (
        <ThermalReceipt
          venda={lastCompletedSale}
          onClose={() => setLastCompletedSale(null)}
          onNewSale={() => setLastCompletedSale(null)}
        />
      )}
    </div>
  );
};
