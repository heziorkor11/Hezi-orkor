/** Presentation-only overrides; never rewrites source catalog or prices. */
import fs from 'node:fs';
const root='public/catalog/';
const products=fs.readdirSync(root+'chunks').filter(f=>f.endsWith('.json')).flatMap(f=>JSON.parse(fs.readFileSync(root+'chunks/'+f,'utf8')));
const definitions={
 brakes:[['pads','רפידות',/רפידות|רפיד/],['discs','צלחות בלם',/צלחת בלם|דיסק בלם/],['shoes','נעלי בלם',/נעל בלם|נעלי בלם/]],
 shocks:[['front','קדמי',/קדמי|קד['׳]/],['rear','אחורי',/אחורי|אח['׳]/]],
 steering:[['ends','קצוות הגה',/קצה הגה|ק\.\s*הגה/],['links','מוטות קישור',/מוט קישור|מ\.קישור/],['pumps','משאבות הגה',/משאבת הגה/]],
 suspension:[['mounts','תושבות בולם',/תושבת בולם|ת\.בולם/],['joints','תפוחי פרונט',/תפוח פרונט|ת\.פרונט/],['arms','זרועות ומשולשים',/זרוע קדמית|ז\.פרונט|משולש/],['bushings','גומיות מייצב',/גומי מייצב/]],
 clutch:[['pumps','משאבות מצמד',/משאבת מצמד|מ\.מצמד/],['kits','ערכות מצמד',/סט מצמד|ס\.מצמד/]],
 filters:[['oil','שמן',/פילטר שמן|מסנן שמן/],['cabin','מזגן',/פילטר מזגן|מסנן מזגן|מ\.מזגן|פ\. מזגן/],['gear','גיר',/פילטר גיר|מסנן גיר/],['air','אוויר',/פילטר אוויר|מסנן אוויר/],['diesel','סולר',/פילטר סולר|מסנן סולר/]],
 fluids:[['gear','שמן גיר',/שמן גיר|ש\.גיר|\bATF\b|\bCVTF?\b/i],['engine','שמן מנוע',/שמן מנוע|KIAHYUNDAI/i]],
 'workshop-packs':[['ties','אזיקונים',/אזיקונ/],['gear','שמן גיר בכמות',/שמן גיר|שמן סרן\/גיר|ש\.גיר|\bATF\b|\bCVTF?\b/i],['engine','שמן מנוע בכמות',/שמן מנוע|KIAHYUNDAI/i]],
 'spark-plugs':[['glow','מצתי להט',/להט/],['ignition','מצתי הצתה',/מצת/]],
};
const newCategories=[['radiator','רדיאטורים'],['water-pump','משאבות מים'],['driveshaft','ציריות'],['hub','נאבות'],['steering-rack','מסרקי הגה'],['timing','טיימינג'],['throttle-body','בתי מצערת'],['cleaning-maintenance','ניקוי ותחזוקה']];
const generalRules=[['radiator',/רדיאטור/],['water-pump',/משאבת מים|מ\. מים/],['general',/גומי ציריה|גומי צריה/],['driveshaft',/ציריה/],['hub',/נאבה/],['steering-rack',/מסרק הגה/],['timing',/טימינג|טיימינג|סט שרשרת/],['filters',/פילטר גיר|מסנן גיר/]];
const manifest=JSON.parse(fs.readFileSync(root+'manifest.json','utf8'));
const hiddenCfg=JSON.parse(fs.readFileSync(root+'hidden-categories.json','utf8'));
if(!Array.isArray(hiddenCfg.hiddenCategories)) throw new Error('hidden-categories.json hiddenCategories must be an array');
// Category hides are applied at runtime from that file, so this JSON keeps those categories for a reversible switch.
// Structural merges (oil-filter, cabin-filter, general) stay out of the storefront category list.
const categories=manifest.categories.filter(c=>!['oil-filter','cabin-filter','general'].includes(c.id)).map(c=>({id:c.id,name:c.name})).concat(newCategories.map(([id,name])=>({id,name})));
const reviewed=JSON.parse(fs.readFileSync(root+'general-review-overrides.json','utf8')).bySku;
const categoryOverrides=JSON.parse(fs.readFileSync(root+'display-category-overrides.json','utf8')).bySku||{};
const visibility=JSON.parse(fs.readFileSync(root+'visibility-overrides.json','utf8')).bySku;
const bySku={};
for(const p of products){
 const text=p.name+' '+(p.nameOriginal||'');let category=p.category;
 if(category==='general')category=generalRules.find(([,re])=>re.test(text))?.[0]||'general';
 if(['oil-filter','cabin-filter'].includes(category))category='filters';
 if(reviewed[p.sku])category=reviewed[p.sku].category;
 if(categoryOverrides[p.sku]?.category)category=categoryOverrides[p.sku].category;
 const sub=definitions[category]?.find(([, , re])=>re.test(text))?.[0];
 // Per-SKU hides come only from visibility-overrides. Category hides are applied at runtime from hidden-categories.json.
 bySku[p.sku]={category,...(sub?{sub}:{}),...(visibility[p.sku]?.hidden?{hidden:true}:{})};
}
for(const c of categories)c.count=products.filter(p=>bySku[p.sku].category===c.id&&!bySku[p.sku].hidden).length;
const subcategories=Object.fromEntries(Object.entries(definitions).map(([category,defs])=>[category,defs.map(([id,name,re])=>({id,name,rule:re.source,count:products.filter(p=>bySku[p.sku].category===category&&bySku[p.sku].sub===id&&!bySku[p.sku].hidden).length}))]));
fs.writeFileSync(root+'display-taxonomy.json',JSON.stringify({version:1,description:'Display-only category/subcategory/hidden overrides. Source data and prices remain unchanged.',categories,subcategories,bySku}));
console.log(JSON.stringify({categories,subcategories},null,2));
