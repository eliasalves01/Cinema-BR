const assert=require('node:assert/strict');
const http=require('node:http');
process.env.TMDB_API_KEY='unit-test-key';
const manifest=require('./manifest.json');
const handler=require('./api/index.js');
const realFetch=global.fetch;
const requests=[];
const providers=[['Netflix',8],['Amazon Prime Video',9],['Disney Plus',337],['Apple TV Plus',350]].map(([provider_name,provider_id])=>({provider_name,provider_id,display_priorities:{BR:1}}));
global.fetch=async url=>{const u=new URL(url);requests.push(u);let data;
 if(u.pathname.includes('/watch/providers/')) data={results:providers};
 else if(u.pathname.endsWith('/external_ids'))data={imdb_id:'tt1234567'};
 else if(u.pathname.includes('/find/'))data={movie_results:[{id:1}]};
 else if(u.pathname==='/3/movie/1')data={id:1,title:'Filme',release_date:'2026-01-01',genres:[]};
 else data={results:Array.from({length:20},(_,i)=>({id:i+1,title:'Filme '+i,poster_path:'/x.jpg',release_date:'2026-01-01',genre_ids:[28]}))};
 return {ok:true,json:async()=>data};
};
(async()=>{
 assert.equal(manifest.catalogs.length,9);
 assert.equal(manifest.version,'2.6.0');
 assert(!manifest.catalogs.some(c=>['filmes_brasileiros','series_brasileiras','cinema_ano_atual','filmes_populares'].includes(c.id)));
 assert.equal(manifest.catalogs.find(c=>c.id==='filmes_lancamentos').name,'🆕 Filmes Lançamentos');
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  async function get(route){const r=await realFetch(origin+route);assert.equal(r.status,200,route);return {json:await r.json(),headers:r.headers}}
  const {json:health}=await get('/health');assert.equal(health.catalogs,9);
  const names=['filmes_em_alta','filmes_lancamentos','filmes_aclamados','netflix_movie','prime_movie','disney_movie','apple_movie'];
  for(const id of names){
   const {json,headers}=await get(`/catalog/movie/${id}/genre=A%C3%A7%C3%A3o.json`);
   assert.equal(json.metas.length,20,id);
   assert.equal(headers.get('cache-control'),'public, max-age=0, s-maxage=21600');
   const call=requests.filter(u=>u.pathname==='/3/discover/movie').at(-1);
   assert.equal(call.searchParams.get('sort_by'),'popularity.desc',id);
   assert.equal(call.searchParams.get('with_genres'),'28',id);
   if(id==='filmes_aclamados'){assert.equal(call.searchParams.get('vote_average.gte'),'7.5');assert.equal(call.searchParams.get('vote_count.gte'),'300')}
   if(id.endsWith('_movie')) {assert.equal(call.searchParams.get('watch_region'),'BR');assert(call.searchParams.get('with_watch_providers'));assert.equal(call.searchParams.get('with_watch_monetization_types'),'flatrate')}
  }
  await get('/catalog/movie/filmes_lancamentos/genre=A%C3%A7%C3%A3o&year=2024.json');
  const yearCall=requests.filter(u=>u.pathname==='/3/discover/movie').at(-1);assert.equal(yearCall.searchParams.get('primary_release_year'),'2024');assert.equal(yearCall.searchParams.get('sort_by'),'popularity.desc');
  for(const id of ['series_em_alta','series_lancamentos']){
   await get(`/catalog/series/${id}.json`);
   const u=requests.filter(u=>u.pathname==='/3/discover/tv').at(-1);assert.equal(u.searchParams.get('sort_by'),'popularity.desc',id);
  }
  const {json:meta}=await get('/meta/movie/tt1234567.json');assert.equal(meta.meta.id,'tt1234567');assert.equal(meta.meta.type,'movie');assert.equal(meta.meta.videos,undefined);
  console.log('PASS: 9 catálogos, popularidade, gêneros, ano, serviços BR, IMDb/meta e cache 6h');
 }finally{server.close();global.fetch=realFetch}
})().catch(e=>{console.error(e);process.exitCode=1});
