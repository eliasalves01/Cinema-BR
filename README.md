# Cinema BR — Correção Stremio v2.3.0

Este pacote mantém os **8 catálogos do projeto Home Leve** presente no ZIP recebido. Ele não contém os 43 catálogos de versões anteriores.

## Mudanças
- Para cada filme e série, tenta obter o ID IMDb cadastrado no TMDB; quando existir, o catálogo retorna `tt...` e os detalhes são consultados por `/meta/movie/tt...json` ou `/meta/series/tt...json`.
- Quando o IMDb não existir, o catálogo mantém `tmdb:...`, que também é aceito pela rota `meta`. Outros addons de reprodução podem não reconhecer esse fallback.
- A rota `meta` devolve **exatamente o mesmo ID solicitado**, evitando divergência entre catálogo e detalhes.
- Filmes não recebem campo `videos` (sem temporadas); séries recebem episódios no formato `ID:temporada:episodio`.
- Manifesto especifica o recurso `meta` e seus prefixos `tt` e `tmdb:`, com versão 2.3.0.
- Rota `/health` informa a versão publicada e se a variável TMDB está configurada.

## Publicação na Vercel
1. Faça backup do repositório e substitua seus arquivos pelos deste ZIP, **mantendo a pasta `api`**.
2. Confirme que `TMDB_API_KEY` ou `TMDB_READ_TOKEN` está configurada no projeto Vercel (nunca exponha essas credenciais no GitHub).
3. Publique e abra `https://SEU-DOMINIO/health` — precisa mostrar `"version":"2.3.0"`.
4. Abra `https://SEU-DOMINIO/catalog/movie/cinema_ano_atual.json` e anote um `id` de filme.
5. Abra `https://SEU-DOMINIO/meta/movie/ID.json` substituindo `ID` pelo ID obtido. `meta.id` deve ser idêntico ao do catálogo.
6. No Stremio, remova **apenas o Cinema BR** e instale novamente usando `https://SEU-DOMINIO/manifest.json`, para renovar o manifesto; não remova Cinemeta nem os demais addons.

## Limites importantes
- `npm test` cobre respostas com dados simulados do TMDB. A execução **não** comprova funcionamento real da API TMDB, Vercel ou do aplicativo Stremio.
- Se o catálogo publicado continuar retornando predominantemente `tmdb:` após essa atualização, isso pode indicar ausência de IDs IMDb no TMDB ou que a versão antiga ainda está publicada. Verifique `/health`.
- Este addon entrega catálogos e metadados, **não** oferece vídeos ou streams. A reprodução depende da disponibilidade e compatibilidade dos outros addons.
- Consultas de IDs IMDb podem aumentar o tempo de carregamento dos catálogos; o cache é local à instância do servidor.
