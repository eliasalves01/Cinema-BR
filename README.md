# Cinema BR — Correção de detalhes no Stremio/Nuvio

**Esta versão contém 8 catálogos (Home Leve)**, iguais aos enviados no ZIP. Não restaura automaticamente os 43 catálogos de versões anteriores.

## Correção
- Consulta IDs IMDb pelo endpoint TMDB `external_ids` para cada filme ou série.
- Entrega o campo `id` como `tt...` quando disponível; fallback `tmdb:...` para itens sem IMDb.
- As URLs `/meta/movie/tt...json` e `/meta/series/tt...json` retornam IDs consistentes.
- Vídeos de séries usam `tt...:temporada:episodio`, para os addons compatíveis identificarem episódios.
- Não fornece streams; use fontes independentes de conteúdo autorizado.

## Atualização
1. Substitua os arquivos existentes do repositório GitHub pelos arquivos deste ZIP. **Mantenha `api/index.js` e `index.js` idênticos**.
2. Não envie sua chave TMDB ao GitHub; mantenha `TMDB_API_KEY` nas variáveis da Vercel.
3. Faça deploy e teste `/health`, `/catalog/movie/filmes_populares.json` e `/meta/movie/tt0133093.json`.
4. No catálogo, o campo `id` deve começar com `tt` para títulos com IMDb.
5. Remova e reinstale o addon na conta Stremio/Nuvio se a lista antiga continuar em cache.

## Observações
- As consultas extras à API TMDB podem tornar a primeira abertura dos catálogos mais lenta; há cache em memória e paralelismo limitado.
- Alguns títulos não têm ID IMDb no TMDB e continuam como `tmdb:`.
- A disponibilidade de links de reprodução depende de addons separados.
- Para testar localmente: `npm test`. Os testes usam dados TMDB simulados; não validam credenciais ou conectividade real.
