'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const names=['favicon.svg','index.html','camera-study.html','world-map.css','club-config.js','club-save-safety.js','club-auth.js','club-auth.css','club-boot.js',
'club-updates.js','club-locales.js','club-i18n.js','club-audio.js','club-music.js','club-bosses.js','club-equipment.js','club-avatar.js','club-match-stats.js','club-career.js','club-leaderboard.js','club-feedback.js','club-venues.js','club-scene.js','club-presence.js'];
const config=fs.readFileSync(path.join(root,'club-config.js'),'utf8');
if(/sb_secret_|service_role/.test(config.replace(/\/\/[^\n]*/g,'')))throw Error('Private Supabase key must never be deployed');
for(const name of names){const source=fs.readFileSync(path.join(root,name),'utf8');if(/\bre_[A-Za-z0-9_-]{20,}\b|\bsb_secret_[A-Za-z0-9_-]+/.test(source))throw Error('Private provider key found in public asset: '+name);fs.copyFileSync(path.join(root,name),path.join(out,name));}
// Every deployed HTML document points to one content-addressed asset set.
const assets={};
for(const name of names.filter(name=>/\.(js|css|svg)$/.test(name))){const data=fs.readFileSync(path.join(root,name)),hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,12),ext=path.extname(name),versioned=name.slice(0,-ext.length)+'.'+hash+ext;assets[name]='./'+versioned;fs.writeFileSync(path.join(out,versioned),data);}
for(const name of ['index.html','camera-study.html']){let html=fs.readFileSync(path.join(root,name),'utf8');html=html.replace(/(src|href)="\.\/([^"?]+)"/g,(match,attr,file)=>assets[file]?attr+'="'+assets[file]+'"':match);html=html.replace('</head>','<script>window.ClubAssetMap='+JSON.stringify(assets)+';</script></head>');fs.writeFileSync(path.join(out,name),html);}
fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
for(const name of ['supabase-2.118.0.js','supabase-LICENSE'])fs.copyFileSync(path.join(root,'vendor',name),path.join(out,'vendor',name));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Pages build ready: '+names.length+' application files, vendored Supabase SDK');
