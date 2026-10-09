'use strict';
const spotlightPaint=paint;
paint=function(data){$('spotlight-toggle').checked=data.spotlight===true;spotlightPaint(data);};
const spotlightGetData=getData;
getData=function(){return {...spotlightGetData(),spotlight:$('spotlight-toggle').checked};};
$('spotlight-toggle').addEventListener('input',changed);
const spotlightStyle=document.createElement('style');
spotlightStyle.textContent='.spotlight-editor{margin:18px 0;padding:16px 20px;border:1px solid #b9d7e4;border-radius:18px;background:linear-gradient(120deg,#edf8f7,#f5f8ff)}.spotlight-editor p{font-size:13px;color:#52647b;margin:8px 0 0}.spotlight-editor input{accent-color:#087f86}';
document.head.append(spotlightStyle);
