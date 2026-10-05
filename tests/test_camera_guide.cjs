const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const project=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(project,'guide-camera.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core=script.slice(0,script.indexOf('const root=document.getElementById'));
const {evaluateProduct,recommend,budgetTotal,products}=vm.runInNewContext(core+'\n({evaluateProduct,recommend,budgetTotal,products:PRODUCTS})');
const base={zone:'outside',usage:'garden',power:'plug',network:'wifi',recording:'events',storage:'local',subscription:'no',integration:'any',priority:'economy',country:'fr'};
let checks=0;
function test(name,fn){fn();checks++;console.log('OK '+name);}
test('extérieur abordable, continu et suivi',()=>{
 const r=recommend(products,{...base,recording:'continuous',tracking:true});
 assert(r.matches.some(x=>x.product.id==='tapo_c520ws'));
 assert(r.matches.every(x=>x.product.power.includes('plug')&&x.product.continuous===true&&x.product.tracking===true));
});
test('animal intérieur et budget 50 euros',()=>{
 const r=recommend(products,{...base,zone:'inside',usage:'pets',pet:true,priceCap:'50'});
 assert.equal(r.matches[0].product.id,'tapo_c220');
});
test('ne pas confondre zoom et PTZ',()=>{
 assert(evaluateProduct(products.find(p=>p.id==='zoom_color'),{...base,power:'poe',network:'ethernet',pan:true}).failures.some(x=>x.key==='pan'));
});
test('variante matérielle non confirmée exclue si suivi exigé',()=>{
 assert(evaluateProduct(products.find(p=>p.id==='solar_wifi_pt'),{...base,power:'battery',tracking:true}).failures.some(x=>x.key==='tracking'));
});
test('batterie en continu : Altas autorisée, Argus écartée',()=>{
 const r=recommend(products,{...base,power:'battery',recording:'continuous'});
 assert(r.matches.some(x=>x.product.id==='altas_pt_ultra'));
 assert(!r.matches.some(x=>x.product.id.startsWith('solar_')));
});
test('sonnette filaire versus batterie pour continu',()=>{
 const p=products.find(p=>p.id==='tapo_doorbell');
 const a={...base,usage:'visitors',recording:'continuous',power:'doorwire'};
 assert.equal(evaluateProduct(p,a).failures.length,0);
 assert(evaluateProduct(p,{...a,power:'battery'}).failures.some(x=>x.key==='recording'));
});
test('4G sans abonnement ne produit pas de fausse recommandation',()=>{
 assert.equal(recommend(products,{...base,power:'battery',network:'4g',mobile:'yes'}).matches.length,0);
 assert(recommend(products,{...base,power:'battery',network:'4g',mobile:'yes',subscription:'okay'}).matches.length>0);
});
test('couverture inconnue bloque le choix 4G',()=>assert.equal(recommend(products,{...base,power:'battery',network:'4g',mobile:'unknown',subscription:'okay'}).matches.length,0));
test('AOV ne passe pas pour une vidéo fluide permanente',()=>{
 const p=products.find(p=>p.id==='tapo_c665g');
 assert(evaluateProduct(p,{...base,power:'battery',recording:'continuous'}).failures.some(x=>x.key==='recording'));
 assert.equal(evaluateProduct(p,{...base,power:'battery',recording:'aov'}).failures.length,0);
});
test('marque imposée conservée sans substitution',()=>assert.equal(recommend(products,{...base,brand:'Somfy',strictBrand:true}).matches.length,0));
test('Apple Home distingue les versions PoE et WiFi',()=>{
 const r=recommend(products,{...base,integration:'apple'}).matches;
 assert.equal(r[0].product.id,'aqara_g5_wifi');
 assert(!r.some(x=>x.product.id==='aqara_outdoor_poe'));
});
test('Ethernet secteur ne devient pas PoE',()=>{
 const r=recommend(products,{...base,network:'ethernet'}).matches;
 assert(r.some(x=>x.product.id==='tapo_c520ws'));
 assert(r.every(x=>x.product.power.includes('plug')));
});
test('kit seulement pour une demande de kit',()=>{
 assert(!recommend(products,{...base,power:'poe',network:'ethernet'}).matches.some(x=>x.product.type==='kit'));
 assert.equal(recommend(products,{...base,power:'poe',network:'ethernet',usage:'kit'}).matches[0].product.id,'kit');
});
test('plafond exclut les prix inconnus',()=>assert(recommend(products,{...base,priceCap:'100'}).matches.every(x=>x.product.price&&x.product.price<=100)));
test('calcul budget et valeurs manquantes',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(budgetTotal(80,30,5,2))),{initial:190,threeYears:370});
 assert.equal(budgetTotal('',0,0,1),null);
 assert.equal(budgetTotal(50,-1,0,1),null);
 assert.equal(budgetTotal(50,0,0,1.5),null);
});
test('tous les liens Amazon ont le bon domaine et le bon tag',()=>{
 for(const p of products)for(const [country,domain,tag] of [['fr','www.amazon.fr','dingodor-21'],['be','www.amazon.com.be','dingodor00e-21']]){
  const u=new URL(p.links[country]);assert.equal(u.hostname,domain);assert.equal(u.searchParams.get('tag'),tag);assert(u.searchParams.get('k'));
 }
});
test('liens historiques inchangés',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(project,'data/camera-affiliate-archive.json'),'utf8'));
 for(const p of products)if(old[p.id])assert.deepEqual(JSON.parse(JSON.stringify(p.links)),old[p.id]);
});
test('profils distincts et sourcés',()=>{
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 for(const p of products){assert(p.sources.length);assert(p.limit);assert(p.extras);}
});
test('HTML final : script valide et sans événements inline',()=>{
 const html=fs.readFileSync(path.join(project,'guide-camera.html'),'utf8');
 for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
 assert(!/on(?:click|change|load|error)=/i.test(html));
 assert(!html.includes('maximum-scale=1'));
});
test('matrice de contraintes : aucun modèle incompatible ne passe',()=>{
 let tested=0;
 for(const zone of ['inside','outside'])for(const power of ['plug','poe','battery','doorwire'])for(const network of ['wifi','ethernet','4g','unknown'])for(const recording of ['events','continuous'])for(const storage of ['local','rtsp','any'])for(const subscription of ['no','okay'])for(const integration of ['any','rtsp','apple']){
  const a={...base,zone,power,network,recording,storage,subscription,integration,mobile:'yes'};
  for(const r of recommend(products,a).matches){assert.equal(r.failures.length,0);assert.equal(r.product.zone,zone);assert(r.product.power.includes(power));assert((r.product.networks||[r.product.network]).includes(network));if(recording==='continuous')assert(r.product.continuous===true||r.product.continuous==='wired'&&power==='doorwire');}
  tested++;
 }
 console.log('Configurations parcourues : '+tested);
});
console.log(`${checks} tests réussis.`);

