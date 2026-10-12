# OrçaPro IA — Cloudflare Pages

Aplicação responsiva para criar propostas de orçamento com Gemini, exportar PDF, copiar o texto, compartilhar pelo WhatsApp e instalar como PWA.

## Estrutura

- `index.html`, `styles.css`, `app.js`: interface e funcionalidades do navegador.
- `functions/api/generate.js`: endpoint server-side que chama a API Gemini sem expor a chave.
- `manifest.json`, `sw.js`, `icons/`: recursos do PWA.
- `_headers`: cabeçalhos de segurança básicos.

## Publicar no Cloudflare Pages

1. Envie a pasta inteira para um repositório Git.
2. No Cloudflare, vá a **Workers & Pages → Create → Pages → Connect to Git**.
3. Escolha o repositório. Como não há etapa de build, deixe o comando de build vazio e use ` / ` como diretório de saída (raiz do projeto). Se a interface exigir, use `.` como diretório de saída.
4. Em **Settings → Variables and Secrets** (ou variáveis de ambiente do projeto), adicione `GEMINI_API_KEY` como **secret** com sua chave Gemini.
5. Faça um novo deploy. Teste `/api/generate` usando o formulário publicado.

## Chave de API: importante

Não coloque a chave no `app.js`, HTML nem em variáveis `VITE_*`/públicas. Qualquer chave incluída no front-end fica visível a visitantes. O projeto usa a variável secreta `GEMINI_API_KEY` na Pages Function. Como uma chave foi compartilhada no pedido, considere revogá-la e gerar outra no Google AI Studio antes de publicar.

## Testar localmente

A chamada `/api/generate` e o PWA precisam de um servidor HTTPS/localhost e das Pages Functions. A forma mais próxima da produção é instalar o Wrangler (`npm install -D wrangler`) e executar:

```bash
npx wrangler pages dev .
```

Defina o secret para o ambiente local seguindo a documentação do Wrangler; não grave a chave no repositório. Abrir `index.html` diretamente pelo gerenciador de arquivos não executa a função da API.

## Notas

- O botão de instalação depende do suporte do navegador e dos critérios de instalação PWA. Em iPhone/iPad, geralmente é necessário usar **Compartilhar → Adicionar à Tela de Início**.
- O PDF usa html2pdf.js via CDN; requer conexão para carregar a biblioteca.
- A aplicação oferece uma proposta básica de contingência caso a API falhe, para que o texto não se perca.
