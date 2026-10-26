# Cinema BR 2.7.0 — Filmes em Alta ampliado

- Mantém os **9 catálogos** da versão 2.6.1.
- **Filmes em Alta:** filtros de **gênero + ano** combináveis, selecionados no manifesto, com resultados ordenados por **popularidade** diretamente no TMDB (`/discover/movie`).
- Removido o mínimo de 10 avaliações deste catálogo para ampliar a quantidade de títulos disponíveis.
- Uma página de **Filmes em Alta** reúne até **100 filmes** (cinco páginas de resultados TMDB). `skip=100` continua na próxima leva. O TMDB limita a paginação a 500 páginas por consulta.
- **Filmes Lançamentos** mantém seu filtro por gênero e ano. Metadados, IDs, outros catálogos e cache CDN de seis horas não foram alterados.

## Como publicar

Coloque o conteúdo desta pasta na **raiz do repositório GitHub** conectado à Vercel. Mantenha `api/index.js`; se houver um `index.js` antigo na raiz, remova-o para evitar conflito. Configure `TMDB_API_KEY` (ou `TMDB_READ_TOKEN`) nas variáveis de ambiente da Vercel. Depois do deploy, reinstale apenas o addon Cinema BR no Stremio se os filtros não forem atualizados.

## Verificar

- `https://cinema-br.vercel.app/health` deve mostrar `2.7.0` e 9 catálogos.
- `/catalog/movie/filmes_em_alta/genre=Terror&year=2024.json`
- `/catalog/movie/filmes_em_alta/genre=Terror&year=2024&skip=100.json`

**Observações:** o TMDB fornece rankings de popularidade, não um histórico fixo: resultados e posições variam com o tempo. O ano é um extra personalizado; a interface de algumas versões do Stremio pode não mostrar esse seletor mesmo que a rota aceite `year`. Consultar e enriquecer até 100 títulos por requisição pode ficar mais lento na primeira carga, dependendo dos limites do TMDB e da Vercel. Testado localmente com dados simulados; é necessário validar em produção.
