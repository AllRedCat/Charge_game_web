# Especificação Técnica do Projeto: Jogo do Estande (Tanque Interativo)
## 1. Descrição do Projeto
A aplicação consiste em um jogo interativo no estilo *clicker* para eventos e estandes institucionais. O objetivo é permitir que um visitante utilize seu próprio smartphone (acessando via QR Code, sem necessidade de baixar aplicativos) para encher um tanque virtual exibido em um telão em tempo real.
### Dinâmica e Regras de Negócio
- **Acesso e Cadastro:** O participante escaneia o QR Code e preenche um cadastro simples (Nome e E-mail). As informações ficam salvas no `localStorage` do celular para evitar novos cadastros em acessos futuros.
- **Controle de Acesso (Trava Única):** O sistema permite apenas um jogador por vez. Se outro participante tentar acessar enquanto a partida estiver ativa, ele receberá um aviso de espera no celular.
- **Sincronização em Tempo Real:** O jogo no telão é iniciado apenas quando o participante clica no botão "Começar" em seu celular. Durante a partida (15 segundos), cada toque na tela incrementa a pontuação e atualiza a animação no telão instantaneamente.
- **Persistência de Dados e Relatórios:** Ao término da partida, o resultado é enviado ao banco de dados local. O sistema possui uma rota administrativa para exportação dos dados dos participantes em formato `.csv`.
- **Funcionamento 100% Local:** A aplicação roda integralmente na rede Wi-Fi local do estande, sem depender de internet externa ou VPS.
---
## 2. Bibliotecas e Tecnologias Utilizadas
### Core & Runtime
- **Node.js (v22+ LTS):** Ambiente de execução JavaScript para o servidor.
- **pnpm:** Gerenciador de pacotes rápido e eficiente.
### Back-end
- **Express:** Framework web para servir arquivos estáticos e gerenciar a rota de download do CSV.
- **Socket.io:** Biblioteca para comunicação via WebSockets em tempo real de baixíssima latência entre celulares e o telão.
- **node:sqlite (Nativo do Node.js):** Módulo nativo de SQLite, dispensando compilação C++ local e garantindo gravação segura e imediata em disco sem risco de perda por falha elétrica.
### Front-end
- **HTML5, CSS3 & JavaScript (Vanilla ES6+):** Utilizado em ambas as interfaces (Celular e Telão), garantindo leveza e compatibilidade universal.

---
## 3. Estrutura de Pastas do Projeto
```plaintext
Bateria/
├── package.json              # Configuração de dependências ("type": "module")
├── server.js                 # Servidor HTTP, lógica do Socket.io e SQLite nativo
├── data.db          # Banco de dados gerado automaticamente na primeira execução
└── public/
    ├── screen/
    │   ├── index.html        # Dashboard gráfico exibido no telão do estande
    │   └── app.js            # Lógica de atualização em tempo real do telão
    └── mobile/
        ├── index.html        # Interface mobile para cadastro e botão de toque
        └── app.js            # Lógica mobile (localStorage, toques e comunicação Socket.io)
```
---
## 4. Pré-requisitos e Instruções de Desenvolvimento
### Pré-requisitos de Hardware e Rede
- **1 Notebook/PC:** Para rodar o servidor local e transmitir a tela para o telão.
- **1 Roteador Wi-Fi Dedicado:** Para conectar o computador e os celulares dos participantes na mesma rede sem fio local.
- **Software:** Node.js (v22+) e pnpm instalados.
### Código Completo dos Arquivos Base
#### 1. `package.json`
```json
{
  "name": "jogo-estande-bateria",
  "version": "1.0.0",
    "socket.io": "^4.7.5"
  }
}

```
#### 2. `server.js`
```javascript
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
}
server.listen(3000, '0.0.0.0', () => console.log('Servidor rodando em http://localhost:3000'));
```
### Passo a Passo para Execução
1. **Instalação das dependências:**
   ```bash
   pnpm install
   ```
2. **Iniciar o servidor:**
   ```bash
   pnpm start
   ```
### Operação no Estande
1. **Descobrir IP Local:** Execute `ipconfig` (Windows) ou `ifconfig` (macOS/Linux) para obter o IPv4 da rede Wi-Fi (ex: `192.168.1.100`).
2. **Abrir o Telão:** Navegue até `http://localhost:3000/telao` e entre em modo de tela cheia.
3. **Gerar QR Code:** Aponte o QR Code para o endereço `http://<IP_LOCAL>:3000/celular` (ex: `http://192.168.1.100:3000/celular`).
4. **Exportar Leads:** Acesse `http://localhost:3000/admin/exportar-csv` para baixar o relatório final.