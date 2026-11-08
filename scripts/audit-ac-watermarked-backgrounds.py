import json,hashlib,numpy as np
from PIL import Image,ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public';m=json.load(open(root/'catalog/images/ac-watermarked-2026-11-08.json'));flags=[];allrows=[]
for sku,p in m.items():
 a=np.array(Image.open(root/p.lstrip('/')).convert('RGB'));ys,xs=np.where(a.min(2)<248);box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)];x,y,r,b=box;c=a[y:b,x:r];h,w=c.shape[:2];k=max(3,min(h,w)//40);corn=np.array([c[:k,:k].mean((0,1)),c[:k,-k:].mean((0,1)),c[-k:,:k].mean((0,1)),c[-k:,-k:].mean((0,1))]);border=np.concatenate([c[:k].reshape(-1,3),c[-k:].reshape(-1,3),c[:,:k].reshape(-1,3),c[:,-k:].reshape(-1,3)]).mean(0)
 outer=np.concatenate([a[:12].reshape(-1,3),a[-12:].reshape(-1,3),a[:,:12].reshape(-1,3),a[:,-12:].reshape(-1,3)]).mean(0)
 row={'sha256':hashlib.sha256((root/p.lstrip('/')).read_bytes()).hexdigest(),'outerBorderMean':outer.tolist(),'sku':sku,'box':box,'mean':border.tolist(),'corners':corn.tolist(),'size':list(a.shape[:2])};allrows.append(row)
 # Ignore a corner occupied by the product: require >=3 nonwhite corners (rectangular source backdrop).
 if sum(min(q)<245 or max(q)-min(q)>3 for q in corn)>=3:flags.append(row)
assert len(allrows)==215
assert all(r['size']==[1200,1200] for r in allrows)
assert all(min(r['outerBorderMean'])>=245 and max(r['outerBorderMean'])-min(r['outerBorderMean'])<=3 for r in allrows)
print('FLAGGED',len(flags));print([r['sku'] for r in flags]);(root/'catalog/images/ac-watermarked-background-audit.json').write_text(json.dumps({'checked':215,'flagged':flags,'all':allrows},indent=2)+'\n')
assert not flags, 'Nonwhite rectangular backdrop detected'
