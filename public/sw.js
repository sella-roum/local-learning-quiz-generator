if(!self.define){let e,i={};const s=(s,c)=>(s=new URL(s+".js",c).href,i[s]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=s,e.onload=i,document.head.appendChild(e)}else e=s,importScripts(s),i()})).then((()=>{let e=i[s];if(!e)throw new Error(`Module ${s} didn’t register its module`);return e})));self.define=(c,a)=>{const n=e||("document"in self?document.currentScript.src:"")||location.href;if(i[n])return;let t={};const r=e=>s(e,n),f={module:{uri:n},exports:t,require:r};i[n]=Promise.all(c.map((e=>f[e]||r(e)))).then((e=>(a(...e),t)))}}define(["./workbox-00a24876"],(function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/app-build-manifest.json",revision:"fec1a19c4bacfc42c925fd6cc4c979ec"},{url:"/_next/static/5irA8XkvzfSSlNWNji1yX/_buildManifest.js",revision:"172e769da91baa11de9b258fb2d92f86"},{url:"/_next/static/5irA8XkvzfSSlNWNji1yX/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/_next/static/chunks/117-b8a48fcca674c221.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/169-a1f00bd1193fae47.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/202-71775d38e73cfecf.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/294-81b22810ef80410a.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/362-95a7ae634ffc98c6.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/41-cc8bb9ca37931bba.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/428-ebf37ee59664bf11.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/45-5c99cd3d6aabd329.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/506-26d44662acb99e96.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/685-6bae847d036d1ab9.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/75-248f1d8a21d0e1f8.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/762-fe0970ebff44905f.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/766-87adac64fb6d439d.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/826-3aece10109c44045.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/871-927dadca8ca85a68.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/946-6a91f834b4008f4f.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/96-327452828fd47660.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/9b0008ae-cfc373c52290c2a4.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/_not-found/page-887a6b78f334643d.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/document/page-2ef811d7cec4ca4d.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/files/%5BfileId%5D/page-2a2bf3b06ec3e082.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/files/page-2fcb4d52b1b12171.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/layout-8c489a394f859726.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/not-found-9bcde683c4fbba71.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/page-99073b60e3ce0c7f.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/play/history/page-48bd1a8cf676ce8f.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/play/page-c26ac12ca8ea6036.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/play/session/page-bdc60289b441e766.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/quizzes/%5BquizId%5D/edit/page-7271d87c25852980.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/quizzes/create-multi/page-eae5e9e8360f4de5.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/quizzes/create/page-c5481930c226d607.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/quizzes/page-e558da5cfcd9f93d.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/app/results/page-61d371d3bfa1b5fa.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/fd9d1056-2e53170be1945f01.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/framework-00a8ba1a63cfdc9e.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/main-4a43e4d455f6f082.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/main-app-ebef3bd91bb57e34.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/pages/_app-15e2daefa259f0b5.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/pages/_error-28b803cb2479b966.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-a2a70f98db82d3d5.js",revision:"5irA8XkvzfSSlNWNji1yX"},{url:"/_next/static/css/1ccc14ac3eb552d7.css",revision:"1ccc14ac3eb552d7"},{url:"/_next/static/css/48340cfe5c3cfec7.css",revision:"48340cfe5c3cfec7"},{url:"/_next/static/media/26a46d62cd723877-s.woff2",revision:"befd9c0fdfa3d8a645d5f95717ed6420"},{url:"/_next/static/media/55c55f0601d81cf3-s.woff2",revision:"43828e14271c77b87e3ed582dbff9f74"},{url:"/_next/static/media/581909926a08bbc8-s.woff2",revision:"f0b86e7c24f455280b8df606b89af891"},{url:"/_next/static/media/6d93bde91c0c2823-s.woff2",revision:"621a07228c8ccbfd647918f1021b4868"},{url:"/_next/static/media/97e0cb1ae144a2a9-s.woff2",revision:"e360c61c5bd8d90639fd4503c829c2dc"},{url:"/_next/static/media/a34f9d1faa5f3315-s.p.woff2",revision:"d4fe31e6a2aebc06b8d6e558c9141119"},{url:"/_next/static/media/df0a9ae256c0569c-s.woff2",revision:"d54db44de5ccb18886ece2fda72bdfe0"},{url:"/documents/document.md",revision:"758ee5c74e3c03243b85dc68a693556c"},{url:"/documents/images/files-fileId.png",revision:"6517a550c0ff47b4213a8ea324d22925"},{url:"/documents/images/files.png",revision:"f3add135b96ce4b2cedfc85445630a8e"},{url:"/documents/images/home.png",revision:"e1c3de8b01702dd1962c7e749e81f6db"},{url:"/documents/images/play-history.png",revision:"43c804d1663dda69f7dbd1ef1883f904"},{url:"/documents/images/play-session.png",revision:"9e2569056aae1625d4834c25d1586b39"},{url:"/documents/images/play.png",revision:"e16d986db22fd63f4f9571884662e89c"},{url:"/documents/images/quizzes-create-multi.png",revision:"8f2b43028c6b2621fffc49f422c596bc"},{url:"/documents/images/quizzes-create.png",revision:"856852d3e5df064afcd03c5c22ee37fe"},{url:"/documents/images/quizzes-quizId-edit.png",revision:"495be81d06a0f91c81b15abd673f6f11"},{url:"/documents/images/quizzes.png",revision:"b93293f80fabbd185c096942f2b093f9"},{url:"/documents/images/results.png",revision:"17e63ea5354a06dc7b58b26d1688b5ac"},{url:"/favicon.svg",revision:"562bd2666dd58c2a7e8dae144bafec96"},{url:"/file.svg",revision:"d09f95206c3fa0bb9bd9fefabfd0ea71"},{url:"/globe.svg",revision:"2aaafa6a49b6563925fe440891e32717"},{url:"/manifest.json",revision:"46207cbb55a460fafb2d2942b180deef"},{url:"/next.svg",revision:"8e061864f388b47f33a1c3780831193e"},{url:"/vercel.svg",revision:"c0af2f507b369b085b35ef4bbe3bcf1e"},{url:"/window.svg",revision:"a2760511c65806022ad20adf74370ff3"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:i,event:s,state:c})=>i&&"opaqueredirect"===i.type?new Response(i.body,{status:200,statusText:"OK",headers:i.headers}):i}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.CacheFirst({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.CacheFirst({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/documents\/.*\.md$/i,new e.CacheFirst({cacheName:"document-cache",plugins:[new e.ExpirationPlugin({maxEntries:10,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/.*/i,new e.NetworkFirst({cacheName:"others",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET")}));
