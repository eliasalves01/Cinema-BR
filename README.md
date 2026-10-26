# Cinema BR v2.6 — 9 catálogos para Stremio

Atualização a partir da v2.5. Preserve `TMDB_API_KEY` (ou `TMDB_READ_TOKEN`) nas variáveis de ambiente da Vercel.

## Catálogos (na ordem)

1. Filmes em Alta — catálogo amplo, por popularidade, gênero e paginação
2. Filmes Lançamentos — por popularidade, gênero e ano
3. Aclamados pela Crítica — avaliação TMDB >= 7,5 com 300 ou mais avaliações, ordenado por popularidade
4. Novos na Netflix — filmes disponíveis em assinatura no Brasil, lançados desde 1º de janeiro de dois anos antes do ano atual
5. Novos no Prime Video — mesmo critério
6. Novos no Disney+ — mesmo critério
7. Novos no Apple TV+ — mesmo critério
8. Séries em Alta — por popularidade
9. Novas Séries — estreias dos últimos dois anos, por popularidade

**Nota sobre “Novos na plataforma”:** o TMDB não oferece a data de entrada no catálogo de streaming na API Discover. O filtro é de *lançamento recente do filme*, com disponibilidade de assinatura no Brasil, não “adicionado recentemente à plataforma”. A oferta é dinâmica, conforme os provedores cadastrados no TMDB.

## Ordenação

Todas as consultas Discover usadas pelos nove catálogos têm `sort_by=popularity.desc`, inclusive com filtro de gênero ou ano. Metadados `meta/movie/...` e `meta/series/...` preservam o ID recebido do catálogo.

## Cache

`CATALOG_TTL=21600` (seis horas) em `api/index.js`. Cache da Vercel é revalidado na próxima requisição após expiração, não por tarefa em segundo plano.

## Publicação

Publique os arquivos na raiz do repositório conectado à Vercel (`api/index.js`, `manifest.json`, `vercel.json`, etc). Confira `/health` (versão 2.6.0 e 9 catálogos), depois `/manifest.json`. Reinstale somente o addon Cinema BR no Stremio se a lista antiga continuar.

## Testes locais

Rode `node test_v26.js`. Não consulta a API externa: valida o roteamento, popularidade, gêneros, ano, fornecedores e metadados com dados simulados.
