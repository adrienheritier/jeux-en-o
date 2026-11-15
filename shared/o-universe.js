
(function(){
  'use strict';
  const STORE_KEY='jeuxo_universe_v1';
  const ACTIVE_KEY='jeuxo_active_profile_v1';
  const MAX_SESSIONS=120;
  const GAMES={
    calculo:{name:'CalculO!', icon:'➕', color:'#4167e7', path:'./calculo/', levels:[
      {key:'add_0',name:'Addition · Niveau 1'},{key:'add_1',name:'Addition · Niveau 2'},{key:'add_2',name:'Addition · Niveau 3'},{key:'add_3',name:'Addition · Niveau 4'},
      {key:'sub_0',name:'Soustraction · Niveau 1'},{key:'sub_1',name:'Soustraction · Niveau 2'},{key:'sub_2',name:'Soustraction · Niveau 3'}
    ]},
    lecturo:{name:'LecturO!', icon:'✎', color:'#42b883', path:'./lecturo/', levels:[
      {key:'level_0',name:'Facile'},{key:'level_1',name:'Moyen'},{key:'level_2',name:'Avancé'}
    ]},
    problemo:{name:'ProblémO!', icon:'🧩', color:'#f39b33', path:'./problemo/', levels:[
      {key:'level_0',name:'Facile'},{key:'level_1',name:'Moyen'},{key:'level_2',name:'Avancé'}
    ]}
  };
  const ACHIEVEMENTS=[
    {id:'first_game',name:'Premier pas',desc:'Jouer une première partie.',test:p=>p.sessions.length>=1,icon:'🌟'},
    {id:'all_games_once',name:'Explorateur',desc:'Jouer au moins une fois à chacun des trois jeux.',test:p=>['calculo','lecturo','problemo'].every(g=>p.sessions.some(s=>s.game===g)),icon:'🧭'},
    {id:'games_10',name:'Persévérant',desc:'Jouer 10 parties.',test:p=>p.sessions.length>=10,icon:'🎯'},
    {id:'games_25',name:'Champion régulier',desc:'Jouer 25 parties.',test:p=>p.sessions.length>=25,icon:'🏅'},
    {id:'perfect_5',name:'Sans faute',desc:'Réussir 5 parties parfaites.',test:p=>p.sessions.filter(s=>s.score===s.total).length>=5,icon:'✨'},
    {id:'cups_10',name:'Collectionneur',desc:'Gagner 10 coupes.',test:p=>countCups(p)>=10,icon:'🏆'},
    {id:'gold_5',name:'Or en poche',desc:'Gagner 5 coupes d’or.',test:p=>countCups(p,'gold')>=5,icon:'🥇'},
    {id:'master_calculo',name:'As du calcul',desc:'Gagner au moins une coupe dans tous les niveaux de CalculO!.',test:p=>allLevelsWithCup(p,'calculo'),icon:'🧮'},
    {id:'master_lecturo',name:'As de la lecture',desc:'Gagner au moins une coupe dans tous les niveaux de LecturO!.',test:p=>allLevelsWithCup(p,'lecturo'),icon:'📚'},
    {id:'master_problemo',name:'As des problèmes',desc:'Gagner au moins une coupe dans tous les niveaux de ProblémO!.',test:p=>allLevelsWithCup(p,'problemo'),icon:'🧩'}
  ];
  function defaultData(){ return {profiles:[]}; }
  function load(){ try{ const d=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); if(d&&Array.isArray(d.profiles)) return d; }catch(e){} return defaultData(); }
  function save(data){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  function getData(){ return load(); }
  function getProfiles(){ return load().profiles; }
  function uid(){ return 'p_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
  function getActiveProfileId(){ return localStorage.getItem(ACTIVE_KEY)||''; }
  function setActiveProfile(id){ localStorage.setItem(ACTIVE_KEY,id); }
  function getActiveProfile(){ const data=load(); let id=getActiveProfileId(); if(!id && data.profiles[0]){ id=data.profiles[0].id; setActiveProfile(id); } return data.profiles.find(p=>p.id===id)||null; }
  function ensureProfileShape(profile){
    if(!profile.sessions) profile.sessions=[];
    if(!profile.cups) profile.cups={};
    if(!profile.achievements) profile.achievements={};
    if(!profile.preferences) profile.preferences={};
    return profile;
  }
  function createProfile({name, avatar, color}){
    const data=load();
    const profile=ensureProfileShape({id:uid(),name:(name||'Joueur').trim().slice(0,24)||'Joueur',avatar:avatar||'🦊',color:color||'#4167e7',createdAt:new Date().toISOString()});
    data.profiles.push(profile); save(data); setActiveProfile(profile.id); return profile;
  }
  function updateProfile(id, patch){ const data=load(); const p=data.profiles.find(x=>x.id===id); if(!p) return null; Object.assign(p, patch||{}); ensureProfileShape(p); save(data); return p; }
  function deleteProfile(id){ const data=load(); data.profiles=data.profiles.filter(p=>p.id!==id); save(data); if(getActiveProfileId()===id){ const next=data.profiles[0]?.id||''; if(next) setActiveProfile(next); else localStorage.removeItem(ACTIVE_KEY); } }
  function storageKey(base){ const p=getActiveProfile(); return p? `${base}__${p.id}` : base; }
  function cupTier(score,total){ if(score>=total) return 'gold'; if(score>=total-1) return 'silver'; if(score>=Math.max(total-2,1)) return 'bronze'; return null; }
  function countCups(profile,tier){ return Object.values(profile.cups||{}).filter(v=>!tier || v===tier).length; }
  function tierRank(t){ return t==='gold'?3:t==='silver'?2:t==='bronze'?1:0; }
  function allLevelsWithCup(profile, game){ const levels=GAMES[game]?.levels||[]; return levels.every(l=>profile.cups && profile.cups[game+':'+l.key]); }
  function evaluateAchievements(profile){ ensureProfileShape(profile); let changed=false; for(const a of ACHIEVEMENTS){ if(!profile.achievements[a.id] && a.test(profile)){ profile.achievements[a.id]={unlockedAt:new Date().toISOString()}; changed=true; } } return changed; }
  function recordSession(session){
    const data=load(); const profile=data.profiles.find(p=>p.id===getActiveProfileId()) || data.profiles[0]; if(!profile) return null;
    ensureProfileShape(profile);
    const payload={game:session.game, levelKey:session.levelKey, levelName:session.levelName, score:session.score, total:session.total||10, firstTry:session.firstTry||0, secondTry:session.secondTry||0, missed:session.missed||0, playedAt:new Date().toISOString()};
    profile.sessions.unshift(payload); profile.sessions=profile.sessions.slice(0,MAX_SESSIONS);
    const tier=cupTier(payload.score,payload.total);
    if(tier){ const k=payload.game+':'+payload.levelKey; const prev=profile.cups[k]; if(!prev || tierRank(tier)>tierRank(prev)) profile.cups[k]=tier; }
    evaluateAchievements(profile); save(data);
    window.dispatchEvent(new CustomEvent('jeuxo:update',{detail:{type:'session',session:payload}}));
    return payload;
  }
  function getProfileById(id){ const data=load(); const p=data.profiles.find(x=>x.id===id); return p?ensureProfileShape(p):null; }
  function getProfileSummary(id){
    const p=getProfileById(id || getActiveProfileId());
    if(!p) return null; ensureProfileShape(p);
    const totalGames=p.sessions.length;
    const totalQuestions=p.sessions.reduce((a,s)=>a+(s.total||0),0);
    const totalGood=p.sessions.reduce((a,s)=>a+(s.score||0),0);
    const totalFirst=p.sessions.reduce((a,s)=>a+(s.firstTry||0),0);
    const totalSecond=p.sessions.reduce((a,s)=>a+(s.secondTry||0),0);
    const appStats={};
    for(const [key, cfg] of Object.entries(GAMES)){
      const arr=p.sessions.filter(s=>s.game===key);
      const levels=cfg.levels;
      const cups=levels.filter(l=>p.cups[key+':'+l.key]).length;
      appStats[key]={
        game:key,name:cfg.name,icon:cfg.icon,color:cfg.color,path:cfg.path,
        sessions:arr.length,
        best:arr.reduce((m,s)=>Math.max(m,s.score||0),0),
        average:arr.length ? +(arr.reduce((a,s)=>a+s.score,0)/arr.length).toFixed(1) : 0,
        cups, totalCups:levels.length,
        gold:levels.filter(l=>p.cups[key+':'+l.key]==='gold').length,
        silver:levels.filter(l=>p.cups[key+':'+l.key]==='silver').length,
        bronze:levels.filter(l=>p.cups[key+':'+l.key]==='bronze').length,
        lastPlayed:arr[0]?.playedAt || null
      };
    }
    return {
      profile:p,
      totalGames,
      totalQuestions,
      totalGood,
      totalFirst,
      totalSecond,
      totalMissed: totalQuestions-totalGood,
      successRate: totalQuestions ? Math.round((totalGood/totalQuestions)*100) : 0,
      cups: {total:countCups(p), gold:countCups(p,'gold'), silver:countCups(p,'silver'), bronze:countCups(p,'bronze')},
      achievementsUnlocked:Object.keys(p.achievements||{}).length,
      achievementsTotal:ACHIEVEMENTS.length,
      recentSessions:p.sessions.slice(0,8),
      appStats
    };
  }
  function getAchievementsForProfile(id){ const p=getProfileById(id || getActiveProfileId()); return ACHIEVEMENTS.map(a=>({ ...a, unlocked: !!(p&&p.achievements&&p.achievements[a.id]), unlockedAt: p&&p.achievements&&p.achievements[a.id] ? p.achievements[a.id].unlockedAt : null })); }
  function prettyDate(dateStr){ if(!dateStr) return ''; const d=new Date(dateStr); return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}); }
  function injectPortal(){
    if(window.top!==window.self) return;
    if(location.pathname.endsWith('/index.html') && /(\/calculo\/|\/lecturo\/|\/problemo\/)/.test(location.pathname)){
      if(document.getElementById('jeuxo-portal')) return;
      const p=getActiveProfile();
      const wrap=document.createElement('div');
      wrap.id='jeuxo-portal';
      wrap.innerHTML=`<a href="../index.html" class="jeuxo-home-btn" aria-label="Retour à l'univers">⌂ O!</a>${p?`<div class="jeuxo-profile-chip" title="Profil actif"><span>${p.avatar}</span><strong>${p.name.replace(/[<>&]/g,'')}</strong></div>`:''}`;
      const style=document.createElement('style');
      style.textContent=`#jeuxo-portal{position:fixed;left:12px;right:12px;top:10px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none;z-index:9999}#jeuxo-portal>*{pointer-events:auto}.jeuxo-home-btn{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:40px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.94);color:#2b3b6e;text-decoration:none;font:900 18px/1 system-ui,sans-serif;box-shadow:0 10px 24px rgba(34,46,89,.17);border:1px solid rgba(66,103,231,.14)}.jeuxo-profile-chip{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.94);font:700 14px/1.1 system-ui,sans-serif;color:#2b365d;box-shadow:0 10px 24px rgba(34,46,89,.17);border:1px solid rgba(66,103,231,.14)}.jeuxo-profile-chip span{font-size:18px}`;
      document.head.appendChild(style); document.body.appendChild(wrap);
    }
  }
  const api={GAMES, ACHIEVEMENTS, getData, getProfiles, createProfile, updateProfile, deleteProfile, getActiveProfile, getActiveProfileId, setActiveProfile, storageKey, recordSession, getProfileSummary, getAchievementsForProfile, prettyDate, injectPortal};
  window.OUniverse=api;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectPortal); else injectPortal();
})();
