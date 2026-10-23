# Cinema BR — projeto limpo Vercel / Nuvio

Este ZIP é **um projeto completo**, não apenas um `manifest.json`. Contém 43 catálogos (cinema do ano corrente, filmes e séries gerais, estúdios e streamings), com capas/metadados consultados no TMDB. **Não entrega vídeos nem links de streaming.**

## Publicação correta — do zero

1. Crie um **novo repositório GitHub vazio** (por exemplo `cinema-br-nuvio-4`).
2. Extraia o ZIP, entre na pasta `cinema_br_nuvio_zero_vercel` e envie **os arquivos de dentro dela** à **raiz** do repositório. A raiz deve conter `api/`, `manifest.json`, `vercel.json`, `package.json` (não deixe uma pasta extra acima desses arquivos).
3. Na Vercel → **Add New → Project**, importe o repositório. Em Framework Preset escolha **Other**; **Root Directory** deixe `./`; em Output Directory NÃO configure `public`, `dist` ou outra pasta. Não configure build command.
4. Em Environment Variables, crie `TMDB_API_KEY` com sua chave API v3 do TMDB, em **Production**. Não coloque chave no GitHub nem no manifesto.
5. Clique Deploy. Depois abra **Deployments → Functions** para confirmar a função `/api/index`.
6. Teste nessa ordem (substitua DOMINIO pelo endereço real da Vercel):
   - `https://DOMINIO/health` → `{"ok":true,"tmdbConfigured":true,"catalogs":43,...}`
   - `https://DOMINIO/manifest.json` → JSON com 43 catálogos
   - `https://DOMINIO/catalog/movie/filmes_populares.json` → JSON com `metas` e `poster`
   - `https://DOMINIO/catalog/movie/cinema_ano_atual.json` → JSON com `metas` (pode ficar vazio se não houver resultados de ano atual na consulta do TMDB)
   - `https://DOMINIO/catalog/series/series_populares.json` → JSON com `metas`
7. Somente após os testes, instale no Nuvio `https://DOMINIO/manifest.json`. Se já tinha instalado um manifesto antigo, remova-o e instale o novo.

## Erros comuns

- `404` em `/health` **e** `/catalog/...`: o deployment não publicou as regras `vercel.json` ou a função `api/index.js`. Confira Root Directory, Files/Functions em Deployment e se os arquivos estão na raiz. A variável TMDB não explica 404.
- `500 TMDB_NOT_CONFIGURED`: falta TMDB_API_KEY ou novo deploy após criar a variável.
- Catálogo `metas:[]`: o endpoint funcionou, mas não encontrou resultados com os filtros aplicados.
- Este addon fornece **metadados/catálogos**, não fontes de reprodução.

## Teste no Windows (opcional)

Com Node.js 22: `npm test` para testar rotas usando respostas TMDB simuladas; `npm start` para iniciar servidor local em `http://localhost:7000` (consulte TMDB_API_KEY no ambiente para resultados reais).
