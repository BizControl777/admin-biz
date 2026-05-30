# BizControl - Portal Administrativo

Este é o portal de gestão de licenças para o ecossistema BizControl. Hospedado de forma estática, ele se conecta diretamente ao Supabase para gerenciar ativações, bloqueios e renovações.

## 🚀 Funcionalidades
- **Gestão de Licenças:** Criar, bloquear, desbloquear e renovar chaves.
- **Autenticação:** Acesso restrito via Supabase Auth.
- **Segurança:** Proteção de dados via Row Level Security (RLS).
- **Reset de Dispositivo:** Permite que uma licença seja reutilizada em um novo hardware.

## 🛠️ Configuração Necessária (Supabase)

### 1. SQL Editor
Execute o conteúdo do arquivo `SUPABASE_SCHEMA.sql` (disponível na raiz do projeto principal) no editor SQL do seu painel Supabase para criar as tabelas e políticas de segurança.

### 2. Autenticação
Vá em **Authentication > Users** e crie seu usuário administrador (Email/Senha).

### 3. API Keys
Certifique-se de que a `SUPABASE_URL` e a `SUPABASE_ANON_KEY` estão configuradas corretamente no arquivo `app.js`.

## 🌐 Deploy no Render
1. Crie um novo **Static Site** no Render.
2. Conecte este repositório.
3. Defina o **Publish Directory** como `.` (ou `admin-portal` se estiver em uma subpasta).
4. Clique em **Deploy**.

---
Desenvolvido por BizControl.
"# adminBizcontrol" 
"# admin-biz" 
