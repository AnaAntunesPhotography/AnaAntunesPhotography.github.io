async function fetchJSON(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error('Failed to load '+path);
  return res.json();
}

function relativePath(...parts){
  return parts.join('/');
}

function setYear(){
  const el = document.getElementById('year');
  if(el) el.textContent = new Date().getFullYear();
}

function mountCarousel(images){
  const track = document.getElementById('carousel-track');
  if(!track) return;
  images.forEach(src=>{
    const img = document.createElement('img');
    img.src = src; img.loading='lazy';
    track.appendChild(img);
  });

  let index = 0;
  const total = images.length;
  const update = ()=> track.style.transform = `translateX(-${index*100}%)`;
  document.getElementById('prev').addEventListener('click',()=>{index=(index-1+total)%total;update();});
  document.getElementById('next').addEventListener('click',()=>{index=(index+1)%total;update();});
  setInterval(()=>{index=(index+1)%total;update()},5000);
}

function buildAlbumsGrid(albums, meta){
  const container = document.getElementById('albums');
  if(!container) return;
  container.innerHTML = '';
  Object.entries(albums).forEach(([name, images])=>{
    const a = document.createElement('a');
    a.className = 'album-tile';
    a.href = `album.html?album=${encodeURIComponent(name)}`;
    const thumb = document.createElement('img');
    thumb.className='album-thumb';
    thumb.src = images.length? images[0] : '';
    const t = document.createElement('div');
    t.className = 'album-title';
    // use meta title if available
    if(meta && meta[name] && meta[name].title) t.textContent = meta[name].title;
    else t.textContent = name.replace(/-/g,' ');
    const c = document.createElement('div'); c.className='album-count'; c.textContent = `${images.length} images`;
    a.appendChild(thumb); a.appendChild(t); a.appendChild(c);
    container.appendChild(a);
  });
}

function getQueryParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function mountGallery(images, albumTitle){
  const title = document.getElementById('album-title'); if(title) title.textContent = albumTitle;
  const container = document.getElementById('gallery'); if(!container) return;
  container.innerHTML = '';
  images.forEach(src=>{
    const img = document.createElement('img'); img.src = src; img.loading='lazy';
    img.addEventListener('click',()=> openLightbox(src));
    container.appendChild(img);
  });
}

// Lightbox carousel state
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(src, allImages = [src]){
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lb-img');
  if(!lb||!img) return;
  
  lightboxImages = allImages;
  lightboxIndex = allImages.indexOf(src);
  if(lightboxIndex === -1) lightboxIndex = 0;
  
  img.src = lightboxImages[lightboxIndex];
  lb.hidden = false;
  
  // show/hide nav buttons
  const prev = document.getElementById('lb-prev');
  const next = document.getElementById('lb-next');
  if(prev && next){
    prev.style.display = lightboxImages.length > 1 ? 'block' : 'none';
    next.style.display = lightboxImages.length > 1 ? 'block' : 'none';
  }
}

function closeLightbox(){
  const lb = document.getElementById('lightbox'); 
  if(!lb) return; 
  lb.hidden = true;
  lightboxImages = [];
  lightboxIndex = 0;
}

function lightboxPrev(){
  if(lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  const img = document.getElementById('lb-img');
  if(img) img.src = lightboxImages[lightboxIndex];
}

function lightboxNext(){
  if(lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  const img = document.getElementById('lb-img');
  if(img) img.src = lightboxImages[lightboxIndex];
}

document.addEventListener('click',(e)=>{
  if(e.target && e.target.id==='lb-close') closeLightbox();
  if(e.target && e.target.id==='lightbox') closeLightbox();
  if(e.target && e.target.id==='lb-prev') lightboxPrev();
  if(e.target && e.target.id==='lb-next') lightboxNext();
});

document.addEventListener('keydown',(e)=>{
  const lb = document.getElementById('lightbox');
  if(!lb || lb.hidden) return;
  if(e.key === 'Escape') closeLightbox();
  if(e.key === 'ArrowLeft') lightboxPrev();
  if(e.key === 'ArrowRight') lightboxNext();
});

async function init(){
  setYear();
  let albums = {};
  try{ albums = await fetchJSON('data/albums.json'); }catch(e){ console.warn(e); }

  // load selections for carousel and selected work
  let selections = {};
  try{ selections = await fetchJSON('data/selections.json'); }catch(e){ console.warn('No selections.json found', e); }
  // normalize albums data: support two formats in data/albums.json
  // - simple: "album-name": ["1.jpg", "2.jpg"]
  // - object: "album-name": { "title": "Display Name", "images": [ ... ] }
  const normalized = {};
  Object.entries(albums).forEach(([name, value])=>{
    if(Array.isArray(value)){
      normalized[name] = {
        title: name.replace(/-/g,' '),
        images: value
      };
    } else if(value && Array.isArray(value.images)){
      normalized[name] = {
        title: value.title || name.replace(/-/g,' '),
        images: value.images
      };
    } else {
      normalized[name] = { title: name.replace(/-/g,' '), images: [] };
    }
  });

  // home carousel (use selections -> front-page if present, fallback to albums front-page)
  if(document.getElementById('carousel-track')){
    const frontSel = selections['front-page'] && selections['front-page'].images ? selections['front-page'].images : null;
    const front = frontSel || ((normalized['front-page'] && normalized['front-page'].images) || []);
    const frontPaths = front.map(f=>relativePath('assets','images', frontSel ? 'selections' : 'albums', 'front-page', f));
    mountCarousel(frontPaths);
  }

  // albums listing
  if(document.getElementById('albums')){
    const gridData = {};
    Object.entries(normalized).forEach(([name, info])=>{
      gridData[name] = info.images.map(f=>relativePath('assets','images','albums',name,f));
    });
    buildAlbumsGrid(gridData, normalized);
  }

  // Selected work section on front page: use selections -> selected_work (if exists)
  if(document.getElementById('selected-work')){
    const selInfo = selections['selected_work'] || {};
    const imgs = (selInfo.images || []).map(f=>relativePath('assets','images','selections','selected_work', f));
    mountSelectedWork(imgs);
  }

  // album page
  if(document.getElementById('gallery')){
    const album = getQueryParam('album') || 'front-page';
    const info = normalized[album] || { title: album.replace(/-/g,' '), images: [] };
    const imgs = info.images.map(f=>relativePath('assets','images','albums',album,f));
    mountGallery(imgs, info.title);
  }
}

function mountSelectedWork(images){
  const container = document.getElementById('selected-work'); if(!container) return;
  container.innerHTML = '';
  images.forEach((src, idx)=>{
    const a = document.createElement('a');
    a.href = '#';
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      openLightbox(src, images);
    });
    const img = document.createElement('img'); img.src = src; img.loading='lazy'; img.className='selected-thumb';
    a.appendChild(img);
    container.appendChild(a);
  });
}

init();
