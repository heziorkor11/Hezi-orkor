from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,os
root=Path(__file__).resolve().parents[1]/'public';m={}
for f in ['ac-approved-2026-11-08','ac-additional-2026-11-08','ac-watermarked-2026-11-08']:m.update(json.load(open(root/'catalog/images'/f'{f}.json')))
output=Path(os.environ.get('AC_QA_OUTPUT_DIR','/tmp/ac-background-qa'));output.mkdir(parents=True,exist_ok=True)
flags=[];rows=[]
for sku,p in m.items():
 a=np.array(Image.open(root/p.lstrip('/')).convert('RGB'));ys,xs=np.where(a.min(2)<248);box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)];x,y,r,b=box;c=a[y:b,x:r];h,w=c.shape[:2];k=max(4,min(h,w)//30)
 def pale(a):
  a=a.astype('int16');return (a.min(2)>=210)&(a.mean(2)<250)&(a.max(2)-a.min(2)<40)&(a[:,:,2]>=a[:,:,0]-4)
 mask=pale(c);corn=[float(pale(z).mean()) for z in [c[:k,:k],c[:k,-k:],c[-k:,:k],c[-k:,-k:]]];edges=[float(z.mean()) for z in [mask[:k],mask[-k:],mask[:,:k],mask[:,-k:]]]
 flagged=(sum(q>.35 for q in corn)>=2 or max(edges)>.45) and mask.mean()>.012
 row={'sku':sku,'image':p,'box':box,'paleFraction':float(mask.mean()),'corners':corn,'edges':edges,'flagged':bool(flagged)};rows.append(row)
 if flagged:flags.append(row)
print('checked',len(m),'flagged',len(flags));print([f['sku'] for f in flags]);(output/'all-background-after.json').write_text(json.dumps({'checked':len(m),'flags':flags,'all':rows},indent=2))
for start in range(0,len(flags),40):
 part=flags[start:start+40];sheet=Image.new('RGB',(1200,210*((len(part)+5)//6)),'white');d=ImageDraw.Draw(sheet)
 for i,r in enumerate(part):
  im=Image.open(root/r['image'].lstrip('/'));im.thumbnail((195,180));x=(i%6)*200;y=(i//6)*210;sheet.paste(im,(x,y));d.text((x,y+185),r['sku'],fill='black')
 sheet.save(output/f'all-after-flags-{start//40+1}.jpg')
