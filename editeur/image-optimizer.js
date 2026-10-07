'use strict';
let lastImageImport=null;
function readableSize(bytes){return bytes<1024*1024?Math.round(bytes/1024)+' Ko':(bytes/(1024*1024)).toFixed(1)+' Mo';}
async function optimizeImage(file){
 const ext=file.name.split('.').pop().toLowerCase();
 if(!['jpg','jpeg','png','webp','gif'].includes(ext))throw Error('Choisissez une image JPG, PNG, WebP ou GIF.');
 if(file.size>50*1024*1024)throw Error('Cette image dépasse 50 Mo. Exportez une copie plus légère avant de l’importer.');
 if(ext==='gif'){if(file.size>2*1024*1024)throw Error('Ce GIF dépasse 2 Mo. Réduisez-le ou utilisez une vidéo MP4 pour conserver son animation.');return {file,original:file.size,optimized:file.size,message:'GIF conservé avec son animation ('+readableSize(file.size)+').'};}
 status('Optimisation de votre image…');
 let image,url;
 try{if(typeof createImageBitmap==='function')image=await createImageBitmap(file,{imageOrientation:'from-image'});else{url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode();}}catch{if(url)URL.revokeObjectURL(url);throw Error('Cette image ne peut pas être lue. Exportez-la en JPG, PNG ou WebP.');}
 try{
 const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
 if(!width||!height||width*height>64000000)throw Error('Image trop grande à traiter sur cet appareil. Exportez une copie de moins de 64 mégapixels.');
 const limit=mode==='bons-plans'?1600:1920,target=mode==='bons-plans'?450*1024:750*1024;
 let scale=Math.min(1,limit/Math.max(width,height)),quality=.86,result=null;
 const canvas=document.createElement('canvas');
 for(let i=0;i<8;i++){
 canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('L’optimisation n’est pas disponible dans ce navigateur.');
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
 if(!result)throw Error('Impossible de compresser cette image.');
 // Browsers without WebP encoding return PNG; transparency stays intact.
 if(result.size<=target)break;
 if(i<2)quality-=.09;else{if(Math.max(width,height)*scale*.8<960)break;scale*=.8;}
 }
 if(!result||result.size>1800*1024)throw Error('Cette image reste trop lourde. Exportez une copie moins détaillée.');
 let output=file;
 // Keep a light original when resizing or conversion does not improve it.
 if(Math.max(width,height)>limit||result.size<file.size||file.size>1800*1024){const suffix=result.type==='image/webp'?'webp':'png';output=new File([result],file.name.replace(/\.[^.]+$/,'')+'.'+suffix,{type:result.type,lastModified:file.lastModified});}
 return {file:output,original:file.size,optimized:output.size,message:'Image prête : '+readableSize(file.size)+' → '+readableSize(output.size)+(output!==file?' · '+canvas.width+' × '+canvas.height+' pixels.':'.')};
 }finally{if(image?.close)image.close();if(url)URL.revokeObjectURL(url);}
}
