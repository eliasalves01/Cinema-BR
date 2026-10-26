const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','manifest.json'),'utf8'));
const key=process.env.TMDB_API_KEY;
const token=process.env.TMDB_READ_TOKEN;
const cache=new Map();
const CATALOG_TTL=21600; // 6 horas no CDN da Vercel
const MOVIE_GENRES={"Ação": 28, "Aventura": 12, "Animação": 16, "Comédia": 35, "Crime": 80, "Documentário": 99, "Drama": 18, "Família": 10751, "Fantasia": 14, "Faroeste": 37, "Ficção científica": 878, "História": 36, "Mistério": 9648, "Música": 10402, "Romance": 10749, "Suspense": 53, "Terror": 27, "Guerra": 10752};
const SERIES_GENRES={"Ação e aventura": 10759, "Animação": 16, "Comédia": 35, "Crime": 80, "Documentário": 99, "Drama": 18, "Família": 10751, "Fantasia e ficção científica": 10765, "Infantil": 10762, "Mistério": 9648, "Notícias": 10763, "Reality": 10764, "Novela": 10766, "Talk show": 10767, "Guerra e política": 10768};
const imdbCache=new Map();
const studios={universal:33,warner:174,paramountpic:4,sony:34,disneystudio:2,a24:41077};
const aliases={netflix:['Netflix'],max:['Max','HBO Max'],paramount:['Paramount Plus','Paramount+'],apple:['Apple TV Plus','Apple TV+','Apple TV'],prime:['Amazon Prime Video','Prime Video'],disney:['Disney Plus','Disney+'],globoplay:['Globoplay']};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const isImdb=id=>/^tt\d+$/.test(id||'');
const isTmdb=id=>/^tmdb:\d+$/.test(id||'');
function send(res,code,data,seconds=300){res.statusCode=code;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('access-control-allow-origin','*');res.setHeader('cache-control',seconds>0?`public, max-age=0, s-maxage=${seconds}`:'no-store');res.end(JSON.stringify(data));}
async function tmdb(route,parameters={}){
 if(!key&&!token)throw Error('TMDB_NOT_CONFIGURED: defina TMDB_API_KEY na Vercel');
 const u=new URL('https://api.themoviedb.org/3'+route);u.searchParams.set('language','pt-BR');if(key)u.searchParams.set('api_key',key);
 for(const [k,v] of Object.entries(parameters))if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));
 const ck=u.toString();const hit=cache.get(ck);if(hit&&hit.until>Date.now())return hit.data;
 const r=await fetch(u,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(12000)});
 if(!r.ok){const e=new Error(`TMDB_HTTP_${r.status}`);e.status=r.status;throw e;}
 const data=await r.json();cache.set(ck,{until:Date.now()+300000,data});return data;
}
const photo=(p,size)=>p?`https://image.tmdb.org/t/p/${size}${p}`:undefined;
function convert(x,type,id){
 const result={id:id||`tmdb:${x.id}`,type,name:x.title||x.name||x.original_title||x.original_name||'Sem título',poster:photo(x.poster_path,'w500'),background:photo(x.backdrop_path,'w1280'),description:x.overview||'',releaseInfo:(x.release_date||x.first_air_date||'').slice(0,4)||''};
 if(Number.isFinite(x.vote_average)&&x.vote_average>0)result.imdbRating=x.vote_average.toFixed(1);
 return result;
}
async function imdbFor(tmdbId,type,known){
 if(isImdb(known))return known;
 const ck=`${type}:${tmdbId}`;
 if(imdbCache.has(ck))return imdbCache.get(ck);
 try{
  const x=await tmdb(`/${type==='movie'?'movie':'tv'}/${tmdbId}/external_ids`);
  const imdb=isImdb(x.imdb_id)?x.imdb_id:null;
  imdbCache.set(ck,imdb);return imdb;
 }catch{return null;}
}
async function makeCatalogMetas(titles,type){
 // No TMDB ID is ever disguised as an IMDb ID. Parallel requests are bounded.
 const result=[];
 for(let i=0;i<titles.length;i+=8){
  const batch=await Promise.all(titles.slice(i,i+8).map(async x=>{
   const imdb=await imdbFor(x.id,type,x.imdb_id);
   return convert(x,type,imdb||`tmdb:${x.id}`);
  }));result.push(...batch);
 }
 return result;
}
async function provider(kind,name){
 const response=await tmdb(`/watch/providers/${kind}`);const possibilities=aliases[name]||[];
 const list=(response.results||[]).filter(p=>p.display_priorities?.BR!==undefined);
 return list.find(p=>possibilities.some(a=>norm(a)===norm(p.provider_name)))?.provider_id;
}
function rule(type,id){
 const kind=type==='movie'?'movie':'tv';const defaultP={sort_by:'popularity.desc'};
 const today=new Date();const year=today.getUTCFullYear();
 const common={
  cinema_ano_atual:{route:'/movie/now_playing',params:{region:'BR'},cinemaYear:year},
  filmes_populares:{route:'/movie/popular'},filmes_em_alta:{route:'/discover/movie',params:{sort_by:'popularity.desc','vote_count.gte':10,'primary_release_date.lte':today.toISOString().slice(0,10)}},
  filmes_lancamentos:{route:'/discover/movie',params:{sort_by:'popularity.desc','primary_release_date.lte':today.toISOString().slice(0,10),'vote_count.gte':5}},
  filmes_aclamados:{route:'/discover/movie',params:{sort_by:'popularity.desc','vote_average.gte':7.5,'vote_count.gte':300,'primary_release_date.lte':today.toISOString().slice(0,10)}},
  filmes_brasileiros:{route:'/discover/movie',params:{with_origin_country:'BR',...defaultP}},
  filmes_bem_avaliados:{route:'/movie/top_rated'},
  filmes_acao:{route:'/discover/movie',params:{with_genres:'28',...defaultP}},
  filmes_comedia:{route:'/discover/movie',params:{with_genres:'35',...defaultP}},
  filmes_terror:{route:'/discover/movie',params:{with_genres:'27',...defaultP}},
  filmes_animacao:{route:'/discover/movie',params:{with_genres:'16',...defaultP}},
  series_populares:{route:'/tv/popular'},series_em_alta:{route:'/discover/tv',params:{sort_by:'popularity.desc','vote_count.gte':5}},
  series_lancamentos:{route:'/discover/tv',params:{sort_by:'popularity.desc','first_air_date.lte':today.toISOString().slice(0,10),'first_air_date.gte':new Date(Date.UTC(year-2,0,1)).toISOString().slice(0,10),'vote_count.gte':3}},
  series_brasileiras:{route:'/discover/tv',params:{with_origin_country:'BR',...defaultP}},
  series_bem_avaliadas:{route:'/tv/top_rated'},
  series_doramas:{route:'/discover/tv',params:{with_origin_country:'KR',...defaultP}},
  series_animes:{route:'/discover/tv',params:{with_origin_country:'JP',with_genres:'16',...defaultP}}
 };
 if(common[id])return common[id];
 const match=id.match(/^([a-z]+)_(movie|series)$/);if(!match||match[2]!==type)return null;
 if(aliases[match[1]])return {route:`/discover/${kind}`,params:{watch_region:'BR',with_watch_monetization_types:'flatrate',...defaultP, ...(type==='movie'?{'primary_release_date.gte':new Date(Date.UTC(year-2,0,1)).toISOString().slice(0,10),'primary_release_date.lte':today.toISOString().slice(0,10)}:{})},provider:match[1]};
 if(studios[match[1]])return {route:`/discover/${kind}`,params:{with_companies:studios[match[1]],...defaultP}};
 return null;
}
async function getMeta(type,id){
 const kind=type==='movie'?'movie':'tv';
 let tmdbId=null;
 if(isTmdb(id))tmdbId=id.slice(5);
 else if(isImdb(id)){
  const found=await tmdb(`/find/${id}`,{external_source:'imdb_id'});
  tmdbId=(type==='movie'?found.movie_results:found.tv_results)?.[0]?.id;
 }
 if(!tmdbId)return null;
 const item=await tmdb(`/${kind}/${tmdbId}`);
 // Retain the requested ID exactly, so catalog -> meta -> stream share one ID.
 const imdb=isImdb(id)?id:await imdbFor(tmdbId,type,item.external_ids?.imdb_id);
 const obj=convert(item,type,id);
 obj.genres=(item.genres||[]).map(g=>g.name);
 if(imdb)obj.imdb_id=imdb;
 if(type==='series'){
  const seasons=(item.seasons||[]).filter(s=>s.season_number>0).slice(0,12);
  const details=await Promise.all(seasons.map(s=>tmdb(`/tv/${tmdbId}/season/${s.season_number}`).catch(()=>({episodes:[]}))));
  obj.videos=details.flatMap((d,i)=>(d.episodes||[]).filter(e=>Number.isInteger(e.episode_number)&&e.episode_number>0).map(e=>({
   id:`${id}:${seasons[i].season_number}:${e.episode_number}`,
   title:e.name||`Episódio ${e.episode_number}`,season:seasons[i].season_number,episode:e.episode_number,
   released:e.air_date?`${e.air_date}T00:00:00.000Z`:undefined,thumbnail:photo(e.still_path,'w780')
  })));
 }
 return obj;
}
async function handler(req,res){
 if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('access-control-allow-origin','*');return res.end();}
 const url=new URL(req.url||'/','http://localhost');const route=url.pathname;
 try{
  if(route==='/')return send(res,200,{name:'Cinema BR',manifest:'/manifest.json',health:'/health'});
  if(route==='/manifest.json')return send(res,200,manifest,60);
  if(route==='/health')return send(res,200,{ok:true,version:manifest.version,tmdbConfigured:Boolean(key||token),catalogs:manifest.catalogs.length},30);
  const cat=route.match(/^\/catalog\/(movie|series)\/([^/]+?)(?:\/([^/]+))?\.json$/);
  if(cat){
   const [,type,id,arg]=cat;
   if(!manifest.catalogs.some(c=>c.type===type&&c.id===id))return send(res,404,{error:'CATALOG_NOT_FOUND'});
   const spec=rule(type,id);if(!spec)return send(res,404,{error:'CATALOG_RULE_NOT_FOUND'});
   const q=new URLSearchParams((arg||'').replace(/;/g,'&')); // extras compostos Stremio: genre=...&year=...&skip=...
   const requestedGenre=q.get('genre');const genres=type==='movie'?MOVIE_GENRES:SERIES_GENRES;
   if(requestedGenre!==null&&!Object.hasOwn(genres,requestedGenre))return send(res,200,{metas:[]},CATALOG_TTL);
   const genreId=requestedGenre===null?null:genres[requestedGenre];
   const requestedYear=q.get('year');
   if(requestedYear!==null){
    if(id!=='filmes_lancamentos'||!/^\d{4}$/.test(requestedYear)||Number(requestedYear)<1970||Number(requestedYear)>new Date().getUTCFullYear())return send(res,200,{metas:[]},CATALOG_TTL);
   }
   const rawSkip=Number(q.get('skip')||0);
   const skip=Number.isFinite(rawSkip)?Math.max(0,Math.floor(rawSkip)):0;
   if(skip>=10000)return send(res,200,{metas:[]},CATALOG_TTL);
   const page=Math.floor(skip/20)+1;const args={...spec.params,page};
   if(requestedYear!==null){args.primary_release_year=requestedYear;args['primary_release_date.lte']=Math.min(new Date().toISOString().slice(0,10),requestedYear+'-12-31');}
   if(spec.provider){const pid=await provider(type==='movie'?'movie':'tv',spec.provider);if(!pid)return send(res,200,{metas:[]});args.with_watch_providers=String(pid);}
   // Em filtros, usamos discover quando possivel para paginar por genero no TMDB.
   // Catálogos de tendência e cinema mantêm suas regras e são filtrados
   // localmente por genre_ids, para não misturar resultados fora do escopo.
   const discover=spec.route.startsWith('/discover/');
   if(genreId!==null&&discover)args.with_genres=String(genreId);
   const found=await tmdb(spec.route,args);let titles=(found.results||[]).filter(x=>x.poster_path);
   // O TMDB tem 20 itens por página; respeitar deslocamentos que não sejam múltiplos de 20.
   if(skip%20)titles=titles.slice(skip%20);
   if(genreId!==null&&!discover)titles=titles.filter(x=>(x.genre_ids||[]).includes(genreId));
   if(spec.cinemaYear)titles=titles.filter(x=>String(x.release_date||'').startsWith(String(spec.cinemaYear)));
   const uniq=new Set();titles=titles.filter(x=>{if(uniq.has(x.id))return false;uniq.add(x.id);return true;});
   return send(res,200,{metas:await makeCatalogMetas(titles,type)},CATALOG_TTL);
  }
  const meta=route.match(/^\/meta\/(movie|series)\/([^/]+)\.json$/);
  if(meta){const [,type,id]=meta;
   if(!isImdb(id)&&!isTmdb(id))return send(res,200,{meta:null},30);
   const obj=await getMeta(type,id);
   return send(res,200,{meta:obj},180);
  }
  return send(res,404,{error:'ROUTE_NOT_FOUND',path:route});
 }catch(e){
  if(e.status===404&&route.startsWith('/meta/'))return send(res,200,{meta:null},30);
  return send(res,500,{error:e.message||'INTERNAL_ERROR'},0);
 }
}
module.exports=handler;
