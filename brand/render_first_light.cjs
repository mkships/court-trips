// Render the First Light kit with the project's existing Sharp dependency.
// Run: node brand/render_first_light.cjs
const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require(path.join(__dirname, '../web/node_modules/sharp'));
const root = path.join(__dirname, 'first-light');

async function png(src, target, width, height) {
  let image = sharp(path.join(root,src),{density:288});
  image = image.resize(width,height,{fit:'contain'});
  await image.png().toFile(path.join(root,target));
}

async function ico(theme) {
  const sizes=[16,32,48];
  const images=await Promise.all(sizes.map(size=>fs.readFile(path.join(root,`favicons/favicon-${theme}-${size}.png`))));
  const header=Buffer.alloc(6+16*sizes.length);
  header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4);
  let offset=header.length;
  for(let i=0;i<sizes.length;i++) {
    const pos=6+16*i;
    header[pos]=sizes[i]; header[pos+1]=sizes[i];
    header.writeUInt16LE(1,pos+4); header.writeUInt16LE(32,pos+6);
    header.writeUInt32LE(images[i].length,pos+8); header.writeUInt32LE(offset,pos+12);
    offset+=images[i].length;
  }
  await fs.writeFile(path.join(root,`favicons/${theme==='light'?'favicon':'favicon-dark'}.ico`),Buffer.concat([header,...images]));
}

async function main() {
  for(const theme of ['primary','reversed','ink','black','white']) {
    for(const [category,width] of [['horizontal',1600],['stacked',1024],['emblem',1024],['wordmark',1600]]) {
      await png(`logos/${category}/${theme}.svg`,`logos/${category}/${theme}.png`,width);
    }
  }
  for(const theme of ['paper','white','ink','green']) {
    for(const size of [180,192,512,1024]) await png(`app-icons/app-${theme}.svg`,`app-icons/app-${theme}-${size}.png`,size,size);
  }
  for(const size of [192,512]) {
    await png('app-icons/app-maskable.svg',`app-icons/icon-maskable-${size}.png`,size,size);
    await fs.copyFile(path.join(root,`app-icons/app-paper-${size}.png`),path.join(root,`app-icons/icon-${size}.png`));
  }
  await fs.copyFile(path.join(root,'app-icons/app-paper-180.png'),path.join(root,'app-icons/apple-touch-icon.png'));
  for(const theme of ['light','dark']) {
    for(const size of [16,24,32,48,64,128]) await png(`favicons/favicon-${theme}.svg`,`favicons/favicon-${theme}-${size}.png`,size,size);
    await ico(theme);
  }
  for(const name of ['asset-overview','illustration-uses']) await png(`previews/${name}.svg`,`previews/${name}.png`,name==='asset-overview'?1600:1440);
  for(const [name,w,h] of [['open-graph',1200,630],['square',1080,1080]]) await png(`social/${name}.svg`,`social/${name}.png`,w,h);
  const original=path.join(root,'illustrations/court-trips-editorial-original.png');
  await sharp(original).webp({quality:90}).toFile(path.join(root,'illustrations/court-trips-editorial.webp'));
  await sharp(original).resize(640,640).webp({quality:90}).toFile(path.join(root,'illustrations/court-trips-editorial-640.webp'));
  await sharp(original).resize(640,640).png().toFile(path.join(root,'illustrations/court-trips-editorial-640.png'));
  await sharp(original).resize(640,640).jpeg({quality:90,mozjpeg:true}).toFile(path.join(root,'illustrations/court-trips-editorial-640.jpg'));
  // The original's textured cream paper is preserved above. Use the alpha
  // master on website sections; the paper-flattened export is for email.
  const transparent=path.join(root,'illustrations/court-trips-editorial-transparent.png');
  await sharp(transparent).webp({lossless:true}).toFile(path.join(root,'illustrations/court-trips-editorial-transparent.webp'));
  await sharp(transparent).resize(640,640).png().toFile(path.join(root,'illustrations/court-trips-editorial-transparent-640.png'));
  await sharp(transparent).resize(640,640).webp({lossless:true}).toFile(path.join(root,'illustrations/court-trips-editorial-transparent-640.webp'));
  await sharp(transparent).flatten({background:'#faf8f1'}).png().toFile(path.join(root,'illustrations/court-trips-editorial-warm-paper.png'));
  await sharp(transparent).flatten({background:'#faf8f1'}).webp({lossless:true}).toFile(path.join(root,'illustrations/court-trips-editorial-warm-paper.webp'));
  await sharp(transparent).resize(640,640).flatten({background:'#faf8f1'}).png().toFile(path.join(root,'illustrations/court-trips-editorial-warm-paper-640.png'));
  console.log('Rendered all logo, favicon, app icon, illustration and preview exports.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
