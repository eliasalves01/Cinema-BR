const assert=require('node:assert/strict');
const http=require('node:http');
process.env.TMDB_API_KEY='test-key';
const manifest=require('./manifest.json');
const handler=require('./api/index');
const originalFetch=global.fetch;
const calls=[];
global.fetch=async raw=>{
 const u=new URL(raw);calls.push(u);
 let data;
 if(u.pathname.endsWith('/external_ids'))data={imdb_id:'tt'+u.pathname.match(/\/(\d+)\/external_ids$/)[1].padStart(7,'0')};
 else if(u.pathname.startsWith('/3/discover/movie')){
  const page=Number(u.searchParams.get('page')||1);
  data={results:Array.from({length:20},(_,i)=>({id:page*1000+i+1,title:'Filme '+page+'/'+i,poster_path:'/x.jpg',release_date:'2020-01-01',genre_ids:[27]}))};
 } else if(u.pathname.startsWith('/3/discover/tv'))data={results:[]};
 else if(u.pathname.includes('/find/'))data={movie_results:[{id:1001}]};
 else if(u.pathname==='/3/movie/1001')data={id:1001,title:'Teste',genres:[],release_date:'2020-01-01'};
 else data={results:[]};
 return {ok:true,json:async()=>data};
};
(async()=>{
 assert.equal(manifest.version,'2.7.0');assert.equal(manifest.catalogs.length,9);
 const cat=manifest.catalogs.find(x=>x.id==='filmes_em_alta');assert(cat.extra.some(x=>x.name==='year'));assert(cat.extra.some(x=>x.name==='genre'));
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,r));
 const origin='http://127.0.0.1:'+server.address().port;
 async function get(p){const r=await originalFetch(origin+p);assert.equal(r.status,200,p);return {json:await r.json(),headers:r.headers};}
 try{
  let res=await get('/catalog/movie/filmes_em_alta/genre=Terror&year=2020.json');
  assert.equal(res.json.metas.length,100);
  assert.equal(res.headers.get('cache-control'),'public, max-age=0, s-maxage=21600');
  assert(res.json.metas.every(x=>x.type==='movie'&&x.id.startsWith('tt')));
  let all=calls.filter(u=>u.pathname==='/3/discover/movie');assert.equal(all.length,5);
  assert.deepEqual(all.map(x=>x.searchParams.get('page')),['1','2','3','4','5']);
  assert(all.every(u=>u.searchParams.get('with_genres')==='27'&&u.searchParams.get('primary_release_year')==='2020'&&u.searchParams.get('sort_by')==='popularity.desc'&&!u.searchParams.has('vote_count.gte')));
  res=await get('/catalog/movie/filmes_em_alta/genre=Terror&year=2020&skip=100.json');assert.equal(res.json.metas.length,100);
  all=calls.filter(u=>u.pathname==='/3/discover/movie');assert.deepEqual(all.slice(-5).map(u=>u.searchParams.get('page')),['6','7','8','9','10']);
  const metadata=await get('/meta/movie/tt0001001.json');assert.equal(metadata.json.meta.id,'tt0001001');assert.equal(metadata.json.meta.type,'movie');
  const health=await get('/health');assert.equal(health.json.version,'2.7.0');assert.equal(health.json.catalogs,9);
  console.log('PASS: 9 catálogos, 100 por página, gênero/ano no TMDB, paginação 100, popularidade, metadados, cache de 6h');
 }finally{server.close();global.fetch=originalFetch;}
})().catch(e=>{console.error(e);process.exitCode=1});
