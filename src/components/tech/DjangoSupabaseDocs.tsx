import React, { useState } from 'react';
import { Copy, Check, Code, Database, Shield, Terminal, Download, FileCode } from 'lucide-react';
import { playClickSound } from '../../utils/soundEffects';

export const DjangoSupabaseDocs: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'models' | 'views' | 'serializers' | 'supabase_sql' | 'urls' | 'architecture'>('models');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (code: string, key: string) => {
    playClickSound();
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const codeModels = `"""
models.py - Salgadinho do Carioca (PDV & Fluxo de Caixa Multi-Loja)
Framework: Django 5.x + PostgreSQL (Supabase)
"""

import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator


class Loja(models.Model):
    """Representa uma das 3 unidades do Salgadinho do Carioca"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=120, help_text="Ex: Unidade 01 - Copacabana")
    slug = models.SlugField(max_length=50, unique=True)
    endereco = models.CharField(max_length=255)
    bairro = models.CharField(max_length=80)
    telefone = models.CharField(max_length=20, blank=True)
    cnpj = models.CharField(max_length=18, unique=True)
    ativa = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Loja"
        verbose_name_plural = "Lojas"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.bairro})"


class Usuario(AbstractUser):
    """
    Usuário customizado com RBAC:
    - CAIXA: Operador vinculado estritamente a 1 loja específica (apenas PDV)
    - ADMIN: Dono com acesso global a todas as lojas, relatórios e fechamentos
    """
    ROLE_CHOICES = (
        ('caixa', 'Operador de Caixa'),
        ('admin', 'Dono / Administrador Geral'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='caixa')
    loja = models.ForeignKey(
        Loja,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='funcionarios',
        help_text="Obrigatório para operadores de caixa. O Dono pode deixar em branco (acesso global)."
    )

    def is_dono(self):
        return self.role == 'admin' or self.is_superuser

    def is_caixa(self):
        return self.role == 'caixa'

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.role == 'caixa' and not self.loja:
            raise ValidationError({'loja': 'Um operador de caixa DEVE estar vinculado a uma loja específica.'})


class Produto(models.Model):
    """Itens comercializados no balcão de salgados"""
    CATEGORIA_CHOICES = (
        ('Fritos', 'Salgados Fritos'),
        ('Assados', 'Salgados Assados'),
        ('Copo', 'Copo / Minis / Cento'),
        ('Bebidas', 'Bebidas e Refrigerantes'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=150, unique=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, db_index=True)
    preco = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    icone = models.CharField(max_length=50, default='Flame', help_text="Identificador de ícone ou SVG")
    imagem_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL da foto no Supabase Storage")
    disponivel = models.BooleanField(default=True, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['categoria', 'nome']

    def __str__(self):
        return f"{self.nome} - R$ {self.preco:.2f}"


class Venda(models.Model):
    """Registro de cupom de venda no caixa"""
    PAGAMENTO_CHOICES = (
        ('PIX', 'PIX Instantâneo'),
        ('DINHEIRO', 'Dinheiro (Espécie)'),
        ('CARTAO_DEBITO', 'Cartão de Débito'),
        ('CARTAO_CREDITO', 'Cartão de Crédito'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_venda = models.CharField(max_length=32, unique=True, editable=False)
    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name='vendas', db_index=True)
    operador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='vendas_realizadas')
    forma_pagamento = models.CharField(max_length=20, choices=PAGAMENTO_CHOICES, db_index=True)
    quantidade_total = models.PositiveIntegerField(default=1)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    valor_recebido = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    troco = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    data_hora = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Venda"
        verbose_name_plural = "Vendas"
        ordering = ['-data_hora']

    def __str__(self):
        return f"{self.codigo_venda} - {self.loja.nome} - R$ {self.valor_total:.2f}"


class ItemVenda(models.Model):
    """Itens individualizados de uma venda"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    preco_unitario = models.DecimalField(max_digits=8, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Item da Venda"
        verbose_name_plural = "Itens da Venda"

    def save(self, *args, **kwargs):
        self.subtotal = self.preco_unitario * Decimal(self.quantidade)
        super().save(*args, **kwargs)


class FechamentoCaixa(models.Model):
    """
    Módulo Antifraude de Baixa de Caixa:
    Realizado EXCLUSIVAMENTE pelo Dono no final do turno/dia.
    Cruza o valor em DINHEIRO do sistema com a contagem física declarada da gaveta.
    """
    STATUS_CHOICES = (
        ('CONFERIDO_OK', 'Conferido OK (Sem divergência)'),
        ('DIVERGENCIA_SOBRA', 'Divergência: Sobra de Caixa'),
        ('DIVERGENCIA_QUEBRA', 'Divergência: Quebra de Caixa (Falta)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_fechamento = models.CharField(max_length=32, unique=True, editable=False)
    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name='fechamentos')
    operador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='fechamentos_operados')
    dono_conferente = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='fechamentos_auditados')
    data_fechamento = models.DateField(db_index=True)
    data_hora_registro = models.DateTimeField(auto_now_add=True)
    
    saldo_inicial_abertura = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('100.00'), help_text="Fundo de troco da manhã")
    total_vendas_dinheiro_sistema = models.DecimalField(max_digits=10, decimal_places=2, help_text="Somente vendas em espécie")
    total_vendas_pix_sistema = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_vendas_cartao_sistema = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_geral_vendas_sistema = models.DecimalField(max_digits=10, decimal_places=2)
    
    valor_fisico_gaveta_declarado = models.DecimalField(max_digits=10, decimal_places=2, help_text="Contagem física de cédulas e moedas feita pelo Dono")
    diferenca = models.DecimalField(max_digits=10, decimal_places=2, help_text="Físico - (Fundo + Dinheiro Sistema)")
    status = models.CharField(max_length=25, choices=STATUS_CHOICES)
    justificativa = models.TextField(blank=True, help_text="Parecer obrigatório do Dono se houver quebra ou sobra")

    class Meta:
        verbose_name = "Fechamento de Caixa"
        verbose_name_plural = "Fechamentos de Caixa"
        ordering = ['-data_hora_registro']
        unique_together = ('loja', 'data_fechamento')

    def __str__(self):
        return f"{self.codigo_fechamento} - {self.loja.nome} ({self.status})"
`;

  const codeViews = `"""
views.py - Salgadinho do Carioca
Controle de Permissões RBAC, Decorators e Endpoints REST / Supabase
"""

from decimal import Decimal
from datetime import date
from functools import wraps
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum
from rest_framework import status, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Loja, Usuario, Produto, Venda, ItemVenda, FechamentoCaixa
from .serializers import (
    LojaSerializer,
    ProdutoSerializer,
    VendaCreateSerializer,
    VendaDetailSerializer,
    FechamentoCaixaSerializer,
)


# ==============================================================================
# DECORATORS & PERMISSIONS DE SEGURANÇA (RBAC)
# ==============================================================================

def role_required(allowed_roles):
    """
    Decorator para views Django padrão. Garante que apenas usuários com a role
    permitida (ex: 'admin' para relatórios e fechamentos) possam executar a view.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response({'erro': 'Autenticação necessária.'}, status=status.HTTP_401_UNAUTHORIZED)
            if request.user.role not in allowed_roles:
                raise PermissionDenied(f"Acesso negado: Perfil '{request.user.role}' não autorizado a acessar este recurso.")
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


class IsAdminDono(permissions.BasePermission):
    """Permissão DRF: Somente o Dono/Administrador tem acesso total."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsCaixaOrAdmin(permissions.BasePermission):
    """Permissão DRF: Caixa acessa sua própria loja, Admin acessa todas."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# ==============================================================================
# 1. VIEW DE PRODUTOS (CARDÁPIO PDV)
# ==============================================================================

class ProdutoViewSet(viewsets.ModelViewSet):
    """
    - Caixas: Apenas LEITURA dos produtos disponíveis.
    - Dono: Leitura, alteração de preços e cadastro de novos itens.
    """
    queryset = Produto.objects.all().order_by('categoria', 'nome')
    serializer_class = ProdutoSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminDono()]  # Apenas Dono altera preço ou cadastra!


# ==============================================================================
# 2. VIEW DE VENDAS DO PDV (ALTA AGILIDADE)
# ==============================================================================

class RegistrarVendaPDVView(APIView):
    """
    Endpoint otimizado para gravação atômica da venda gerada pelo clique de mouse.
    Garante que o Operador de Caixa só consiga lançar vendas para a SUA loja vinculada!
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        usuario = request.user
        loja_id = request.data.get('loja_id')

        # RBAC Check: Operador de caixa não pode emitir venda para outra filial
        if usuario.role == 'caixa':
            if str(usuario.loja_id) != str(loja_id):
                return Response(
                    {'erro': 'Violação de Segurança: Caixa só pode emitir pedidos para sua própria filial.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            loja = usuario.loja
        else:
            loja = get_object_or_404(Loja, id=loja_id)

        serializer = VendaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        venda = serializer.save(loja=loja, operador=usuario)

        # Retorna os dados completos formatados para emissão do cupom não-fiscal
        return Response(VendaDetailSerializer(venda).data, status=status.HTTP_201_CREATED)


# ==============================================================================
# 3. MÓDULO ANTIFRAUDE DE BAIXA DE CAIXA (EXCLUSIVO DO DONO)
# ==============================================================================

class BaixaCaixaAntifraudeView(APIView):
    """
    Endpoint restrito ao Dono.
    1. Calcula o valor esperado em dinheiro (Fundo Abertura + Vendas em Espécie no dia)
    2. Cruza com o valor físico declarado pelo Dono após abrir a gaveta
    3. Registra a auditoria calculando automaticamente SOBRA ou QUEBRA de caixa.
    """
    permission_classes = [IsAdminDono]

    def get(self, request, loja_id):
        """Pré-conferência: Retorna o total faturado no sistema para a loja"""
        data_consulta = request.query_params.get('data', date.today().isoformat())
        loja = get_object_or_404(Loja, id=loja_id)

        vendas_dinheiro = Venda.objects.filter(
            loja=loja,
            data_hora__date=data_consulta,
            forma_pagamento='DINHEIRO'
        ).aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

        vendas_pix = Venda.objects.filter(
            loja=loja,
            data_hora__date=data_consulta,
            forma_pagamento='PIX'
        ).aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

        vendas_cartao = Venda.objects.filter(
            loja=loja,
            data_hora__date=data_consulta,
            forma_pagamento__in=['CARTAO_DEBITO', 'CARTAO_CREDITO']
        ).aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

        return Response({
            'loja_nome': loja.nome,
            'data': data_consulta,
            'vendas_dinheiro_sistema': vendas_dinheiro,
            'vendas_pix_sistema': vendas_pix,
            'vendas_cartao_sistema': vendas_cartao,
            'faturamento_total_dia': vendas_dinheiro + vendas_pix + vendas_cartao,
        })

    @transaction.atomic
    def post(self, request, loja_id):
        loja = get_object_or_404(Loja, id=loja_id)
        data_fechamento = request.data.get('data_fechamento', date.today().isoformat())
        fundo_abertura = Decimal(str(request.data.get('saldo_inicial_abertura', '100.00')))
        valor_fisico_declarado = Decimal(str(request.data.get('valor_fisico_gaveta_declarado', '0.00')))
        justificativa = request.data.get('justificativa', '')

        # Soma real gravada no banco
        vendas_dinheiro = Venda.objects.filter(
            loja=loja,
            data_hora__date=data_fechamento,
            forma_pagamento='DINHEIRO'
        ).aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

        vendas_pix = Venda.objects.filter(
            loja=loja,
            data_hora__date=data_fechamento,
            forma_pagamento='PIX'
        ).aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

        vendas_cartao = Venda.objects.filter(
            loja=loja,
            data_hora__date=data_fechamento,
            forma_pagamento__in=['CARTAO_DEBITO', 'CARTAO_CREDITO']
        ).aggregate(total=Sum('valor_total'))['total'] or Decimal('0.00')

        # CÁLCULO ANTIFRAUDE:
        valor_esperado_gaveta = fundo_abertura + vendas_dinheiro
        diferenca = valor_fisico_declarado - valor_esperado_gaveta

        if abs(diferenca) <= Decimal('0.05'):
            status_fechamento = 'CONFERIDO_OK'
        elif diferenca > Decimal('0.05'):
            status_fechamento = 'DIVERGENCIA_SOBRA'
        else:
            status_fechamento = 'DIVERGENCIA_QUEBRA'

        # Busca o operador que realizou a última venda do dia naquela filial
        ultima_venda = Venda.objects.filter(loja=loja, data_hora__date=data_fechamento).last()
        operador = ultima_venda.operador if ultima_venda else request.user

        # Gera código único do fechamento
        codigo = f"FCH-{data_fechamento.replace('-', '')}-{loja.slug.upper()[:4]}"

        fechamento = FechamentoCaixa.objects.create(
            codigo_fechamento=codigo,
            loja=loja,
            operador=operador,
            dono_conferente=request.user,
            data_fechamento=data_fechamento,
            saldo_inicial_abertura=fundo_abertura,
            total_vendas_dinheiro_sistema=vendas_dinheiro,
            total_vendas_pix_sistema=vendas_pix,
            total_vendas_cartao_sistema=vendas_cartao,
            total_geral_vendas_sistema=vendas_dinheiro + vendas_pix + vendas_cartao,
            valor_fisico_gaveta_declarado=valor_fisico_declarado,
            diferenca=diferenca,
            status=status_fechamento,
            justificativa=justificativa,
        )

        return Response(FechamentoCaixaSerializer(fechamento).data, status=status.HTTP_201_CREATED)
`;

  const codeSerializers = `"""
serializers.py - Salgadinho do Carioca
Serializers Django REST Framework com criação transacional aninhada
"""

from decimal import Decimal
from datetime import datetime
from rest_framework import serializers
from .models import Loja, Usuario, Produto, Venda, ItemVenda, FechamentoCaixa


class LojaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loja
        fields = ['id', 'nome', 'slug', 'bairro', 'endereco', 'telefone', 'cnpj', 'ativa']


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = ['id', 'nome', 'categoria', 'preco', 'icone', 'imagem_url', 'disponivel']


class ItemVendaInputSerializer(serializers.Serializer):
    produto_id = serializers.UUIDField()
    quantidade = serializers.IntegerField(min_value=1)
    preco_unitario = serializers.DecimalField(max_digits=8, decimal_places=2)


class VendaCreateSerializer(serializers.Serializer):
    forma_pagamento = serializers.ChoiceField(choices=Venda.PAGAMENTO_CHOICES)
    valor_recebido = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    itens = ItemVendaInputSerializer(many=True)

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        loja = validated_data.pop('loja')
        operador = validated_data.pop('operador')

        # Gera código de venda legível
        hoje = datetime.now()
        prefixo = f"VND-{hoje.strftime('%Y%m%d')}"
        count = Venda.objects.filter(loja=loja, data_hora__date=hoje.date()).count() + 1
        codigo_venda = f"{prefixo}-{loja.slug[:4].upper()}-{str(count).zfill(3)}"

        # Calcula totais
        valor_total = Decimal('0.00')
        quantidade_total = 0

        for item_data in itens_data:
            qtd = item_data['quantidade']
            preco = item_data['preco_unitario']
            valor_total += preco * Decimal(qtd)
            quantidade_total += qtd

        valor_recebido = validated_data.get('valor_recebido')
        troco = Decimal('0.00')
        if validated_data['forma_pagamento'] == 'DINHEIRO' and valor_recebido:
            troco = max(Decimal('0.00'), valor_recebido - valor_total)

        venda = Venda.objects.create(
            codigo_venda=codigo_venda,
            loja=loja,
            operador=operador,
            forma_pagamento=validated_data['forma_pagamento'],
            quantidade_total=quantidade_total,
            valor_total=valor_total,
            valor_recebido=valor_recebido,
            troco=troco,
        )

        for item_data in itens_data:
            produto = Produto.objects.get(id=item_data['produto_id'])
            ItemVenda.objects.create(
                venda=venda,
                produto=produto,
                quantidade=item_data['quantidade'],
                preco_unitario=item_data['preco_unitario'],
                subtotal=item_data['preco_unitario'] * Decimal(item_data['quantidade']),
            )

        return venda


class ItemVendaDetailSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome')
    categoria = serializers.CharField(source='produto.categoria')

    class Meta:
        model = ItemVenda
        fields = ['id', 'produto_nome', 'categoria', 'quantidade', 'preco_unitario', 'subtotal']


class VendaDetailSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome')
    operador_nome = serializers.CharField(source='operador.get_full_name')
    itens = ItemVendaDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Venda
        fields = [
            'id', 'codigo_venda', 'loja_nome', 'operador_nome',
            'forma_pagamento', 'quantidade_total', 'valor_total',
            'valor_recebido', 'troco', 'data_hora', 'itens'
        ]


class FechamentoCaixaSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome')
    operador_nome = serializers.CharField(source='operador.get_full_name')
    dono_conferente_nome = serializers.CharField(source='dono_conferente.get_full_name')

    class Meta:
        model = FechamentoCaixa
        fields = '__all__'
`;

  const codeSupabaseSQL = `-- ==============================================================================
-- SCHEMA SUPABASE (POSTGRESQL) - SALGADINHO DO CARIOCA
-- Multi-Store POS, Row-Level Security (RLS) & Realtime Publication
-- ==============================================================================

-- 1. Habilitar UUID e extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Lojas (3 Unidades do Salgadinho do Carioca)
CREATE TABLE IF NOT EXISTS public.lojas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(120) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    bairro VARCHAR(80) NOT NULL,
    telefone VARCHAR(20),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    ativa BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserção das 3 lojas iniciais
INSERT INTO public.lojas (id, nome, slug, endereco, bairro, telefone, cnpj)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Unidade 01 - Copacabana', 'copacabana', 'Av. Nossa Senhora de Copacabana, 728', 'Copacabana', '(21) 3245-8811', '48.912.404/0001-20'),
    ('a0000000-0000-0000-0000-000000000002', 'Unidade 02 - Madureira', 'madureira', 'Rua Carvalho de Souza, 142', 'Madureira', '(21) 3350-9922', '48.912.404/0002-01'),
    ('a0000000-0000-0000-0000-000000000003', 'Unidade 03 - Centro / Carioca', 'centro', 'Rua da Quitanda, 35', 'Centro', '(21) 2220-4400', '48.912.404/0003-92')
ON CONFLICT (slug) DO NOTHING;

-- 3. Tabela de Perfis de Usuários (RBAC integrado ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('caixa', 'admin')),
    loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Produtos (Cardápio do Salgadinho do Carioca)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL UNIQUE,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('Fritos', 'Assados', 'Copo', 'Bebidas')),
    preco NUMERIC(10, 2) NOT NULL CHECK (preco > 0),
    icone VARCHAR(50) DEFAULT 'Flame',
    imagem_url TEXT,
    disponivel BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Vendas (PDV)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_venda VARCHAR(32) NOT NULL UNIQUE,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
    operador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    forma_pagamento VARCHAR(20) NOT NULL CHECK (forma_pagamento IN ('PIX', 'DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO')),
    quantidade_total INT NOT NULL DEFAULT 1,
    valor_total NUMERIC(10, 2) NOT NULL,
    valor_recebido NUMERIC(10, 2),
    troco NUMERIC(10, 2) DEFAULT 0.00,
    data_hora TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 7. Tabela Antifraude: Fechamento de Caixa
CREATE TABLE IF NOT EXISTS public.fechamentos_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_fechamento VARCHAR(32) NOT NULL UNIQUE,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
    operador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    dono_conferente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    data_fechamento DATE NOT NULL,
    saldo_inicial_abertura NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    total_vendas_dinheiro_sistema NUMERIC(10, 2) NOT NULL,
    total_vendas_pix_sistema NUMERIC(10, 2) NOT NULL,
    total_vendas_cartao_sistema NUMERIC(10, 2) NOT NULL,
    total_geral_vendas_sistema NUMERIC(10, 2) NOT NULL,
    valor_fisico_gaveta_declarado NUMERIC(10, 2) NOT NULL,
    diferenca NUMERIC(10, 2) NOT NULL,
    status VARCHAR(25) NOT NULL CHECK (status IN ('CONFERIDO_OK', 'DIVERGENCIA_SOBRA', 'DIVERGENCIA_QUEBRA')),
    justificativa TEXT,
    data_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_loja_data_fechamento UNIQUE (loja_id, data_fechamento)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_caixa ENABLE ROW LEVEL SECURITY;

-- Regra 1: Qualquer usuário logado lê produtos ativos
CREATE POLICY "Leitura de produtos ativos" ON public.produtos
FOR SELECT USING (disponivel = TRUE OR auth.jwt() ->> 'role' = 'admin');

-- Regra 2: Apenas ADMIN altera preço ou insere produtos
CREATE POLICY "Admin gerencia produtos" ON public.produtos
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios_perfil WHERE id = auth.uid() AND role = 'admin')
);

-- Regra 3: Operador de Caixa só enxerga/insere vendas da sua própria loja
CREATE POLICY "Caixa insere apenas na sua loja" ON public.vendas
FOR INSERT WITH CHECK (
    loja_id = (SELECT loja_id FROM public.usuarios_perfil WHERE id = auth.uid())
    OR (SELECT role FROM public.usuarios_perfil WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Caixa enxerga vendas da sua loja" ON public.vendas
FOR SELECT USING (
    loja_id = (SELECT loja_id FROM public.usuarios_perfil WHERE id = auth.uid())
    OR (SELECT role FROM public.usuarios_perfil WHERE id = auth.uid()) = 'admin'
);

-- Regra 4: Fechamento Antifraude exclusivo do Admin
CREATE POLICY "Admin gerencia fechamentos" ON public.fechamentos_caixa
FOR ALL USING (
    (SELECT role FROM public.usuarios_perfil WHERE id = auth.uid()) = 'admin'
);

-- ==============================================================================
-- SUPABASE REALTIME PUBLICATION
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
`;

  const codeUrls = `"""
urls.py - Rotas REST do Salgadinho do Carioca
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProdutoViewSet, RegistrarVendaPDVView, BaixaCaixaAntifraudeView

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    # Router do DRF (Produtos, Lojas)
    path('api/', include(router.urls)),

    # Endpoint otimizado de emissão rápida de vendas no PDV (Mouse-friendly)
    path('api/pdv/vender/', RegistrarVendaPDVView.as_view(), name='pdv-registrar-venda'),

    # Módulo Antifraude de Baixa de Caixa (Exclusivo do Dono)
    path('api/antifraude/fechamento/<uuid:loja_id>/', BaixaCaixaAntifraudeView.as_view(), name='antifraude-baixa-caixa'),
]
`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Arquitetura de Backend & Nuvem
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Projeto Técnico: Django 5 + Supabase (PostgreSQL)
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Modelos relacionais, decorators de permissão RBAC, views transacionais e scripts SQL prontos para deploy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 font-mono">
              Django 5.x + PostgreSQL 16
            </span>
          </div>
        </div>
      </div>

      {/* Code File Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-800">
        {[
          { key: 'models', label: 'models.py', icon: <FileCode className="w-4 h-4" /> },
          { key: 'views', label: 'views.py (RBAC & Antifraude)', icon: <Shield className="w-4 h-4" /> },
          { key: 'serializers', label: 'serializers.py', icon: <Code className="w-4 h-4" /> },
          { key: 'supabase_sql', label: 'supabase_schema.sql (RLS)', icon: <Database className="w-4 h-4" /> },
          { key: 'urls', label: 'urls.py', icon: <Terminal className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              playClickSound();
              setActiveFile(tab.key as any);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeFile === tab.key
                ? 'bg-amber-400 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-white bg-stone-900 border border-stone-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-3 bg-stone-900 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-xs font-mono font-bold text-stone-300">
              salgadinho_carioca/{activeFile === 'supabase_sql' ? 'supabase_schema.sql' : `${activeFile}.py`}
            </span>
          </div>

          <button
            onClick={() => {
              let code = '';
              if (activeFile === 'models') code = codeModels;
              if (activeFile === 'views') code = codeViews;
              if (activeFile === 'serializers') code = codeSerializers;
              if (activeFile === 'supabase_sql') code = codeSupabaseSQL;
              if (activeFile === 'urls') code = codeUrls;
              handleCopy(code, activeFile);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
          >
            {copiedKey === activeFile ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-6 text-xs font-mono text-stone-200 overflow-x-auto max-h-[620px] leading-relaxed selection:bg-amber-400 selection:text-stone-950">
          <code>
            {activeFile === 'models' && codeModels}
            {activeFile === 'views' && codeViews}
            {activeFile === 'serializers' && codeSerializers}
            {activeFile === 'supabase_sql' && codeSupabaseSQL}
            {activeFile === 'urls' && codeUrls}
          </code>
        </pre>
      </div>

      {/* Technical Summary Footnote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            1. Integridade Multi-Loja
          </span>
          <p className="text-xs text-stone-400 leading-relaxed">
            O operador de caixa do PDV está isolado pelo modelo de permissões e RLS do PostgreSQL: não consegue visualizar nem emitir registros de outras filiais.
          </p>
        </div>

        <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            2. Transações Atômicas
          </span>
          <p className="text-xs text-stone-400 leading-relaxed">
            A gravação de venda e itens utiliza <code>@transaction.atomic</code> no Django, garantindo que o faturamento de cada salgadinho e cálculo de troco sejam 100% íntegros.
          </p>
        </div>

        <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            3. Antifraude Cego
          </span>
          <p className="text-xs text-stone-400 leading-relaxed">
            O Dono audita a gaveta sem expor a soma aos operadores no momento da contagem física, detectando qualquer desvio ou quebra de centavos imediatamente.
          </p>
        </div>
      </div>
    </div>
  );
};
