# CrowdMint D-App Frontend

Aplicação frontend Next.js para a plataforma de crowdfunding descentralizada CrowdMint.

## Pré-requisitos

Antes de começar, você precisa ter instalado:

- **Node.js** (versão 18 ou superior) - [Download aqui](https://nodejs.org/)

### Verificando a instalação

Abra o PowerShell ou Terminal e execute:
```bash
node --version
npm --version
```

Se os comandos não funcionarem, o Node.js pode não estar no PATH do sistema. 

#### Solução temporária (apenas para a sessão atual):
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

#### Solução permanente (recomendado):
1. Abra "Variáveis de Ambiente" no Windows (busque por "variáveis de ambiente" na busca)
2. Em "Variáveis do sistema", encontre a variável `Path`
3. Clique em "Editar" e adicione: `C:\Program Files\nodejs`
4. Reinicie o terminal/PowerShell

### Gerenciador de pacotes

Você pode usar `npm` (que vem com o Node.js) ou instalar `pnpm`:
```bash
npm install -g pnpm
```

## Instalação

1. Clone o repositório (se ainda não tiver feito):
   ```bash
   git clone <url-do-repositorio>
   cd crowdmint-d-app-frontend
   ```

2. Instale as dependências:
   ```bash
   pnpm install
   ```
   
   Ou se estiver usando npm:
   ```bash
   npm install
   ```

## Configuração (Opcional)

A aplicação funciona com valores padrão, mas você pode configurar variáveis de ambiente criando um arquivo `.env.local` na raiz do projeto:

```env
# Configurações da rede blockchain (valores padrão já configurados)
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_EXPLORER_URL=https://explorer.testnet.arc.network

# Endereços dos contratos (opcional)
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_CROWDMINT_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# WalletConnect Project ID (opcional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=seu-project-id
```

## Executando a aplicação

### Modo de desenvolvimento

**Opção 1: Usando o script PowerShell (recomendado no Windows)**
```powershell
.\start-dev.ps1
```

**Opção 2: Manualmente**
```bash
npm run dev
```

Ou com pnpm:
```bash
pnpm dev
```

A aplicação estará disponível em: **http://localhost:3000**

### Modo de produção

Para fazer o build e executar em modo de produção:

```bash
# Build
pnpm build

# Iniciar servidor de produção
pnpm start
```

## Scripts disponíveis

- `pnpm dev` - Inicia o servidor de desenvolvimento
- `pnpm build` - Cria o build de produção
- `pnpm start` - Inicia o servidor de produção
- `pnpm lint` - Executa o linter ESLint

## Estrutura do projeto

- `/app` - Páginas e rotas da aplicação Next.js
- `/components` - Componentes React reutilizáveis
- `/lib` - Funções utilitárias e lógica de negócio
- `/config` - Configurações (Web3, contratos, etc.)
- `/public` - Arquivos estáticos (imagens, ícones)

## Notas

- A aplicação atualmente usa dados mockados para campanhas (veja `lib/campaigns.ts`)
- A integração com contratos inteligentes está preparada mas ainda não implementada
- A aplicação está configurada para usar a Arc Network Testnet por padrão

## Suporte

Para problemas ou dúvidas, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.

