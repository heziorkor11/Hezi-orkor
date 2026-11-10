import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
const tax=JSON.parse(fs.readFileSync('public/catalog/display-taxonomy.json'));
const hiddenCats=new Set(JSON.parse(fs.readFileSync('public/catalog/hidden-categories.json')).hiddenCategories||[]);
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {loadListing,loadProduct}=await server.ssrLoadModule('/src/lib/catalog-search.ts');
 const visible=Object.values(tax.bySku).filter(x=>!x.hidden && !hiddenCats.has(x.category)).length;
 assert.equal((await loadListing({})).total,visible);
 for(const c of tax.categories){
  if(hiddenCats.has(c.id)){assert.equal((await loadListing({category:c.id})).total,0,`hidden category ${c.id}`);continue;}
  const result=await loadListing({category:c.id});assert.equal(result.total,c.count,`category ${c.id}`);
  for(const s of tax.subcategories[c.id]||[]){assert.equal((await loadListing({category:c.id,sub:s.id})).total,s.count,`${c.id}/${s.id}`);}
 }
 for(const [sku,ov] of Object.entries(tax.bySku).filter(([,ov])=>ov.hidden).slice(0,3)){
  assert.equal(await loadProduct(sku),undefined);assert.equal((await loadListing({q:sku})).total,0);
 }
 assert.equal((await loadListing({category:'throttle-body'})).total,18,'18 throttle bodies');
 assert.equal(tax.categories.find(c=>c.id==='general'),undefined,'general category removed');
 assert.equal((await loadListing({category:'lights'})).total,0);
 assert.equal((await loadListing({category:'oil-filter'})).total,tax.categories.find(c=>c.id==='filters').count);
 assert.ok((await loadListing({q:'04152YZZA6'})).total>0,'OE search');
 for(const category of ['steering','suspension','clutch','shocks'])assert.ok((await loadListing({category})).total>0);
 console.log('PASS: totals, every category/subcategory, aliases, hidden search/detail and OE search. Visible:',visible);
}finally{await server.close();}
