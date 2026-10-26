const http=require('node:http');
const assert=require('node:assert/strict');
process.env.TMDB_API_KEY='test-only-key';
const app=require('./api/index.js');
const manifest=require('./manifest.json');
const movie={id:1058424,title:'Hope: O Primeiro Impacto',overview:'Sinopse',poster_path:'/poster.jpg',backdrop_path:'/bg.jpg',release_date:'2026-10-01',vote_average:6.8,genre_ids:[878,28],genres:[{name:'Ficção científica'}]};
const noImdb={id:1101412,title:'A Queda 2: No Limite',poster_path:'/fall.jpg',release_date:'2026-10-26',genre_ids:[53],genres:[]};
const tv={id:303,name:'Série Exemplo',poster_path:'/series.jpg',first_air_date:'2025-02-20',genre_ids:[18],seasons:[{season_number:1}],genres:[]};
const realFetch=global.fetch;
global.fetch=async target=>{
 const p=new URL(target).pathname;let data;
 if(p==='/3/movie/1058424/external_ids')data={imdb_id:'tt7654321'};
 else if(p==='/3/movie/1101412/external_ids')data={imdb_id:null};
 else if(p==='/3/tv/303/external_ids')data={imdb_id:'tt3333333'};
 else if(p==='/3/find/tt7654321')data={movie_results:[movie],tv_results:[]};
 else if(p==='/3/find/tt3333333')data={movie_results:[],tv_results:[tv]};
 else if(p==='/3/movie/1058424')data=movie;
 else if(p==='/3/movie/1101412')data=noImdb;
 else if(p==='/3/tv/303')data=tv;
 else if(p==='/3/tv/303/season/1')data={episodes:[{episode_number:1,name:'Piloto',air_date:'2025-02-20'}]};
 else if(p==='/3/trending/tv/week'||p==='/3/discover/tv'||p==='/3/tv/popular')data={results:[tv]};
 else data={results:[movie,noImdb]};
 return {ok:true,status:200,json:async()=>data};
};
(async()=>{
 const server=http.createServer(app).listen(0);
 await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const get=async route=>{const r=await realFetch(base+route);assert.equal(r.status,200,route);return r.json();};
 try{
  const m=await get('/manifest.json');assert.equal(m.version,'2.4.0');assert.equal(m.catalogs.length,8);
  assert.deepEqual(m.resources[1].idPrefixes,['tt','tmdb:']);
  const health=await get('/health');assert.equal(health.tmdbConfigured,true);
  const catResponse=await realFetch(base+'/catalog/movie/cinema_ano_atual.json');
  assert.match(catResponse.headers.get('cache-control'),/s-maxage=21600/);
  const cat=await catResponse.json();
  assert.ok(m.catalogs.every(c=>c.extra.some(e=>e.name==='genre'&&e.options.length>5)));
  const sci=await get('/catalog/movie/cinema_ano_atual/genre=Fic%C3%A7%C3%A3o%20cient%C3%ADfica.json');
  assert.equal(sci.metas.length,1);assert.equal(sci.metas[0].id,'tt7654321');
  const sus=await get('/catalog/movie/cinema_ano_atual/genre=Suspense.json');
  assert.equal(sus.metas.length,1);assert.equal(sus.metas[0].id,'tmdb:1101412');
  const invalid=await get('/catalog/movie/cinema_ano_atual/genre=INVALID.json');assert.deepEqual(invalid.metas,[]);
  const drama=await get('/catalog/series/series_em_alta/genre=Drama.json');assert.equal(drama.metas.length,1);
  assert.equal(cat.metas[0].id,'tt7654321');assert.equal(cat.metas[0].type,'movie');
  assert.equal(cat.metas[1].id,'tmdb:1101412');
  for(const item of cat.metas){
   const detail=await get(`/meta/${item.type}/${item.id}.json`);
   assert.equal(detail.meta.id,item.id,'ID catálogo deve ser igual ao ID meta');
   assert.equal(detail.meta.type,'movie');
   assert.equal(detail.meta.videos,undefined,'filmes NÃO devem ter episódios/temporadas');
  }
  const older=await get('/meta/movie/tmdb:1058424.json');assert.equal(older.meta.id,'tmdb:1058424','IDs antigos mantêm compatibilidade');
  const series=await get('/catalog/series/series_em_alta.json');assert.equal(series.metas[0].id,'tt3333333');
  const detail=await get(`/meta/series/${series.metas[0].id}.json`);
  assert.equal(detail.meta.videos[0].id,'tt3333333:1:1');
  assert.equal(detail.meta.videos[0].season,1);
  const wrong=await get('/meta/movie/anything.json');assert.equal(wrong.meta,null);
  console.log('PASS manifest + 8 catálogos + fallback TMDB + IDs consistentes + filme sem temporadas + série com episódios');
 }finally{server.close();global.fetch=realFetch;}
})().catch(err=>{console.error(err);process.exitCode=1;});
