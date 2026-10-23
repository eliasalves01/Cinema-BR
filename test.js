const http=require('node:http'), assert=require('node:assert/strict');
process.env.TMDB_API_KEY='test-only-key';
const app=require('./api/index.js');
const manifest=require('./manifest.json');
const fakeMovie={id:101,title:'Filme Exemplo',overview:'Sinopse em português',poster_path:'/poster.jpg',backdrop_path:'/bg.jpg',release_date:`${new Date().getUTCFullYear()}-05-15`,vote_average:8.2};
const fakeTV={id:303,name:'Série Exemplo',overview:'Sinopse da série',poster_path:'/series.jpg',first_air_date:'2025-02-20'};
const oldFetch=global.fetch;
global.fetch=async (u)=>{
  const pathname=new URL(u).pathname;
  let out;
  if(pathname.includes('/watch/providers/')) out={results:[{provider_id:8,provider_name:'Netflix',display_priorities:{BR:1}}]};
  else if(pathname.startsWith('/3/find/'))out={movie_results:[fakeMovie],tv_results:[]};
  else if(pathname==='/3/movie/101')out=fakeMovie;
  else if(pathname==='/3/tv/303')out={...fakeTV,seasons:[]};
  else out={results:pathname.includes('/tv/')||pathname.includes('/discover/tv')?[fakeTV]:[fakeMovie]};
  return {ok:true,json:async()=>out};
};
(async()=>{
 const server=http.createServer(app).listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const root=`http://127.0.0.1:${server.address().port}`;
 const test=async(url,key)=>{let response=await oldFetch(root+url);assert.equal(response.status,200,`${url} returned ${response.status}`);let data=await response.json();assert.ok(Object.hasOwn(data,key),url);return data;};
 try{
  const man=await test('/manifest.json','catalogs');assert.equal(man.catalogs.length,43);
  assert.equal((await test('/health','ok')).catalogs,43);
  for(const [type,id] of [['movie','cinema_ano_atual'],['movie','filmes_populares'],['series','series_populares'],['movie','netflix_movie'],['series','netflix_series'],['movie','universal_movie']]){
    const catalog=await test(`/catalog/${type}/${id}.json`,'metas'); assert.ok(catalog.metas.length>0,`${id} empty`);assert.ok(catalog.metas[0].poster);console.log('PASS',id);
  }
  const meta=await test('/meta/movie/tmdb:101.json','meta'); assert.equal(meta.meta.id,'tmdb:101');
  const ids=new Set(man.catalogs.map(c=>c.type+'|'+c.id));assert.equal(ids.size,43);
  console.log('PASS 43 catálogos + manifest + /health + capas + metadados');
 } finally{server.close();global.fetch=oldFetch;}
})().catch(e=>{console.error(e);process.exitCode=1;});
