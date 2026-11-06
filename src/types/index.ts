export type UserRole = 'caixa' | 'admin';

export type ProductCategory = 'Fritos' | 'Assados' | 'Copo' | 'Bebidas';

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO';

export interface Loja {
  id: string;
  nome: string;
  slug: string;
  bairro: string;
  endereco: string;
  telefone: string;
  cnpj: string;
  ativa: boolean;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  lojaId?: string; // se for 'caixa', vinculado a uma loja específica. Se for 'admin', acesso a todas
  avatar?: string;
  cargo: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: ProductCategory;
  preco: number;
  descricao?: string;
  icone: string;
  imagemUrl?: string;
  disponivel: boolean;
  destaque?: boolean;
}

export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  observacao?: string;
}

export interface ItemVenda {
  id: string;
  produtoId: string;
  produtoNome: string;
  categoria: ProductCategory;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  codigoVenda: string;
  lojaId: string;
  lojaNome: string;
  operadorId: string;
  operadorNome: string;
  itens: ItemVenda[];
  quantidadeTotal: number;
  valorTotal: number;
  formaPagamento: PaymentMethod;
  valorRecebido?: number;
  troco?: number;
  dataHora: string; // ISO String
}

export type FechamentoStatus = 'CONFERIDO_OK' | 'DIVERGENCIA_SOBRA' | 'DIVERGENCIA_QUEBRA';

export interface FechamentoCaixa {
  id: string;
  codigoFechamento: string;
  lojaId: string;
  lojaNome: string;
  operadorId: string;
  operadorNome: string;
  donoConferenteId: string;
  donoConferenteNome: string;
  dataFechamento: string; // YYYY-MM-DD
  dataHoraRegistro: string;
  saldoInicialAbertura: number; // Fundo de troco da manhã
  totalVendasDinheiroSistema: number; // Somatório de Vendas em DINHEIRO registradas pelo PDV
  totalVendasPixSistema: number;
  totalVendasCartaoSistema: number;
  totalGeralVendasSistema: number;
  valorFisicoGavetaDeclarado: number; // Valor físico que o Dono contou na gaveta
  diferenca: number; // valorFisicoGavetaDeclarado - (saldoInicialAbertura + totalVendasDinheiroSistema)
  status: FechamentoStatus;
  justificativa?: string;
}
