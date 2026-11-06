import React, { useState } from 'react';
import { Venda } from '../../types';
import { Printer, Copy, Check, X, Sparkles } from 'lucide-react';

interface ThermalReceiptProps {
  venda: Venda;
  onClose: () => void;
  onNewSale: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  venda,
  onClose,
  onNewSale,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(venda.dataHora).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const paymentLabels: Record<string, string> = {
    PIX: 'PIX (QR CODE INSTANTÂNEO)',
    DINHEIRO: 'DINHEIRO (ESPÉCIE)',
    CARTAO_DEBITO: 'CARTÃO DE DÉBITO',
    CARTAO_CREDITO: 'CARTÃO DE CRÉDITO',
  };

  const receiptPlainText = `
========================================
       SALGADINHO DO CARIOCA
      O Legítimo Salgado do Rio
========================================
Loja: ${venda.lojaNome}
Cupom: ${venda.codigoVenda}
Data/Hora: ${formattedDate}
Operador(a): ${venda.operadorNome}
----------------------------------------
QTD  ITEM                       TOTAL
----------------------------------------
${venda.itens
  .map(
    (item) =>
      `${String(item.quantidade).padEnd(4)} ${item.produtoNome.slice(0, 24).padEnd(25)} R$ ${item.subtotal.toFixed(2)}`
  )
  .join('\n')}
----------------------------------------
ITENS TOTAIS:                   ${venda.quantidadeTotal}
VALOR TOTAL:                    R$ ${venda.valorTotal.toFixed(2)}
FORMA DE PAGTO:                 ${paymentLabels[venda.formaPagamento] || venda.formaPagamento}
${venda.valorRecebido ? `VALOR RECEBIDO:                R$ ${venda.valorRecebido.toFixed(2)}\nTROCO:                         R$ ${(venda.troco || 0).toFixed(2)}` : ''}
========================================
        DOCUMENTO NÃO FISCAL
       Agradecemos a Preferência!
========================================
  `;

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptPlainText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-sm tracking-wide">
              Comprovante de Venda
            </span>
            <span className="text-xs text-stone-500 font-mono">
              #{venda.codigoVenda}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Slip Simulation Container */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-stone-950/60">
          <div
            id="thermal-receipt-print"
            className="w-full max-w-xs bg-amber-50 text-stone-900 p-5 rounded shadow-lg font-mono text-xs leading-relaxed select-text border border-stone-200"
            style={{
              fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
            }}
          >
            <div className="text-center pb-2 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="text-sm font-black tracking-wider uppercase">
                Salgadinho do Carioca
              </div>
              <div className="text-[10px] text-stone-600">
                O Legítimo Salgado do Rio de Janeiro
              </div>
              <div className="text-[11px] font-semibold text-stone-800 mt-1">
                {venda.lojaNome}
              </div>
              <div className="text-[10px] text-stone-600">
                CNPJ: 48.912.404/0001-20
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-stone-600">CUPOM:</span>
                <span className="font-bold">{venda.codigoVenda}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">DATA/HORA:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">OPERADOR:</span>
                <span>{venda.operadorNome}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-stone-400 space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-stone-700 pb-0.5 border-b border-stone-200">
                <span>QTD ITEM</span>
                <span>TOTAL</span>
              </div>
              {venda.itens.map((item) => (
                <div key={item.id} className="flex justify-between text-[11px]">
                  <div className="truncate max-w-[190px]">
                    <span className="font-bold mr-1.5">{item.quantidade}x</span>
                    <span>{item.produtoNome}</span>
                  </div>
                  <span className="tabular-nums font-semibold shrink-0">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1">
              <div className="flex justify-between text-[11px] text-stone-700">
                <span>Total de Unidades</span>
                <span className="font-semibold">{venda.quantidadeTotal}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1">
                <span>TOTAL GERAL</span>
                <span className="tabular-nums text-emerald-800">
                  R$ {venda.valorTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-stone-600">PAGAMENTO:</span>
                <span className="font-bold uppercase">
                  {paymentLabels[venda.formaPagamento] || venda.formaPagamento}
                </span>
              </div>

              {venda.formaPagamento === 'DINHEIRO' && venda.valorRecebido && (
                <>
                  <div className="flex justify-between text-[11px] text-stone-600">
                    <span>VALOR RECEBIDO:</span>
                    <span className="tabular-nums">
                      R$ {venda.valorRecebido.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-stone-900">
                    <span>TROCO:</span>
                    <span className="tabular-nums">
                      R$ {(venda.troco || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 space-y-1 text-[10px] text-stone-600">
              <p className="font-bold uppercase text-stone-800 tracking-wider">
                *** CUPOM NÃO FISCAL ***
              </p>
              <p>Obrigado pela preferência e bom apetite!</p>
              <div className="mt-2 text-[9px] text-stone-400 font-mono tracking-widest">
                || | ||| | |||| || ||| || ||||
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Imprimir
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-400" />
                  Copiar
                </>
              )}
            </button>
          </div>

          <button
            onClick={onNewSale}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-xl shadow-lg shadow-amber-400/20 transition-all uppercase tracking-wide"
          >
            <Sparkles className="w-4 h-4" />
            Nova Venda (Próximo Cliente)
          </button>
        </div>
      </div>
    </div>
  );
};
