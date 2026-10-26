const fs=require('node:fs');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','manifest.json'),'utf8'));
const key=process.env.TMDB_API_KEY;
const token=process.env.TMDB_READ_TOKEN;
const cache=new Map();
const g={action:28,comedy:35,horror:27,animation:16};
const studios={universal:33,warner:174,paramountpic:4,sony:34,disneystudio:2,a24:41077};
const aliases={netflix:['Netflix'],max:['Max','HBO Max'],paramount:['Paramount Plus','Paramount+'],apple:['Apple TV Plus','Apple TV+'],prime:['Amazon Prime Video','Prime Video'],disney:['Disney Plus','Disney+'],globoplay:['Globoplay']};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function send(res,code,data,seconds=300){res.statusCode=code;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('access-control-allow-origin','*');res.setHeader('cache-control',`public, max-age=${seconds}, s-maxage=${seconds}`);res.end(JSON.stringify(data));}
async function tmdb(route,parameters={}){
 if(!key&&!token)throw Error('TMDB_NOT_CONFIGURED: defina TMDB_API_KEY nas variáveis da Vercel');
 const u=new URL('https://api.themoviedb.org/3'+route);u.searchParams.set('language','pt-BR');if(key)u.searchParams.set('api_key',key);
 for(const [k,v] of Object.entries(parameters))if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));
 const ck=u.toString();const hit=cache.get(ck);if(hit&&hit.until>Date.now())return hit.data;
 const r=await fetch(u,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error(`TMDB_HTTP_${r.status}: verifique API, provedores e limites`);
 const data=await r.json();cache.set(ck,{until:Date.now()+300000,data});return data;
}
const photo=(p,size)=>p?`https://image.tmdb.org/t/p/${size}${p}`:undefined;
function convert(x,type,publicId){return {id:publicId||`tmdb:${x.id}`,type,name:x.title||x.name||x.original_title||x.original_name||'Sem título',poster:photo(x.poster_path,'w500'),background:photo(x.backdrop_path,'w1280'),description:x.overview||'',releaseInfo:(x.release_date||x.first_air_date||'').slice(0,4)||'',imdbRating:x.vote_average?Number(x.vote_average).toFixed(1):undefined};}
// Resolve IMDb IDs so other Stremio stream addons can recognize the titles.
const imdbCache=new Map();
async function imdbFor(tmdbId,type){
 const k=`${type}:${tmdbId}`;
 if(imdbCache.has(k))return imdbCache.get(k);
 try{
  const x=await tmdb(`/${type==='movie'?'movie':'tv'}/${tmdbId}/external_ids`,{});
  const id=/^tt\d+$/.test(x.imdb_id||'')?x.imdb_id:null;
  if(id)imdbCache.set(k,id);
  return id;
 }catch{return null;}
}
async function resolveCatalogMetas(titles,type){
 // Bound parallel work to limit overload and keep catalog responses responsive.
 const results=[];
 for(let i=0;i<titles.length;i+=6){
  const chunk=await Promise.all(titles.slice(i,i+6).map(async x=>{
   const imdb=await imdbFor(x.id,type);
   return convert(x,type,imdb||`tmdb:${x.id}`);
  }));
  results.push(...chunk);
 }
 return results;
}
async function provider(kind,name){const response=await tmdb(`/watch/providers/${kind}`);const possibilities=aliases[name]||[];
 const list=(response.results||[]).filter(p=>p.display_priorities?.BR!==undefined);return list.find(p=>possibilities.some(a=>norm(a)===norm(p.provider_name)))?.provider_id;
}
function rule(type,id){
 const kind=type==='movie'?'movie':'tv';
 const defaultP={sort_by:'popularity.desc'};
 const today=new Date(); const year=today.getUTCFullYear();
 const common={
 cinema_ano_atual:{route:'/movie/now_playing',params:{region:'BR'},cinemaYear:year},
 filmes_populares:{route:'/movie/popular'},filmes_em_alta:{route:'/trending/movie/week'},
 filmes_lancamentos:{route:'/discover/movie',params:{sort_by:'primary_release_date.desc','primary_release_date.lte':today.toISOString().slice(0,10),'vote_count.gte':5}},
 filmes_brasileiros:{route:'/discover/movie',params:{with_origin_country:'BR',...defaultP}},
 filmes_bem_avaliados:{route:'/movie/top_rated'},
 filmes_acao:{route:'/discover/movie',params:{with_genres:'28',...defaultP}},
 filmes_comedia:{route:'/discover/movie',params:{with_genres:'35',...defaultP}},
 filmes_terror:{route:'/discover/movie',params:{with_genres:'27',...defaultP}},
 filmes_animacao:{route:'/discover/movie',params:{with_genres:'16',...defaultP}},
 series_populares:{route:'/tv/popular'},series_em_alta:{route:'/trending/tv/week'},
 series_lancamentos:{route:'/discover/tv',params:{sort_by:'first_air_date.desc','first_air_date.lte':today.toISOString().slice(0,10),'vote_count.gte':3}},
 series_brasileiras:{route:'/discover/tv',params:{with_origin_country:'BR',...defaultP}},
 series_bem_avaliadas:{route:'/tv/top_rated'},
 series_doramas:{route:'/discover/tv',params:{with_origin_country:'KR',...defaultP}},
 series_animes:{route:'/discover/tv',params:{with_origin_country:'JP',with_genres:'16',...defaultP}}
 };
 if(common[id])return common[id];
 const match=id.match(/^([a-z]+)_(movie|series)$/);if(!match||match[2]!==type)return null;
 if(aliases[match[1]])return {route:`/discover/${kind}`,params:{watch_region:'BR',with_watch_monetization_types:'flatrate',...defaultP},provider:match[1]};
 if(studios[match[1]])return {route:`/discover/${kind}`,params:{with_companies:studios[match[1]],...defaultP}};
 return null;
}
async function handler(req,res){
 if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('access-control-allow-origin','*');return res.end();}
 const url=new URL(req.url||'/','http://localhost');const route=url.pathname;
 try{
 if(route==='/')return send(res,200,{name:'Cinema BR',message:'Use /manifest.json para instalar no Nuvio',health:'/health',catalogExample:'/catalog/movie/cinema_ano_atual.json'});
 if(route==='/manifest.json')return send(res,200,manifest,600);
 if(route==='/health')return send(res,200,{ok:true,tmdbConfigured:Boolean(key||token),catalogs:manifest.catalogs.length,year:new Date().getUTCFullYear()});
 const cat=route.match(/^\/catalog\/(movie|series)\/([^/]+?)(?:\/([^/]+))?\.json$/);
 if(cat){const [,type,id,arg]=cat;const wanted=manifest.catalogs.some(c=>c.type===type&&c.id===id);if(!wanted)return send(res,404,{error:'CATALOG_NOT_FOUND',metas:[]});
 const spec=rule(type,id);if(!spec)return send(res,404,{error:'CATALOG_RULE_NOT_FOUND',metas:[]});
 const q=new URLSearchParams(arg||'');const rawSkip=Number(q.get('skip')||0);const skip=Number.isFinite(rawSkip)?Math.max(0,rawSkip):0;const page=Math.min(500,Math.max(1,Math.floor(skip/20)+1));
 const args={...spec.params,page};if(spec.provider){const pid=await provider(type==='movie'?'movie':'tv',spec.provider);if(!pid)return send(res,200,{metas:[],warning:'Provedor não encontrado no TMDB para BR'});args.with_watch_providers=String(pid);}
 const found=await tmdb(spec.route,args);
 let titles=(found.results||[]).filter(x=>x.poster_path);
 if(spec.cinemaYear)titles=titles.filter(x=>String(x.release_date||'').startsWith(String(spec.cinemaYear)));
 const uniq=new Set();titles=titles.filter(x=>{if(uniq.has(x.id))return false;uniq.add(x.id);return true});
 return send(res,200,{metas:await resolveCatalogMetas(titles,type)});
 }
 const meta=route.match(/^\/meta\/(movie|series)\/([^/]+)\.json$/);
 if(meta){const [,type,id]=meta;let tmdbid;if(id.startsWith('tmdb:'))tmdbid=id.slice(5);
 else if(/^tt\d+$/.test(id)){const f=await tmdb(`/find/${id}`,{external_source:'imdb_id'});tmdbid=(type==='movie'?f.movie_results:f.tv_results)?.[0]?.id;}
 if(!tmdbid)return send(res,404,{meta:null,error:'UNKNOWN_ID'});
 const kind=type==='movie'?'movie':'tv';const item=await tmdb(`/${kind}/${tmdbid}`);const imdb=/^tt\d+$/.test(id)?id:await imdbFor(tmdbid,type);const obj=convert(item,type,imdb||`tmdb:${tmdbid}`);obj.genres=(item.genres||[]).map(x=>x.name);if(imdb)obj.imdb_id=imdb;
 if(type==='series'){const seasons=(item.seasons||[]).filter(s=>s.season_number>0).slice(0,10);
 const details=await Promise.all(seasons.map(s=>tmdb(`/tv/${tmdbid}/season/${s.season_number}`).catch(()=>({episodes:[]}))));
 obj.videos=details.flatMap((d,i)=>(d.episodes||[]).map(e=>({id:`${imdb||`tmdb:${tmdbid}`}:${seasons[i].season_number}:${e.episode_number}`,title:e.name||`Episódio ${e.episode_number}`,season:seasons[i].season_number,episode:e.episode_number,released:e.air_date?e.air_date+'T00:00:00.000Z':undefined,thumbnail:photo(e.still_path,'w780')})));
 }
 return send(res,200,{meta:obj});}
 return send(res,404,{error:'ROUTE_NOT_FOUND',path:route});
 }catch(e){return send(res,500,{error:e.message||'INTERNAL_ERROR'});}
}
module.exports=handler;
