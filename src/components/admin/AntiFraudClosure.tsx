import React, { useState, useMemo } from 'react';
import { Loja, Usuario, Venda, FechamentoCaixa } from '../../types';
import { getVendas, getFechamentos, registrarFechamentoCaixa } from '../../services/storeService';
import { playClickSound, playSuccessChime } from '../../utils/soundEffects';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Banknote,
  DollarSign,
  Calendar,
  Store,
  FileText,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface AntiFraudClosureProps {
  currentUser: Usuario;
  lojas: Loja[];
  onClosureCompleted?: () => void;
}

export const AntiFraudClosure: React.FC<AntiFraudClosureProps> = ({
  currentUser,
  lojas,
  onClosureCompleted,
}) => {
  const [selectedLojaId, setSelectedLojaId] = useState<string>(lojas[0]?.id || 'loja-copa');
  const [dataFechamento, setDataFechamento] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [fundoTrocoAbertura, setFundoTrocoAbertura] = useState<number>(100.00);
  const [valorFisicoGaveta, setValorFisicoGaveta] = useState<number | ''>('');
  const [justificativa, setJustificativa] = useState<string>('');
  const [showDenominationHelper, setShowDenominationHelper] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Quick denomination counter
  const [bills, setBills] = useState<{ [key: number]: number }>({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
  });

  const selectedLoja = useMemo(() => {
    return lojas.find((l) => l.id === selectedLojaId) || lojas[0];
  }, [lojas, selectedLojaId]);

  // Retrieve sales for the selected store on that date
  const salesForStore = useMemo(() => {
    const all = getVendas(selectedLojaId);
    return all.filter((v) => v.dataHora.startsWith(dataFechamento));
  }, [selectedLojaId, dataFechamento]);

  // Breakdown by payment method
  const totalDinheiroSistema = useMemo(() => {
    return salesForStore
      .filter((v) => v.formaPagamento === 'DINHEIRO')
      .reduce((sum, v) => sum + v.valorTotal, 0);
  }, [salesForStore]);

  const totalPixSistema = useMemo(() => {
    return salesForStore
      .filter((v) => v.formaPagamento === 'PIX')
      .reduce((sum, v) => sum + v.valorTotal, 0);
  }, [salesForStore]);

  const totalCartaoSistema = useMemo(() => {
    return salesForStore
      .filter((v) => v.formaPagamento === 'CARTAO_DEBITO' || v.formaPagamento === 'CARTAO_CREDITO')
      .reduce((sum, v) => sum + v.valorTotal, 0);
  }, [salesForStore]);

  const totalGeralVendas = totalDinheiroSistema + totalPixSistema + totalCartaoSistema;

  // Expected cash physically in the drawer: Opening cash float + cash sales
  const valorEsperadoGaveta = Number((fundoTrocoAbertura + totalDinheiroSistema).toFixed(2));

  // Difference: Physical counted - Expected
  const numericValorFisico = valorFisicoGaveta === '' ? 0 : Number(valorFisicoGaveta);
  const hasEnteredValue = valorFisicoGaveta !== '';
  const diferenca = Number((numericValorFisico - valorEsperadoGaveta).toFixed(2));

  const status = useMemo(() => {
    if (!hasEnteredValue) return null;
    if (Math.abs(diferenca) <= 0.05) return 'OK';
    if (diferenca > 0.05) return 'SOBRA';
    return 'QUEBRA';
  }, [hasEnteredValue, diferenca]);

  // Calculate total from bill denomination counter
  const handleUpdateBillCount = (denom: number, count: number) => {
    const updated = { ...bills, [denom]: Math.max(0, count) };
    setBills(updated);
    const sum = Object.entries(updated).reduce((acc, [val, q]) => acc + Number(val) * q, 0);
    setValorFisicoGaveta(sum);
  };

  const handleSalvarFechamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEnteredValue) return;

    playSuccessChime();

    // Determine cashier from the sales of that day
    const lastSale = salesForStore[0];
    const operadorNome = lastSale ? lastSale.operadorNome : 'Operador do Turno';
    const operadorId = lastSale ? lastSale.operadorId : 'usr-operador-turno';

    const fechamento = registrarFechamentoCaixa({
      lojaId: selectedLoja.id,
      lojaNome: selectedLoja.nome,
      operadorId,
      operadorNome,
      donoConferenteId: currentUser.id,
      donoConferenteNome: currentUser.nome,
      dataFechamento,
      saldoInicialAbertura: fundoTrocoAbertura,
      totalVendasDinheiroSistema: totalDinheiroSistema,
      totalVendasPixSistema: totalPixSistema,
      totalVendasCartaoSistema: totalCartaoSistema,
      valorFisicoGavetaDeclarado: numericValorFisico,
      justificativa,
    });

    setSavedSuccessMsg(`Fechamento ${fechamento.codigoFechamento} auditado e salvo com sucesso!`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);

    if (onClosureCompleted) {
      onClosureCompleted();
    }
  };

  const historicoFechamentos = useMemo(() => {
    return getFechamentos(selectedLojaId);
  }, [selectedLojaId, savedSuccessMsg]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Auditoria de Gaveta Exclusiva do Dono
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Módulo Antifraude de Baixa de Caixa
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Confronto cego entre o montante faturado em dinheiro físico e a contagem real da gaveta.
              </p>
            </div>
          </div>

          {/* Store & Date Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                Unidade Auditada:
              </label>
              <select
                value={selectedLojaId}
                onChange={(e) => {
                  playClickSound();
                  setSelectedLojaId(e.target.value);
                }}
                className="px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                Data do Caixa:
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="date"
                  value={dataFechamento}
                  onChange={(e) => setDataFechamento(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {savedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Left = System Totals / Right = Physical Input & Calculation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Registered System Metrics */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              1. Valores Registrados no Sistema PDV
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              {salesForStore.length} vendas hoje
            </span>
          </div>

          <div className="space-y-3">
            {/* Opening cash float */}
            <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-300 block">
                  Fundo de Troco de Abertura (Manhã)
                </span>
                <span className="text-[11px] text-stone-500">
                  Cédulas e moedas iniciais entregues ao operador
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-400">R$</span>
                <input
                  type="number"
                  value={fundoTrocoAbertura}
                  onChange={(e) => setFundoTrocoAbertura(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-stone-900 border border-stone-700 rounded text-right font-bold text-white text-sm"
                />
              </div>
            </div>

            {/* Cash Sales (Only Cash touches the physical drawer!) */}
            <div className="p-3.5 bg-stone-950 rounded-xl border border-amber-900/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    Vendas em Dinheiro (Espécie)
                  </span>
                </div>
                <span className="text-[11px] text-stone-500">
                  Somatório de notas físicas recebidas no balcão
                </span>
              </div>
              <span className="text-base font-black text-amber-400 tabular-nums">
                R$ {totalDinheiroSistema.toFixed(2)}
              </span>
            </div>

            {/* Other Payment Methods (Electronic / Bank Account) */}
            <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/80 space-y-2 text-xs">
              <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold block">
                Pagamentos Eletrônicos (Não entram na gaveta)
              </span>
              <div className="flex justify-between text-stone-300">
                <span>PIX Instantâneo (Conta PJ):</span>
                <span className="tabular-nums font-semibold">R$ {totalPixSistema.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Cartões de Débito/Crédito:</span>
                <span className="tabular-nums font-semibold">
                  R$ {totalCartaoSistema.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-stone-400 pt-1.5 border-t border-stone-800">
                <span>Faturamento Total do Dia:</span>
                <span className="tabular-nums font-bold text-white">
                  R$ {totalGeralVendas.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Formula box */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                Total Físico Esperado na Gaveta:
              </span>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-stone-300">
                  (Fundo R$ {fundoTrocoAbertura.toFixed(2)} + Vendas Dinheiro R$ {totalDinheiroSistema.toFixed(2)})
                </span>
                <span className="text-xl font-black text-white tabular-nums">
                  R$ {valorEsperadoGaveta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Physical Count & Antifraud Resolution */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              2. Conferência Física da Gaveta pelo Dono
            </h3>
            <button
              type="button"
              onClick={() => setShowDenominationHelper(!showDenominationHelper)}
              className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              {showDenominationHelper ? 'Ocultar contagem de cédulas' : 'Contador por cédulas'}
            </button>
          </div>

          <form onSubmit={handleSalvarFechamento} className="space-y-4">
            {/* Optional Denomination Counter */}
            {showDenominationHelper && (
              <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <span className="text-[11px] font-semibold text-stone-400 block">
                  Contagem rápida de notas na gaveta:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 50, 20, 10, 5, 2].map((denom) => (
                    <div
                      key={denom}
                      className="p-2 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-stone-300">R$ {denom}</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={bills[denom] || ''}
                        onChange={(e) =>
                          handleUpdateBillCount(denom, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-12 px-1.5 py-0.5 bg-stone-950 border border-stone-700 rounded text-right text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Total Input */}
            <div>
              <label className="block text-xs font-bold text-stone-200 mb-1.5">
                Valor Total em Dinheiro Encontrado na Gaveta:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-base">
                  R$
                </span>
                <input
                  type="number"
                  step="0.05"
                  required
                  placeholder="0.00"
                  value={valorFisicoGaveta}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValorFisicoGaveta(v === '' ? '' : parseFloat(v));
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-white font-black text-2xl tabular-nums focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Some todas as notas e moedas físicas presentes na gaveta ao fechar o caixa.
              </p>
            </div>

            {/* Antifraud Result Card */}
            {hasEnteredValue && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  status === 'OK'
                    ? 'bg-emerald-950/70 border-emerald-700'
                    : status === 'SOBRA'
                    ? 'bg-blue-950/70 border-blue-700'
                    : 'bg-rose-950/80 border-rose-600 ring-2 ring-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === 'OK' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {status === 'SOBRA' && <HelpCircle className="w-5 h-5 text-blue-400" />}
                    {status === 'QUEBRA' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                    <span className="font-bold text-sm text-white">
                      {status === 'OK' && 'Caixa Perfeito (Sem Divergência)'}
                      {status === 'SOBRA' && 'Sobra de Caixa Identificada'}
                      {status === 'QUEBRA' && 'ALERTA ANTIFRAUDE: Quebra de Caixa (Falta)'}
                    </span>
                  </div>
                  <span
                    className={`font-black text-lg tabular-nums ${
                      status === 'OK'
                        ? 'text-emerald-400'
                        : status === 'SOBRA'
                        ? 'text-blue-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {diferenca > 0 ? `+ R$ ${diferenca.toFixed(2)}` : `R$ ${diferenca.toFixed(2)}`}
                  </span>
                </div>

                <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                  {status === 'OK' &&
                    'O valor físico coincide perfeitamente com o total esperado das vendas em dinheiro mais o fundo de troco.'}
                  {status === 'SOBRA' &&
                    `Há R$ ${diferenca.toFixed(2)} a mais na gaveta do que o registrado. Pode indicar recebimento não lançado no PDV ou troco errado retido.`}
                  {status === 'QUEBRA' &&
                    `FALTA de R$ ${Math.abs(diferenca).toFixed(2)} na gaveta física. O sistema sinalizou divergência entre o faturamento declarado e o valor físico.`}
                </p>
              </div>
            )}

            {/* Justification Note (Compulsory if there is difference) */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Parecer do Dono / Justificativa da Divergência:
              </label>
              <textarea
                rows={2}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Quebra tolerada de moedas, cancelamento não registrado, conferido e aprovado pelo Carlos."
                className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!hasEnteredValue}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !hasEnteredValue
                  ? 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-50'
                  : 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg shadow-amber-400/20 active:scale-[0.99]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Registrar e Bloquear Fechamento de Caixa</span>
            </button>
          </form>
        </div>
      </div>

      {/* Historical Audit Log of Closures for this Store */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white">
              Histórico de Baixas & Auditorias Anteriores ({selectedLoja.nome})
            </h3>
            <span className="text-xs text-stone-500">
              Registros invioláveis gravados com conferente e operador responsável
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-semibold">
                <th className="py-2.5 px-3">Código / Data</th>
                <th className="py-2.5 px-3">Operador(a)</th>
                <th className="py-2.5 px-3">Vendas Dinheiro</th>
                <th className="py-2.5 px-3">Físico Declarado</th>
                <th className="py-2.5 px-3">Diferença</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Parecer / Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {historicoFechamentos.map((f) => (
                <tr key={f.id} className="hover:bg-stone-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{f.codigoFechamento}</span>
                    <span className="text-[11px] text-stone-500">{f.dataFechamento}</span>
                  </td>
                  <td className="py-3 px-3 text-stone-300">
                    <span className="font-medium">{f.operadorNome}</span>
                    <span className="text-[10px] text-stone-500 block">
                      Auditado por: {f.donoConferenteNome}
                    </span>
                  </td>
                  <td className="py-3 px-3 tabular-nums font-semibold text-stone-200">
                    R$ {f.totalVendasDinheiroSistema.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-white">
                    R$ {f.valorFisicoGavetaDeclarado.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold">
                    <span
                      className={
                        f.diferenca === 0
                          ? 'text-emerald-400'
                          : f.diferenca > 0
                          ? 'text-blue-400'
                          : 'text-rose-400'
                      }
                    >
                      {f.diferenca > 0 ? `+ R$ ${f.diferenca.toFixed(2)}` : `R$ ${f.diferenca.toFixed(2)}`}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        f.status === 'CONFERIDO_OK'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : f.status === 'DIVERGENCIA_SOBRA'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {f.status === 'CONFERIDO_OK' && 'Perfeito'}
                      {f.status === 'DIVERGENCIA_SOBRA' && 'Sobra'}
                      {f.status === 'DIVERGENCIA_QUEBRA' && 'Quebra'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-stone-400 text-[11px] max-w-xs truncate">
                    {f.justificativa || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
