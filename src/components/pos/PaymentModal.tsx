import React, { useState } from 'react';
import { PaymentMethod } from '../../types';
import { QrCode, Banknote, CreditCard, X, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../utils/soundEffects';

interface PaymentModalProps {
  valorTotal: number;
  quantidadeItens: number;
  onConfirm: (formaPagamento: PaymentMethod, valorRecebido?: number, troco?: number) => void;
  onCancel: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  valorTotal,
  quantidadeItens,
  onConfirm,
  onCancel,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('PIX');
  const [valorRecebidoDinheiro, setValorRecebidoDinheiro] = useState<number>(valorTotal);
  const [pixConfirmado, setPixConfirmado] = useState(false);

  const troco = Math.max(0, Number((valorRecebidoDinheiro - valorTotal).toFixed(2)));
  const valorFaltante = Math.max(0, Number((valorTotal - valorRecebidoDinheiro).toFixed(2)));
  const dinheiroSuficiente = valorRecebidoDinheiro >= valorTotal;

  const quickBills = [10, 20, 50, 100];

  const handleQuickBillAdd = (bill: number) => {
    playClickSound();
    setValorRecebidoDinheiro((prev) => Number((prev + bill).toFixed(2)));
  };

  const handleSetExact = () => {
    playClickSound();
    setValorRecebidoDinheiro(valorTotal);
  };

  const handleFinalize = () => {
    if (selectedMethod === 'DINHEIRO' && !dinheiroSuficiente) {
      return;
    }
    playSuccessChime();
    if (selectedMethod === 'DINHEIRO') {
      onConfirm('DINHEIRO', valorRecebidoDinheiro, troco);
    } else {
      onConfirm(selectedMethod);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div>
            <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">
              Finalizar Venda no Caixa
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Total a Pagar:{' '}
              <span className="text-amber-400 font-black tabular-nums text-2xl">
                R$ {valorTotal.toFixed(2)}
              </span>
              <span className="text-xs text-stone-400 font-normal ml-1">
                ({quantidadeItens} {quantidadeItens === 1 ? 'item' : 'itens'})
              </span>
            </h2>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onCancel();
            }}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Methods Large Tabs */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {/* PIX */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedMethod('PIX');
              }}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                selectedMethod === 'PIX'
                  ? 'border-emerald-500 bg-emerald-500/15 text-white ring-2 ring-emerald-500/50 shadow-lg'
                  : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <QrCode className={`w-7 h-7 ${selectedMethod === 'PIX' ? 'text-emerald-400' : 'text-stone-400'}`} />
              <span className="text-sm font-bold tracking-wide">PIX Instantâneo</span>
              <span className="text-[11px] text-stone-400">QR Code na tela</span>
            </button>

            {/* Dinheiro */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedMethod('DINHEIRO');
                if (valorRecebidoDinheiro < valorTotal) {
                  setValorRecebidoDinheiro(valorTotal);
                }
              }}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                selectedMethod === 'DINHEIRO'
                  ? 'border-amber-500 bg-amber-500/15 text-white ring-2 ring-amber-500/50 shadow-lg'
                  : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <Banknote className={`w-7 h-7 ${selectedMethod === 'DINHEIRO' ? 'text-amber-400' : 'text-stone-400'}`} />
              <span className="text-sm font-bold tracking-wide">Dinheiro (Espécie)</span>
              <span className="text-[11px] text-stone-400">Calculadora de Troco</span>
            </button>

            {/* Cartões */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedMethod('CARTAO_DEBITO');
              }}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                selectedMethod === 'CARTAO_DEBITO' || selectedMethod === 'CARTAO_CREDITO'
                  ? 'border-blue-500 bg-blue-500/15 text-white ring-2 ring-blue-500/50 shadow-lg'
                  : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <CreditCard className={`w-7 h-7 ${selectedMethod === 'CARTAO_DEBITO' || selectedMethod === 'CARTAO_CREDITO' ? 'text-blue-400' : 'text-stone-400'}`} />
              <span className="text-sm font-bold tracking-wide">Cartão Máquininha</span>
              <span className="text-[11px] text-stone-400">Débito / Crédito</span>
            </button>
          </div>

          {/* Tab Content 1: PIX */}
          {selectedMethod === 'PIX' && (
            <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-xl shadow-md flex items-center justify-center">
                {/* Visual SVG QR Code for fast simulation */}
                <svg className="w-36 h-36" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#ffffff" />
                  {/* Outer corner squares */}
                  <rect x="10" y="10" width="24" height="24" fill="#000000" />
                  <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
                  <rect x="18" y="18" width="8" height="8" fill="#000000" />
                  <rect x="66" y="10" width="24" height="24" fill="#000000" />
                  <rect x="70" y="14" width="16" height="16" fill="#ffffff" />
                  <rect x="74" y="18" width="8" height="8" fill="#000000" />
                  <rect x="10" y="66" width="24" height="24" fill="#000000" />
                  <rect x="14" y="70" width="16" height="16" fill="#ffffff" />
                  <rect x="18" y="74" width="8" height="8" fill="#000000" />
                  {/* Grid details */}
                  <rect x="42" y="12" width="6" height="6" fill="#000000" />
                  <rect x="52" y="18" width="6" height="6" fill="#000000" />
                  <rect x="44" y="30" width="12" height="6" fill="#000000" />
                  <rect x="12" y="44" width="8" height="8" fill="#000000" />
                  <rect x="28" y="42" width="6" height="6" fill="#000000" />
                  <rect x="40" y="48" width="16" height="10" fill="#000000" />
                  <rect x="62" y="42" width="10" height="6" fill="#000000" />
                  <rect x="78" y="48" width="10" height="10" fill="#000000" />
                  <rect x="42" y="66" width="6" height="14" fill="#000000" />
                  <rect x="56" y="72" width="12" height="6" fill="#000000" />
                  <rect x="74" y="66" width="8" height="8" fill="#000000" />
                  <rect x="84" y="78" width="6" height="10" fill="#000000" />
                  <circle cx="50" cy="50" r="7" fill="#059669" />
                </svg>
              </div>

              <div className="flex-1 space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-base font-bold text-white">Chave PIX Dinâmica Gerada</h4>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Mostre a tela para o cliente apontar a câmera do celular ou copie a chave. O recebimento é liquidado em 3 segundos.
                </p>
                <div className="p-2.5 bg-stone-900 rounded-lg border border-stone-800 text-[11px] font-mono text-stone-300 break-all select-all flex items-center justify-between">
                  <span>00020126580014br.gov.bcb.pix0136...R${valorTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-400 font-bold shrink-0 ml-2">CARIOCA-PAY</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pixConfirmado}
                      onChange={(e) => setPixConfirmado(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-stone-800 border-stone-700"
                    />
                    <span>Notificação de pagamento recebida no celular do caixa</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: DINHEIRO with Auto-Change and Rapid Bills */}
          {selectedMethod === 'DINHEIRO' && (
            <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Input & Quick Cash buttons */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-stone-300">
                    Valor Entregue pelo Cliente:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min={0}
                      value={valorRecebidoDinheiro === 0 ? '' : valorRecebidoDinheiro}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setValorRecebidoDinheiro(val);
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white font-bold text-xl tabular-nums focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>

                  {/* Fast mouse buttons */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-stone-400">Atalhos rápidos de notas com o mouse:</div>
                    <div className="grid grid-cols-4 gap-2">
                      {quickBills.map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => handleQuickBillAdd(bill)}
                          className="py-2.5 px-2 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-bold rounded-lg border border-stone-700 transition-all flex flex-col items-center cursor-pointer"
                        >
                          <span>+R$ {bill}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSetExact}
                        className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                      >
                        Valor Exato (R$ {valorTotal.toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setValorRecebidoDinheiro(0);
                        }}
                        className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs rounded-lg transition-all cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Change Display Panel */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                      Cálculo Automático de Troco
                    </div>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between text-stone-400">
                        <span>Total dos Salgados:</span>
                        <span className="tabular-nums text-white">R$ {valorTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-400">
                        <span>Recebido no Caixa:</span>
                        <span className="tabular-nums text-white">
                          R$ {valorRecebidoDinheiro.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {dinheiroSuficiente ? (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-center">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">
                        Troco a Devolver ao Cliente:
                      </span>
                      <div className="text-3xl font-black text-emerald-300 tabular-nums mt-0.5">
                        R$ {troco.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-center">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-rose-400">
                        Falta para Completar a Compra:
                      </span>
                      <div className="text-2xl font-black text-rose-300 tabular-nums mt-0.5">
                        R$ {valorFaltante.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Cartão (Débito ou Crédito) */}
          {(selectedMethod === 'CARTAO_DEBITO' || selectedMethod === 'CARTAO_CREDITO') && (
            <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
              <div className="text-xs text-stone-300 font-medium">Selecione a modalidade na maquinha:</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedMethod('CARTAO_DEBITO');
                  }}
                  className={`p-4 rounded-xl border font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedMethod === 'CARTAO_DEBITO'
                      ? 'border-blue-400 bg-blue-500/20 text-blue-200 ring-2 ring-blue-500/30'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Cartão Débito
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedMethod('CARTAO_CREDITO');
                  }}
                  className={`p-4 rounded-xl border font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedMethod === 'CARTAO_CREDITO'
                      ? 'border-blue-400 bg-blue-500/20 text-blue-200 ring-2 ring-blue-500/30'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Cartão Crédito (À Vista)
                </button>
              </div>

              <div className="p-3 bg-stone-900/80 rounded-lg text-xs text-stone-400 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Insira ou aproxime o cartão na maquininha Stone/PagBank no valor de{' '}
                  <strong className="text-white">R$ {valorTotal.toFixed(2)}</strong>.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onCancel();
            }}
            className="px-5 py-3 text-xs font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-all cursor-pointer"
          >
            Voltar à Comanda
          </button>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={selectedMethod === 'DINHEIRO' && !dinheiroSuficiente}
            className={`px-8 py-3.5 text-sm font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
              selectedMethod === 'DINHEIRO' && !dinheiroSuficiente
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 active:scale-[0.98]'
            }`}
          >
            <span>Confirmar Pagamento e Emitir Cupom</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
