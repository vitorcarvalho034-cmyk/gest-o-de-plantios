# Plantio de Mudas — TODO

## Banco de Dados / Schema
- [x] Tabela `plantings` para Crisântemo (userId, estufas, mudas, caixas, data, desconto, motivo)
- [x] Tabela `sunflower_plantings` para Girassol (userId, bandejas, data)
- [x] Tabela `employees` para funcionários pré-cadastrados (nome, username, senha hash)
- [x] Migração SQL aplicada via webdev_execute_sql

## Backend (tRPC)
- [x] Procedure: criar lançamento de Crisântemo
- [x] Procedure: listar lançamentos de Crisântemo (por usuário / todos)
- [x] Procedure: criar lançamento de Girassol
- [x] Procedure: listar lançamentos de Girassol (por usuário / todos)
- [x] Procedure: listar todos os funcionários (admin)
- [x] Procedure: resumo consolidado admin (Crisântemo + Girassol por funcionário)
- [x] Autenticação por username/senha (sem OAuth externo) com JWT

## Frontend — Geral
- [x] Tema verde/natureza elegante no index.css
- [x] Logo da empresa no cabeçalho
- [x] Layout responsivo com AppLayout sidebar
- [x] Página de login com username/senha

## Frontend — Tela de Lançamento
- [x] Seleção de tipo: Crisântemo ou Girassol
- [x] Formulário Crisântemo: estufa(s), quantidade de mudas, data, desconto/motivo
- [x] Cálculo automático de caixas (mudas ÷ 2000)
- [x] Suporte a múltiplas estufas por lançamento de Crisântemo
- [x] Formulário Girassol: quantidade de bandejas, data

## Frontend — Painel do Funcionário
- [x] Histórico de Crisântemo (caixas, estufas, data, descontos)
- [x] Histórico de Girassol (bandejas, data)
- [x] Totais separados por tipo

## Frontend — Painel Administrativo
- [x] Visão consolidada de todos os funcionários
- [x] Separação clara Crisântemo vs Girassol
- [x] Totais por funcionário para suporte ao pagamento
- [x] Filtro por período

## Testes
- [x] Teste de autenticação (login/logout)
- [x] Teste de criação de lançamento Crisântemo
- [x] Teste de criação de lançamento Girassol

## Otimização Mobile
- [x] Bottom navigation bar para mobile (substitui sidebar em telas pequenas)
- [x] AppLayout mobile-first: header compacto + bottom nav
- [x] Formulários com campos grandes (min h-14), labels claros, teclado numérico onde aplicável
- [x] Tela de lançamento com scroll suave e botões de ação proeminentes
- [x] Histórico do funcionário em cards (não tabela) no mobile
- [x] Painel admin em cards/acordeão no mobile
- [x] Dashboard com cards de toque fácil e espaçamento generoso
- [x] Login com campos grandes e botão full-width proeminente

## Correções e Novas Funcionalidades
- [x] Corrigir cálculo de caixas: 1000 mudas por caixa (era 2000)
- [x] Adicionar campo de status de confirmação no banco (pending/confirmed/rejected) e motivo da negação
- [x] Procedure: funcionário confirma ou nega lançamento com justificativa
- [x] Frontend: tela do funcionário exibe lançamentos pendentes para confirmar/negar
- [x] Frontend: painel admin exibe status de confirmação de cada lançamento
- [x] Adicionar campo "mudas enviadas para a estufa" por estufa no lançamento de Crisântemo (para comparar com mudas plantadas)
- [x] Exibir diferença entre mudas enviadas e plantadas no histórico e painel admin

## Cruzamento de Dados (Enviado vs Plantado)
- [x] Backend: procedure que agrupa por estufa o total de mudas enviadas e o total plantado pelos funcionários, calculando diferença
- [x] Frontend: aba "Cruzamento" no painel admin mostrando por estufa: enviado, plantado, diferença e status (OK / divergência)
- [x] Frontend: destaque visual (verde = bateu, laranja = divergência) por estufa e por data

## Reestruturação: Fluxo de Sessão de Plantio
- [x] Tabela `planting_sessions` (data, estufas com mudas enviadas, status: aberta/fechada)
- [x] Vincular `chrysanthemum_plantings` a uma `planting_session`
- [x] Procedure: criar sessão de plantio (lançador abre com data + mudas por estufa)
- [x] Procedure: listar sessões (abertas e fechadas)
- [x] Procedure: fechar sessão
- [x] Procedure: criar lançamento de funcionário dentro de uma sessão
- [x] Tela do lançador: passo 1 — criar/selecionar sessão (data + mudas por estufa)
- [x] Tela do lançador: passo 2 — registrar plantio de cada funcionário na sessão
- [x] Painel admin: visão de sessões com cruzamento (enviado vs plantado por estufa)
- [x] Cruzamento automático: total enviado na sessão vs soma plantada pelos funcionários
- [x] Regra: sessão só pode ser fechada quando total plantado = total enviado (validação no backend e alerta no frontend)
- [x] Exibir progresso em tempo real: enviado X mudas → plantado Y mudas → faltam Z

## Gerenciamento de Usuários (Admin)
- [x] Backend: procedure para listar todos os usuários
- [x] Backend: procedure para criar novo usuário (nome, username, senha, role)
- [x] Backend: procedure para editar usuário (nome, username, senha)
- [x] Backend: procedure para ativar/desativar usuário
- [x] Frontend: página de configurações de usuários no painel admin
- [x] Frontend: formulário de criação de novo usuário
- [x] Frontend: edição de nome e username por usuário
- [x] Frontend: redefinição de senha pelo admin
- [x] Frontend: toggle de ativo/inativo por usuário

## Edição de Lançamentos Contestados (Lançador)
- [x] Backend: procedure para editar lançamento de Crisântemo (corrigir caixas/mudas)
- [x] Backend: procedure para editar lançamento de Girassol (corrigir bandejas)
- [x] Backend: procedure para listar lançamentos contestados (para o lançador)
- [x] Frontend: seção "Contestações" no app do lançador com lista de lançamentos rejeitados
- [x] Frontend: formulário de edição inline do lançamento contestado
- [x] Frontend: após editar, status volta para "pendente" aguardando nova confirmação do funcionário
