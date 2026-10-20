'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const names=['index.html','camera-study.html','world-map.css','club-config.js','club-auth.js','club-auth.css','club-boot.js',
'club-locales.js','club-i18n.js','club-audio.js','club-bosses.js','club-equipment.js','club-avatar.js','club-match-stats.js','club-career.js','club-leaderboard.js','club-venues.js','club-scene.js'];
const config=fs.readFileSync(path.join(root,'club-config.js'),'utf8');
if(/sb_secret_|service_role/.test(config.replace(/\/\/[^\n]*/g,'')))throw Error('Private Supabase key must never be deployed');
for(const name of names)fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
for(const name of ['supabase-2.118.0.js','supabase-LICENSE'])fs.copyFileSync(path.join(root,'vendor',name),path.join(out,'vendor',name));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Pages build ready: '+names.length+' application files, vendored Supabase SDK');
