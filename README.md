# Cinema BR 2.4 — atualização automática e filtros de gênero

## Publicação
Substitua os arquivos do repositório GitHub pelos arquivos deste ZIP, **incluindo `api/index.js` e `manifest.json`**. Não altere a variável `TMDB_API_KEY` já configurada na Vercel. Faça redeploy e reinstale **somente Cinema BR** no Stremio após confirmar `/manifest.json` versão `2.4.0`.

## Como funciona
- Os **8 catálogos Home Leve** permanecem, agora com `genre` e `skip` declarados no manifesto.
- O filtro em **Descobrir / Discover** do Stremio consulta `/catalog/movie/cinema_ano_atual/genre=A%C3%A7%C3%A3o.json` ou `/catalog/series/series_em_alta/genre=Drama.json`.
- Filmes e séries continuam atualizados dinamicamente pelo TMDB, sem atualizar o GitHub.
- Os **resultados de catálogo** usam `Cache-Control: public, max-age=0, s-maxage=21600` (6 horas no CDN Vercel). A primeira visita após vencimento do cache consulta a fonte novamente. A própria interface Stremio pode guardar cache adicional e não garante troca visual exatamente no relógio.
- Filtros de gêneros em catálogos `discover` são realizados pelo próprio TMDB antes da paginação. Em catálogos `trending`, `popular` e `now_playing`, filtramos os resultados da página retornada. Isso pode produzir páginas com menos de 20 títulos ou vazias para gêneros raros; evita descaracterizar o catálogo original.
- IDs do catálogo e metadados foram mantidos como na versão 2.3. O código não gera temporadas para filmes.

## Verificação
- `/health` → campo `version`: `2.4.0` e 8 catálogos
- `/manifest.json` → cada catálogo declara `genre`
- `/catalog/movie/cinema_ano_atual/genre=A%C3%A7%C3%A3o.json` → retorna `metas`
- `/catalog/series/series_em_alta/genre=Drama.json` → retorna `metas`
- No Stremio, vá em **Descobrir**, selecione **Cinema BR**, tipo **Filmes** ou **Séries**, e o gênero.

## Testes
`npm test` com Node.js 22. Testes com respostas TMDB simuladas, sem acessar conta privada ou a implantação ao vivo.
