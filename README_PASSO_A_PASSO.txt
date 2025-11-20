
# Sistema de Gestão Financeira - Passo a Passo Simples (Windows)

## 1) Pré-requisito: instalar o Python

1. Acesse: https://www.python.org/downloads/
2. Clique em "Download Python 3.x"
3. Execute o instalador.
4. MUITO IMPORTANTE: marque a opção **"Add Python to PATH"** antes de clicar em "Install Now".
5. Aguarde terminar.

## 2) Iniciar o BACKEND (API)

1. Entre na pasta `backend`.
2. Dê dois cliques no arquivo: **INICIAR_BACKEND.bat**
3. Vai abrir uma tela preta (Prompt de Comando) e aparecer:
   - criação de ambiente virtual
   - instalação de dependências
   - mensagem `Uvicorn running on http://127.0.0.1:8000`
4. Deixe essa tela aberta. Não feche.

Você pode testar a API abrindo o navegador em:
- http://localhost:8000/api/health

## 3) Iniciar o FRONTEND (tela do sistema)

1. Entre na pasta `frontend`.
2. Dê dois cliques no arquivo: **INICIAR_FRONTEND.bat**
3. Vai abrir outra tela preta informando que está servindo na porta 5500.

Agora, abra o navegador (Chrome, Edge, etc.) e acesse:
- http://localhost:5500

Pronto! Você já estará usando o sistema.
