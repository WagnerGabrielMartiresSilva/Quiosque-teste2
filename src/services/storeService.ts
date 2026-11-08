import { Loja, Usuario, Produto, Venda, FechamentoCaixa, FechamentoStatus, PaymentMethod } from '../types';
import { LOJAS_INICIAIS, USUARIOS_INICIAIS, PRODUTOS_INICIAIS, VENDAS_INICIAIS, FECHAMENTOS_INICIAIS } from '../data/mockData';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
  LOJAS: 'sdc_lojas_v1',
  USUARIOS: 'sdc_usuarios_v1',
  PRODUTOS: 'sdc_produtos_v1',
  VENDAS: 'sdc_vendas_v1',
  FECHAMENTOS: 'sdc_fechamentos_v1',
  CURRENT_USER: 'sdc_current_user_v1',
};

type SaleListener = (sale: Venda) => void;
const saleListeners: Set<SaleListener> = new Set();

export const subscribeToSales = (callback: SaleListener) => {
  saleListeners.add(callback);
  return () => {
    saleListeners.delete(callback);
  };
};

export const notifyNewSale = (sale: Venda) => {
  saleListeners.forEach((cb) => {
    try {
      cb(sale);
    } catch (e) {
      console.error('Error notifying sale listener', e);
    }
  });
};

export const getLojas = (): Loja[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOJAS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.LOJAS, JSON.stringify(LOJAS_INICIAIS));
    return LOJAS_INICIAIS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return LOJAS_INICIAIS;
  }
};

export const getUsuarios = (): Usuario[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USUARIOS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(USUARIOS_INICIAIS));
    return USUARIOS_INICIAIS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return USUARIOS_INICIAIS;
  }
};

export const getCurrentUser = (): Usuario => {
  const users = getUsuarios();
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const found = users.find((u) => u.id === parsed.id);
      if (found) return found;
    } catch {}
  }
  // Default to Mariana (Caixa Copacabana) so the user directly experiences the high speed POS interface first!
  const defaultUser = users.find((u) => u.id === 'usr-cx-mariana') || users[0];
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
  return defaultUser;
};

export const setCurrentUser = (user: Usuario): void => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
};

export const getProdutos = async (lojaId: string): Promise<Produto[]> => {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }

  return (data ?? []).map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria,
    preco: Number(produto.preco_venda),
    descricao: produto.descricao ?? '',
    icone: 'utensils',
    disponivel: produto.ativo,
    destaque: false,
  }));
};

export const saveProduto = (produto: Produto): Produto[] => {
  const produtos = getProdutos();
  const index = produtos.findIndex((p) => p.id === produto.id);
  let updated: Produto[];
  if (index >= 0) {
    updated = [...produtos];
    updated[index] = produto;
  } else {
    updated = [produto, ...produtos];
  }
  localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(updated));
  return updated;
};

export const getVendas = (lojaId?: string): Venda[] => {
  const data = localStorage.getItem(STORAGE_KEYS.VENDAS);
  let vendas: Venda[] = VENDAS_INICIAIS;
  if (data) {
    try {
      vendas = JSON.parse(data);
    } catch {
      vendas = VENDAS_INICIAIS;
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.VENDAS, JSON.stringify(VENDAS_INICIAIS));
  }

  if (lojaId) {
    return vendas.filter((v) => v.lojaId === lojaId);
  }
  return vendas;
};

export const registrarVenda = (novaVenda: Omit<Venda, 'id' | 'codigoVenda'>): Venda => {
  const allVendas = getVendas();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  
  const vendaFinal: Venda = {
    ...novaVenda,
    id: `vnd-${Date.now()}-${randomNum}`,
    codigoVenda: `VND-${dateCode}-${String(allVendas.length + 1).padStart(3, '0')}`,
  };

  const updated = [vendaFinal, ...allVendas];
  localStorage.setItem(STORAGE_KEYS.VENDAS, JSON.stringify(updated));
  
  // Trigger Supabase-like realtime event to all listening views (such as the Owner's live stream)
  notifyNewSale(vendaFinal);

  return vendaFinal;
};

export const getFechamentos = (lojaId?: string): FechamentoCaixa[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FECHAMENTOS);
  let fechamentos: FechamentoCaixa[] = FECHAMENTOS_INICIAIS;
  if (data) {
    try {
      fechamentos = JSON.parse(data);
    } catch {
      fechamentos = FECHAMENTOS_INICIAIS;
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.FECHAMENTOS, JSON.stringify(FECHAMENTOS_INICIAIS));
  }

  if (lojaId) {
    return fechamentos.filter((f) => f.lojaId === lojaId);
  }
  return fechamentos;
};

export const registrarFechamentoCaixa = (dados: {
  lojaId: string;
  lojaNome: string;
  operadorId: string;
  operadorNome: string;
  donoConferenteId: string;
  donoConferenteNome: string;
  dataFechamento: string;
  saldoInicialAbertura: number;
  totalVendasDinheiroSistema: number;
  totalVendasPixSistema: number;
  totalVendasCartaoSistema: number;
  valorFisicoGavetaDeclarado: number;
  justificativa?: string;
}): FechamentoCaixa => {
  const all = getFechamentos();
  const totalGeralVendas = dados.totalVendasDinheiroSistema + dados.totalVendasPixSistema + dados.totalVendasCartaoSistema;
  const valorEsperadoGaveta = dados.saldoInicialAbertura + dados.totalVendasDinheiroSistema;
  const diferenca = Number((dados.valorFisicoGavetaDeclarado - valorEsperadoGaveta).toFixed(2));
  
  let status: FechamentoStatus = 'CONFERIDO_OK';
  if (diferenca > 0.05) {
    status = 'DIVERGENCIA_SOBRA';
  } else if (diferenca < -0.05) {
    status = 'DIVERGENCIA_QUEBRA';
  }

  const novoFechamento: FechamentoCaixa = {
    id: `fch-${Date.now()}`,
    codigoFechamento: `FCH-${dados.dataFechamento.replace(/-/g, '')}-${String(all.length + 1).padStart(2, '0')}`,
    lojaId: dados.lojaId,
    lojaNome: dados.lojaNome,
    operadorId: dados.operadorId,
    operadorNome: dados.operadorNome,
    donoConferenteId: dados.donoConferenteId,
    donoConferenteNome: dados.donoConferenteNome,
    dataFechamento: dados.dataFechamento,
    dataHoraRegistro: new Date().toISOString(),
    saldoInicialAbertura: dados.saldoInicialAbertura,
    totalVendasDinheiroSistema: dados.totalVendasDinheiroSistema,
    totalVendasPixSistema: dados.totalVendasPixSistema,
    totalVendasCartaoSistema: dados.totalVendasCartaoSistema,
    totalGeralVendasSistema: totalGeralVendas,
    valorFisicoGavetaDeclarado: dados.valorFisicoGavetaDeclarado,
    diferenca,
    status,
    justificativa: dados.justificativa || '',
  };

  const updated = [novoFechamento, ...all];
  localStorage.setItem(STORAGE_KEYS.FECHAMENTOS, JSON.stringify(updated));
  return novoFechamento;
};

export const resetDataToDefaults = () => {
  localStorage.setItem(STORAGE_KEYS.LOJAS, JSON.stringify(LOJAS_INICIAIS));
  localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(USUARIOS_INICIAIS));
  localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(PRODUTOS_INICIAIS));
  localStorage.setItem(STORAGE_KEYS.VENDAS, JSON.stringify(VENDAS_INICIAIS));
  localStorage.setItem(STORAGE_KEYS.FECHAMENTOS, JSON.stringify(FECHAMENTOS_INICIAIS));
};
