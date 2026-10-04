const home = document.querySelector('#home'), chat = document.querySelector('#chat'), messages = document.querySelector('#messages');
const question = document.querySelector('#question'), file = document.querySelector('#file'), preview = document.querySelector('#preview');
let sector = localStorage.farmAiSector || 'Agriculture', crop = localStorage.farmAiCrop || '', image = null;
let history = [];
let photoCheckMode = false;
let photoCheckImage = null;
const welcome = { Agriculture: 'Namaste! I’m FarmAI. What would you like help with today? You can ask in Telugu or English.', Horticulture: 'Let’s look after your plants. Tell me the crop, age, and what you are seeing.', Fisheries: 'Hello! Ask about pond water, fish feeding, or fish health. A clear photo helps.' };
function escapeText(text){ const el=document.createElement('div'); el.textContent=text; return el.innerHTML; }
function formatSmartDiagnosis(text){
  const patterns = [
    {key:'possible', re:/🔍\s*\*{0,2}\s*(?:సాధ్యమయ్యే సమస్య|Possible issue|संभावित समस्या)\s*\*{0,2}/i},
    {key:'observed', re:/👀\s*\*{0,2}\s*(?:నేను గమనించినవి|నేను ఏమి గమనిస్తున్నాను|What I can see|मैंने क्या देखा|मैं क्या देख रहा हूँ|मैं क्या देख रहा हूं|मैंने क्या देखा है)\s*[:：]?\s*\*{0,2}/i},
    {key:'why', re:/🧠\s*\*{0,2}\s*(?:ఎందుకు ఇలా ఉండవచ్చు\??|ఎందుకు ఇలా జరుగుతోంది\??|Why it may be happening\??|यह क्यों हो रहा है\??)\s*\*{0,2}/i},
    {key:'action', re:/🛠️\s*\*{0,2}\s*(?:ఇప్పుడు ఏమి చేయాలి\??|What to do now\??|अब क्या करें\??|अभी क्या करें\??)\s*\*{0,2}/i},
    {key:'monitor', re:/🛡️\s*\*{0,2}\s*(?:నివారణ\s*&\s*పర్యవేక్షణ|ఏమి గమనించాలి|Prevention\s*&\s*monitoring|रोकथाम और निगरानी|क्या निगरानी करें)\s*\*{0,2}/i},
    {key:'expert', re:/👨‍🌾\s*\*{0,2}\s*(?:ఎప్పుడు నిపుణులను సంప్రదించాలి\??|When to contact an expert\??|विशेषज्ञ से कब संपर्क करें\??)\s*\*{0,2}/i}
  ];

  const matches=[];

  patterns.forEach(({key,re})=>{
    const m=re.exec(text);
    if(m) matches.push({key,index:m.index,length:m[0].length,heading:m[0]});
  });

  matches.sort((a,b)=>a.index-b.index);

  if(matches.length < 2) return null;

  const result=[];
  const intro=text.slice(0,matches[0].index).trim();
  if(intro) result.push({type:'intro',text:intro});

  matches.forEach((match,i)=>{
    const next=matches[i+1];
    const content=text
      .slice(match.index+match.length,next ? next.index : text.length)
      .trim();

    result.push({
      type:'section',
      key:match.key,
      heading:match.heading.replace(/\*+/g,'').trim(),
      content
    });
  });

  return result;
}

function render(){
  messages.innerHTML='';
  const items=history.length?history:[{role:'assistant',text:welcome[sector]||welcome.Agriculture}];

  items.forEach(item=>{
    const e=document.createElement('div');
    e.className=`bubble ${item.role==='assistant'?'bot':'user'}`;

    if(item.role==='user' && item.photoCheckImage){
      const photo = document.createElement('img');
      photo.className = 'chat-photo-check-thumb';
      photo.src = `data:${item.photoCheckImage.mimeType};base64,${item.photoCheckImage.data}`;
      photo.alt = 'Photo checked by FarmAI';
      e.append(photo);
    }

    if(item.role==='assistant'){
      const diagnosis=formatSmartDiagnosis(item.text);

      if(diagnosis){
        e.classList.add('smart-diagnosis-message');

        diagnosis.forEach(part=>{
          if(part.type==='intro'){
            const intro=document.createElement('div');
            intro.className='diagnosis-intro';
            intro.textContent=part.text;
            e.append(intro);
            return;
          }

          const section=document.createElement('section');
          section.className=`diagnosis-section diagnosis-${part.key}`;

          const heading=document.createElement('div');
          heading.className='diagnosis-heading';
          heading.textContent=part.heading.replace(/\*\*/g,'');
          section.append(heading);

          const lines=part.content
  .split(/\n+/)
  .map(x=>x.replace(/\*\*/g,'').trim())
  .filter(Boolean);
          const bullets=lines.filter(x=>/^[-*•]/.test(x));

          if(bullets.length){
            const list=document.createElement('ul');
            list.className='diagnosis-list';

            bullets.forEach(line=>{
              const li=document.createElement('li');
              li.textContent=line.replace(/^[-*•]\s*/,'');
              list.append(li);
            });

            section.append(list);

            const paragraphs=lines.filter(x=>!/^[-*•]/.test(x));
            paragraphs.forEach(line=>{
              const p=document.createElement('p');
              p.textContent=line;
              section.append(p);
            });
          }else{
            const p=document.createElement('p');
            p.textContent=part.content;
            section.append(p);
          }

          e.append(section);
        });
      }else{
        e.textContent=item.text;
      }
    }else{
      e.textContent=item.text;
    }

    messages.append(e);
  });

  messages.scrollTop=messages.scrollHeight;
}
function save(){ localStorage.farmAiHistory=JSON.stringify(history.slice(-20)); localStorage.farmAiSector=sector; localStorage.farmAiCrop=crop; }
function openChat(next, detectedCrop=''){
  sector=next||sector;
  history=[];
  crop=detectedCrop||'';
  localStorage.removeItem('farmAiHistory');
  localStorage.removeItem('farmAiCrop');
  document.querySelector('#crop-sector-name').textContent=sector;
  document.querySelector('#sector-name').textContent=sector;
  document.querySelectorAll('.crop-option').forEach(item=>item.classList.remove('selected'));
  const cropSelect=document.querySelector('#crop-select');
  const animalProfile=document.querySelector('#animal-profile');
  const agricultureCrops=document.querySelector('#crop-options-agriculture');
  const horticultureCrops=document.querySelector('#crop-options-horticulture');

  if(agricultureCrops) agricultureCrops.hidden = sector !== 'Agriculture';
  if(horticultureCrops) horticultureCrops.hidden = sector !== 'Horticulture';

  if(['Agriculture','Horticulture'].includes(sector)){
    home.classList.remove('active');
    chat.classList.remove('active');
    if(animalProfile) animalProfile.classList.remove('active');
    cropSelect.classList.add('active');

    const detectedCropButton = crop
      ? Array.from(document.querySelectorAll('.crop-option'))
          .find(item =>
            item.dataset.crop &&
            item.dataset.crop.toLowerCase() === crop.toLowerCase()
          )
      : null;

    if (detectedCropButton) {
      detectedCropButton.classList.add('selected');
      document.querySelector('#crop-continue').disabled = false;
      save();
    } else {
      document.querySelector('#crop-continue').disabled = true;
    }
  }else if(['Fisheries','Livestock'].includes(sector)){
    home.classList.remove('active');
    chat.classList.remove('active');
    cropSelect.classList.remove('active');
    if(animalProfile){
      animalProfile.classList.add('active');
      document.querySelector('#animal-sector-name').textContent=sector;
      document.querySelector('#animal-profile-title').textContent=sector === 'Fisheries' ? 'Fish Farm Details' : 'Livestock Details';
      document.querySelector('#animal-profile-subtitle').textContent=sector === 'Fisheries' ? 'Tell us about your pond' : 'Tell us about your animals';
      document.querySelector('#fisheries-fields').hidden=sector !== 'Fisheries';
      document.querySelector('#livestock-fields').hidden=sector !== 'Livestock';
      document.querySelector('#animal-profile-continue').disabled=true;
    }
  }else{
    home.classList.remove('active');
    chat.classList.add('active');
    render();
    question.focus();
  }
}
document.querySelectorAll('[data-sector]').forEach(btn=>btn.addEventListener('click',()=>openChat(btn.dataset.sector)));
document.querySelectorAll('.crop-option').forEach(btn=>btn.addEventListener('click',()=>{
  crop=btn.dataset.crop;
  document.querySelectorAll('.crop-option').forEach(item=>item.classList.toggle('selected',item===btn));
  const continueBtn=document.querySelector('#crop-continue');
  if(continueBtn) continueBtn.disabled=false;
  save();
}));

document.querySelector('.crop-back').onclick=()=>{
  document.querySelector('#crop-select').classList.remove('active');
  home.classList.add('active');
};

document.querySelector('#crop-continue').onclick=()=>{
  if(!crop) return;
  document.querySelector('#crop-select').classList.remove('active');
  document.querySelector('#profile-sector-name').textContent=sector+' • '+crop;
  document.querySelector('#farm-profile').classList.add('active');
  document.querySelector('#profile-continue').disabled=true;
};

const cropStage=document.querySelector('#crop-stage');
const landArea=document.querySelector('#land-area');
const landUnit=document.querySelector('#land-unit');
const farmLocation=document.querySelector('#farm-location');
const profileContinue=document.querySelector('#profile-continue');

const fishType=document.querySelector('#fish-type');
const pondArea=document.querySelector('#pond-area');
const pondUnit=document.querySelector('#pond-unit');
const animalType=document.querySelector('#animal-type');
const animalCount=document.querySelector('#animal-count');
const animalLocation=document.querySelector('#animal-location');
const animalProfileContinue=document.querySelector('#animal-profile-continue');

function checkAnimalProfile(){
  if(!animalProfileContinue) return;
  if(sector==='Fisheries'){
    animalProfileContinue.disabled=!(fishType?.value && pondArea?.value && animalLocation?.value.trim());
  }else if(sector==='Livestock'){
    animalProfileContinue.disabled=!(animalType?.value && animalCount?.value && animalLocation?.value.trim());
  }
}

[fishType,pondArea,pondUnit,animalType,animalCount,animalLocation].forEach(el=>{
  if(el) el.addEventListener('input',checkAnimalProfile);
});
[fishType,pondUnit,animalType].forEach(el=>{
  if(el) el.addEventListener('change',checkAnimalProfile);
});

document.querySelector('.animal-profile-back').onclick=()=>{
  document.querySelector('#animal-profile').classList.remove('active');
  home.classList.add('active');
};

if(animalProfileContinue) animalProfileContinue.onclick=()=>{
  if(animalProfileContinue.disabled) return;

  localStorage.farmAiFishType=fishType?.value || '';
  localStorage.farmAiPondArea=pondArea?.value || '';
  localStorage.farmAiPondUnit=pondUnit?.value || 'Acres';
  localStorage.farmAiAnimalType=animalType?.value || '';
  localStorage.farmAiAnimalCount=animalCount?.value || '';
  localStorage.farmAiAnimalLocation=animalLocation?.value.trim() || '';

  document.querySelector('#animal-profile').classList.remove('active');
  chat.classList.add('active');
  document.querySelector('#sector-name').textContent=sector;
  render();
  question.focus();
};

function checkProfile(){
  profileContinue.disabled=!(cropStage.value && landArea.value && farmLocation.value.trim());
}

[cropStage,landArea,landUnit,farmLocation].forEach(el=>el&&el.addEventListener('input',checkProfile));
[cropStage,landUnit].forEach(el=>el&&el.addEventListener('change',checkProfile));

document.querySelector('.profile-back').onclick=()=>{
  document.querySelector('#farm-profile').classList.remove('active');
  document.querySelector('#crop-select').classList.add('active');
};

profileContinue.onclick=()=>{
  if(profileContinue.disabled) return;
  localStorage.farmAiCropStage=cropStage.value;
  localStorage.farmAiLandArea=landArea.value;
  localStorage.farmAiLandUnit=landUnit.value;
  localStorage.farmAiLocation=farmLocation.value.trim();

  document.querySelector('#farm-profile').classList.remove('active');
  chat.classList.add('active');
  document.querySelector('#sector-name').textContent=`${sector} • ${crop}`;
  render();
  question.focus();
};
document.querySelector('#chat .back').onclick=()=>{photoCheckMode=false;photoCheckImage=null;chat.classList.remove('active');home.classList.add('active')};
document.querySelector('#clear').onclick=()=>{history=[];photoCheckImage=null;image=null;photoCheckMode=false;save();render()};
const languageNames={
  te:'Telugu',
  en:'English',
  hi:'Hindi'
};

const languagePlaceholders={
  te:'మీ పంట గురించి అడగండి…',
  en:'Ask about your farm…',
  hi:'अपनी खेती के बारे में पूछें…'
};

let selectedLanguage=localStorage.farmAiLanguage || 'en';

function applyLanguage(){
  document.querySelectorAll('.language-option').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.language===selectedLanguage);
  });
  if(question) question.placeholder=languagePlaceholders[selectedLanguage] || languagePlaceholders.te;
}

document.querySelectorAll('.language-option').forEach(btn=>{
  btn.addEventListener('click',()=>{
    selectedLanguage=btn.dataset.language;
    localStorage.farmAiLanguage=selectedLanguage;
    applyLanguage();
  });
});

applyLanguage();
async function handleImageFile(selected){
  if(!selected)return;
  if(selected.size>5*1024*1024){
    alert('Please choose an image under 5 MB.');
    return;
  }
  const bytes=new Uint8Array(await selected.arrayBuffer());
  let binary='';
  for(let i=0;i<bytes.length;i+=8192){
    binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  }
  image={mimeType:selected.type,data:btoa(binary)};
  preview.querySelector('img').src=URL.createObjectURL(selected);
  preview.hidden=false;
}

file.onchange=async()=>{
  await handleImageFile(file.files[0]);
};

const cameraFile=document.querySelector('#camera-file');

if(cameraFile){
  cameraFile.onchange=async()=>{
    await handleImageFile(cameraFile.files[0]);
  };
}
preview.querySelector('button').onclick=()=>{image=null;file.value='';preview.hidden=true};
question.oninput=()=>{question.style.height='auto';question.style.height=Math.min(question.scrollHeight,110)+'px'};
document.querySelector('#composer').onsubmit=async event=>{event.preventDefault();const text=question.value.trim();if(!text&&!image)return;const previous=history.slice(-8);history.push({role:'user',text:text||(sector==='Fisheries'?'Please analyze this fish photo.':'Please analyze this photo.')});save();render();question.value='';question.style.height='auto';document.querySelector('#send').disabled=true;const typing=document.createElement('div');typing.className='typing';typing.innerHTML='<span class="farm-ai-pulse"></span><span class="farm-ai-pulse"></span><span class="farm-ai-pulse"></span><span class="farm-ai-status">FarmAI is checking…</span>';messages.append(typing);messages.scrollTop=messages.scrollHeight;try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
  message:text,
  image,
  history:previous,
  sector:photoCheckMode ? 'General' : sector,
  crop:photoCheckMode ? 'Other' : crop,
  photoCheck:photoCheckMode,
  cropStage:localStorage.farmAiCropStage || '',
  landArea:localStorage.farmAiLandArea || '',
  landUnit:localStorage.farmAiLandUnit || 'Acres',
  location:localStorage.farmAiLocation || '',
  language:selectedLanguage,
  languageName:languageNames[selectedLanguage] || 'Telugu',
  fishType:localStorage.farmAiFishType || '',
  pondArea:localStorage.farmAiPondArea || '',
  pondUnit:localStorage.farmAiPondUnit || 'Acres',
  animalType:localStorage.farmAiAnimalType || '',
  animalCount:localStorage.farmAiAnimalCount || '',
  animalLocation:localStorage.farmAiAnimalLocation || ''
})});const data=await r.json();if(!r.ok)throw Error(data.error);history.push({role:'assistant',text:data.answer});}catch(error){history.push({role:'assistant',text:`I couldn’t connect just now. ${error.message}`});}finally{image=null;file.value='';preview.hidden=true;document.querySelector('#send').disabled=false;save();render();}};
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister())));


// ---------- FarmAI moving sector indicator ----------
(function setupSectorIndicator(){
  const cards = [...document.querySelectorAll('.sector-card')];
  if(!cards.length) return;

  const parent = cards[0].parentElement;
  if(!parent) return;

  parent.classList.add('sector-list');

  const indicator = document.createElement('div');
  indicator.className = 'sector-active-indicator';
  parent.insertBefore(indicator, parent.firstChild);

  function moveIndicator(card){
    if(!card) return;

    const parentRect = parent.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    indicator.style.left = `${cardRect.left - parentRect.left}px`;
    indicator.style.top = `${cardRect.top - parentRect.top}px`;
    indicator.style.width = `${cardRect.width}px`;
    indicator.style.height = `${cardRect.height}px`;
    indicator.style.opacity = '1';
  }

  function updateIndicator(){
    const active = cards.find(card => card.classList.contains('active-card')) || cards[0];
    moveIndicator(active);
  }

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => moveIndicator(card));
    card.addEventListener('focus', () => moveIndicator(card));

    card.addEventListener('click', () => {
      requestAnimationFrame(updateIndicator);
    });
  });

  window.addEventListener('resize', updateIndicator);

  requestAnimationFrame(updateIndicator);
})();

// ---------- FarmAI sector page transition ----------
(function setupSectorTransition(){
  const overlay = document.querySelector('#farm-transition');
  const icon = document.querySelector('#farm-transition-icon');
  const text = document.querySelector('#farm-transition-text');

  if(!overlay) return;

  const sectorVisuals = {
    Agriculture: ['🌾', 'Opening Agriculture…'],
    Horticulture: ['🌱', 'Opening Horticulture…'],
    Fisheries: ['🐟', 'Opening Fisheries…'],
    Livestock: ['🐄', 'Opening Livestock…']
  };

  window.farmSectorTransition = function(nextSector, callback){
    const visual = sectorVisuals[nextSector] || ['🌱', 'Opening FarmAI…'];

    if(icon) icon.textContent = visual[0];
    if(text) text.textContent = visual[1];

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');

    setTimeout(() => {
      if(typeof callback === 'function') callback();

      document.querySelectorAll('.view.active').forEach(view => {
        view.classList.remove('sector-opening');
        void view.offsetWidth;
        view.classList.add('sector-opening');
      });

      setTimeout(() => {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
      }, 120);
    }, 360);
  };
})();


// ---------- FarmAI home page localization ----------
const homeTranslations = {
  en: {
    ask: 'Ask FarmAI',
    agriculture: 'Agriculture',
    agricultureSub: 'Crops & soil',
    horticulture: 'Horticulture',
    horticultureSub: 'Fruits & vegetables',
    fisheries: 'Fisheries',
    fisheriesSub: 'Fish • Prawns • Crabs',
    livestock: 'Livestock',
    livestockSub: 'Cattle • Buffalo • Goat • Sheep • Poultry',
    chooseSector: 'Choose your sector',
    chooseSectorSub: 'Select what you want help with'
  },
  te: {
    ask: 'Ask FarmAI • FarmAI ని అడగండి',
    agriculture: 'Agriculture • వ్యవసాయం',
    agricultureSub: 'Crops & soil • పంటలు & నేల',
    horticulture: 'Horticulture • ఉద్యానవనం',
    horticultureSub: 'Fruits & vegetables • పండ్లు & కూరగాయలు',
    fisheries: 'Fisheries • మత్స్య పరిశ్రమ',
    fisheriesSub: 'Fish • Prawns • Crabs • చేపలు • రొయ్యలు • పీతలు',
    livestock: 'Livestock • పశుపోషణ',
    livestockSub: 'Cattle • Buffalo • Goat • Sheep • Poultry • పశువులు • మేకలు • గొర్రెలు • కోళ్లు',
    chooseSector: 'Choose your sector • మీ రంగాన్ని ఎంచుకోండి',
    chooseSectorSub: 'Select what you want help with • మీకు కావాల్సిన సహాయాన్ని ఎంచుకోండి'
  },
  hi: {
    ask: 'Ask FarmAI • FarmAI से पूछें',
    agriculture: 'Agriculture • कृषि',
    agricultureSub: 'Crops & soil • फसलें और मिट्टी',
    horticulture: 'Horticulture • बागवानी',
    horticultureSub: 'Fruits & vegetables • फल और सब्जियाँ',
    fisheries: 'Fisheries • मत्स्य पालन',
    fisheriesSub: 'Fish • Prawns • Crabs • मछली • झींगा • केकड़ा',
    livestock: 'Livestock • पशुपालन',
    livestockSub: 'Cattle • Buffalo • Goat • Sheep • Poultry • गाय • भैंस • बकरी • भेड़ • मुर्गी',
    chooseSector: 'Choose your sector • अपना क्षेत्र चुनें',
    chooseSectorSub: 'Select what you want help with • अपनी जरूरत की सहायता चुनें'
  }
};

function applyHomeLanguage(){
  const t = homeTranslations[selectedLanguage] || homeTranslations.en;

  const askButtons = document.querySelectorAll('.start');
  askButtons.forEach(el => {
    const b = el.querySelector('b');
    el.childNodes.forEach(node => {
      if(node.nodeType === 3 && node.textContent.trim()){
        node.textContent = ` ${t.ask} `;
      }
    });
    if(b) b.textContent = '→';
  });

  const cards = {
    Agriculture: ['agriculture','agricultureSub'],
    Horticulture: ['horticulture','horticultureSub'],
    Fisheries: ['fisheries','fisheriesSub'],
    Livestock: ['livestock','livestockSub']
  };

  document.querySelectorAll('.sector-card').forEach(card => {
    const key = card.dataset.sector;
    const values = cards[key];
    if(!values) return;

    const strong = card.querySelector('strong');
    const small = card.querySelector('small');

    if(strong) strong.textContent = t[values[0]];
    if(small) small.textContent = t[values[1]];
  });

  const headings = document.querySelectorAll('h1,h2');
  headings.forEach(el => {
    if(el.dataset.homeLocalized === 'true') return;

    const text = el.textContent.trim().toLowerCase();

    if(
      text.includes('choose your sector') ||
      text.includes('choose sector') ||
      text.includes('select your sector')
    ){
      el.dataset.homeLocalized = 'true';
      el.dataset.homeEnglish = el.textContent;
      el.textContent = t.chooseSector;
    }
  });

  document.querySelectorAll('.home-subtitle,.sector-subtitle').forEach(el => {
    if(!el.dataset.homeEnglish) el.dataset.homeEnglish = el.textContent;
    if(el.dataset.homeEnglish.toLowerCase().includes('select what you want')){
      el.textContent = t.chooseSectorSub;
    }
  });
}

document.querySelectorAll('.language-option').forEach(btn => {
  btn.addEventListener('click', () => {
    setTimeout(applyHomeLanguage, 0);
  });
});

applyHomeLanguage();



/* FarmAI — Fisheries & Livestock second-step selection */
(function setupAnimalSelectionPage(){
  const selectView = document.querySelector('#animal-select');
  if(!selectView) return;

  const title = document.querySelector('#animal-select-title');
  const sectorName = document.querySelector('#animal-select-sector');
  const subtitle = document.querySelector('#animal-select-subtitle');
  const help = document.querySelector('#animal-select-help');
  const fishOptions = document.querySelector('#fish-select-options');
  const livestockOptions = document.querySelector('#livestock-select-options');
  const continueBtn = document.querySelector('#animal-select-continue');
  const backBtn = document.querySelector('.animal-select-back');

  let selectedKind = '';
  let selectedValue = '';

  const labels = {
    te: {
      Fisheries: ['Fisheries • మత్స్య రంగం','చేప రకాన్ని ఎంచుకోండి','Select Fish Type','మీరు పెంచుతున్న చేపను ఎంచుకోండి'],
      Livestock: ['Livestock • పశుపోషణ','జంతువును ఎంచుకోండి','Select Animal','మీరు పెంచుతున్న జంతువును ఎంచుకోండి']
    },
    en: {
      Fisheries: ['Fisheries','Select Fish Type','Select Fish Type','Choose your fish type'],
      Livestock: ['Livestock','Select Animal','Select Animal','Choose your animal type']
    },
    hi: {
      Fisheries: ['Fisheries • मत्स्य पालन','मछली का प्रकार चुनें','Select Fish Type','अपनी मछली का प्रकार चुनें'],
      Livestock: ['Livestock • पशुपालन','पशु चुनें','Select Animal','अपना पशु प्रकार चुनें']
    }
  };

  window.openAnimalSelection = function(sector){
    selectedKind = sector === 'Fisheries' ? 'fish' : 'livestock';
    selectedValue = '';

    const lang = window.selectedLanguage || localStorage.farmAiLanguage || 'en';
    const t = labels[lang] || labels.en;
    const data = t[sector] || t.Fisheries;

    sectorName.textContent = data[0];
    subtitle.textContent = data[1];
    title.textContent = data[2];
    help.textContent = data[3];

    fishOptions.hidden = selectedKind !== 'fish';
    livestockOptions.hidden = selectedKind !== 'livestock';
    continueBtn.disabled = true;

    document.querySelectorAll('.animal-option').forEach(x=>x.classList.remove('selected'));

    if(typeof window.showView === 'function'){
      window.showView('animal-select');
    }else{
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      selectView.classList.add('active');
    }
  };

  document.querySelectorAll('.animal-option').forEach(option=>{
    option.addEventListener('click',()=>{
      // Only select thumbnails belonging to the currently visible category.
      const visibleOptions = selectedKind === 'fish'
        ? fishOptions.querySelectorAll('.animal-option')
        : livestockOptions.querySelectorAll('.animal-option');

      visibleOptions.forEach(x=>x.classList.remove('selected'));
      document.querySelectorAll('.animal-option').forEach(x=>x.classList.remove('selected'));
      option.classList.add('selected');
      selectedValue = option.dataset.value || '';
      continueBtn.disabled = !selectedValue;
    });
  });

  continueBtn.addEventListener('click',()=>{
    if(!selectedValue) return;

    if(selectedKind === 'fish'){
      localStorage.farmAiFishType = selectedValue;
      localStorage.farmAiSector = 'Fisheries';
    }else{
      localStorage.farmAiAnimalType = selectedValue;
      localStorage.farmAiSector = 'Livestock';
    }

    if(typeof window.showView === 'function'){
      window.showView('animal-profile');
    }else{
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      document.querySelector('#animal-profile')?.classList.add('active');
    }

    const animalSector = document.querySelector('#animal-sector-name');
    const animalTitle = document.querySelector('#animal-profile-title');
    if(animalSector) animalSector.textContent = selectedKind === 'fish' ? 'Fisheries • మత్స్య రంగం' : 'Livestock • పశుపోషణ';
    if(animalTitle) animalTitle.textContent = selectedKind === 'fish' ? 'Fisheries Details • మత్స్య వివరాలు' : 'Livestock Details • పశుపోషణ వివరాలు';

    if(typeof window.updateAnimalProfile === 'function'){
      window.updateAnimalProfile();
    }
  });

  backBtn?.addEventListener('click',(event)=>{
    event.preventDefault();
    event.stopPropagation();

    // Always return from Fisheries/Livestock selection to Home.
    document.querySelectorAll('.view').forEach(v=>{
      v.classList.remove('active');
      v.classList.remove('sector-opening');
    });

    const home=document.querySelector('#home');
    if(home){
      home.classList.add('active');
    }else{
      const first=document.querySelector('.view');
      if(first) first.classList.add('active');
    }

    localStorage.removeItem('farmAiFishType');
    localStorage.removeItem('farmAiAnimalType');

    window.scrollTo({top:0,behavior:'smooth'});
  });

  /* Capture sector selection before the old generic sector handler */
  document.addEventListener('click',(event)=>{
    const card = event.target.closest('.sector-card[data-sector]');
    if(!card) return;

    const sector = card.dataset.sector;
    if(sector !== 'Fisheries' && sector !== 'Livestock') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if(typeof window.farmSectorTransition === 'function'){
      window.farmSectorTransition(sector,()=>window.openAnimalSelection(sector));
    }else{
      window.openAnimalSelection(sector);
    }
  }, true);
})();

try {
  Object.defineProperty(window, 'selectedLanguage', {
    configurable: true,
    get: () => selectedLanguage
  });
} catch(e) {}


/* =========================================================
   FARMAI_GLOBAL_LANGUAGE_SYSTEM
   One language system for every page.
   English = default
   Telugu = English + Telugu
   Hindi = English + Hindi
   ========================================================= */
(function FARMAI_GLOBAL_LANGUAGE_SYSTEM(){

  const T={
    en:{
      home:{
        ask:'Ask FarmAI',
        choose:'Choose your sector',
        chooseSub:'Select your farming area to get better guidance',
        ag:'Agriculture', agSub:'Crops & soil',
        hor:'Horticulture', horSub:'Fruits & vegetables',
        fish:'Fisheries', fishSub:'Fish • Prawns • Crabs',
        live:'Livestock', liveSub:'Cattle • Buffalo • Goat • Sheep • Poultry'
      },
      common:{
        back:'Back',
        continue:'Continue',
        location:'Location',
        village:'Village / District / State',
        remove:'Remove',
        upload:'Upload a photo',
        camera:'Capture with camera',
        askFarm:'Ask about your farm…',
        checking:'FarmAI is checking…'
      },
      farm:{
        details:'Farm Details',
        better:'Better guidance for your farm',
        stage:'Crop Stage',
        area:'Land Area',
        unit:'Unit',
        selectStage:'Select crop stage',
        selectFish:'Select fish type',
        pondArea:'Pond Area',
        fishType:'Fish Type',
        animalType:'Animal Type',
        animalCount:'Number of Animals',
        selectAnimal:'Select animal',
        acres:'Acres',
        guntas:'Guntas',
        hectares:'Hectares'
      }
    },

    te:{
      home:{
        ask:'Ask FarmAI • FarmAIని అడగండి',
        choose:'Choose your sector • మీ రంగాన్ని ఎంచుకోండి',
        chooseSub:'Select your farming area to get better guidance • మెరుగైన సలహా కోసం మీ వ్యవసాయ రంగాన్ని ఎంచుకోండి',
        ag:'Agriculture • వ్యవసాయం', agSub:'Crops & soil • పంటలు & నేల',
        hor:'Horticulture • ఉద్యానవనం', horSub:'Fruits & vegetables • పండ్లు & కూరగాయలు',
        fish:'Fisheries • మత్స్య రంగం', fishSub:'Fish • Prawns • Crabs • చేపలు • రొయ్యలు • పీతలు',
        live:'Livestock • పశుపోషణ', liveSub:'Cattle • Buffalo • Goat • Sheep • Poultry • పశువులు • మేకలు • గొర్రెలు • కోళ్లు'
      },
      common:{
        back:'Back • వెనక్కి',
        continue:'Continue • కొనసాగించండి',
        location:'Location • ప్రాంతం',
        village:'Village / District / State • గ్రామం / జిల్లా / రాష్ట్రం',
        remove:'Remove • తొలగించండి',
        upload:'Upload a photo • ఫోటో అప్లోడ్ చేయండి',
        camera:'Capture with camera • కెమెరాతో ఫోటో తీయండి',
        askFarm:'Ask about your farm… • మీ పొలం గురించి అడగండి…',
        checking:'FarmAI is checking… • FarmAI పరిశీలిస్తోంది…'
      },
      farm:{
        details:'Farm Details • పొలం వివరాలు',
        better:'Better guidance for your farm • మీ పొలానికి మెరుగైన సలహా',
        stage:'Crop Stage • పంట దశ',
        area:'Land Area • భూమి విస్తీర్ణం',
        unit:'Unit • యూనిట్',
        selectStage:'Select crop stage • పంట దశను ఎంచుకోండి',
        selectFish:'Select fish type • చేప రకాన్ని ఎంచుకోండి',
        pondArea:'Pond Area • చెరువు విస్తీర్ణం',
        fishType:'Fish Type • చేప రకం',
        animalType:'Animal Type • జంతువు రకం',
        animalCount:'Number of Animals • జంతువుల సంఖ్య',
        selectAnimal:'Select animal • జంతువును ఎంచుకోండి',
        acres:'Acres • ఎకరాలు',
        guntas:'Guntas • గుంటలు',
        hectares:'Hectares • హెక్టార్లు'
      }
    },

    hi:{
      home:{
        ask:'Ask FarmAI • FarmAI से पूछें',
        choose:'Choose your sector • अपना क्षेत्र चुनें',
        chooseSub:'Select your farming area to get better guidance • बेहतर सलाह के लिए अपना कृषि क्षेत्र चुनें',
        ag:'Agriculture • कृषि', agSub:'Crops & soil • फसलें और मिट्टी',
        hor:'Horticulture • बागवानी', horSub:'Fruits & vegetables • फल और सब्जियां',
        fish:'Fisheries • मत्स्य पालन', fishSub:'Fish • Prawns • Crabs • मछली • झींगा • केकड़े',
        live:'Livestock • पशुपालन', liveSub:'Cattle • Buffalo • Goat • Sheep • Poultry • गाय • भैंस • बकरी • भेड़ • मुर्गी'
      },
      common:{
        back:'Back • वापस',
        continue:'Continue • जारी रखें',
        location:'Location • स्थान',
        village:'Village / District / State • गांव / जिला / राज्य',
        remove:'Remove • हटाएं',
        upload:'Upload a photo • फोटो अपलोड करें',
        camera:'Capture with camera • कैमरे से फोटो लें',
        askFarm:'Ask about your farm… • अपने खेत के बारे में पूछें…',
        checking:'FarmAI is checking… • FarmAI जांच कर रहा है…'
      },
      farm:{
        details:'Farm Details • खेत की जानकारी',
        better:'Better guidance for your farm • आपके खेत के लिए बेहतर सलाह',
        stage:'Crop Stage • फसल की अवस्था',
        area:'Land Area • भूमि क्षेत्र',
        unit:'Unit • इकाई',
        selectStage:'Select crop stage • फसल की अवस्था चुनें',
        selectFish:'Select fish type • मछली का प्रकार चुनें',
        pondArea:'Pond Area • तालाब का क्षेत्र',
        fishType:'Fish Type • मछली का प्रकार',
        animalType:'Animal Type • पशु का प्रकार',
        animalCount:'Number of Animals • पशुओं की संख्या',
        selectAnimal:'Select animal • पशु चुनें',
        acres:'Acres • एकड़',
        guntas:'Guntas • गुंटा',
        hectares:'Hectares • हेक्टेयर'
      }
    }
  };

  function getLang(){
    return localStorage.farmAiLanguage || 'en';
  }

  function setText(el,value){
    if(el && value) el.textContent=value;
  }

  function translateAll(){
    const lang=getLang();
    const d=T[lang] || T.en;

    /* HOME */
    setText(document.querySelector('#ask-title'),d.home.ask);
    setText(document.querySelector('#choose-sector-title'),d.home.choose);
    setText(document.querySelector('#choose-sector-subtitle'),d.home.chooseSub);

    const sectors={
      Agriculture:['ag','agSub'],
      Horticulture:['hor','horSub'],
      Fisheries:['fish','fishSub'],
      Livestock:['live','liveSub']
    };

    document.querySelectorAll('.sector-card[data-sector]').forEach(card=>{
      const key=card.dataset.sector;
      const vals=sectors[key];
      if(!vals) return;
      setText(card.querySelector('strong'),d.home[vals[0]]);
      setText(card.querySelector('small'),d.home[vals[1]]);
    });

    /* COMMON BUTTONS */
    document.querySelectorAll('.profile-continue').forEach(btn=>{
      const b=btn.querySelector('b');
      btn.childNodes.forEach(n=>{
        if(n.nodeType===3 && n.textContent.trim()) n.textContent=' '+d.common.continue+' ';
      });
      if(b) b.textContent='→';
    });

    document.querySelectorAll('.back').forEach(btn=>{
      if(!btn.querySelector('svg') && !btn.querySelector('img')) {
        btn.setAttribute('aria-label',d.common.back);
      }
    });

    /* UPLOAD / CAMERA */
    const fileLabel=document.querySelector('.attach[title="Upload a photo"]');
    const cameraLabel=document.querySelector('.camera-capture');
    if(fileLabel) fileLabel.title=d.common.upload;
    if(cameraLabel) cameraLabel.title=d.common.camera;

    /* CHAT INPUT */
    const question=document.querySelector('#question');
    if(question) question.placeholder=d.common.askFarm;

    /* ANIMAL PROFILE */
    const animalTitle=document.querySelector('#animal-profile-title');
    const animalSubtitle=document.querySelector('#animal-profile-subtitle');
    if(animalTitle) animalTitle.textContent=d.farm.details;
    if(animalSubtitle) animalSubtitle.textContent=d.farm.better;

    /* FARM PROFILE LABELS — match labels by their stable input/select ids */
    const labelMap={
      '#location':d.common.location,
      '#animal-location':d.common.location,
      '#land-area':d.farm.area,
      '#area':d.farm.area,
      '#pond-area':d.farm.pondArea,
      '#fish-type':d.farm.fishType,
      '#animal-type':d.farm.animalType,
      '#animal-count':d.farm.animalCount
    };

    Object.entries(labelMap).forEach(([selector,text])=>{
      const input=document.querySelector(selector);
      if(!input) return;
      const label=input.closest('label');
      if(label) label.childNodes[0].textContent=text+' ';
      const previous=input.previousElementSibling;
      if(previous && previous.classList.contains('profile-label')) previous.textContent=text;
    });

    /* Generic known profile labels */
    document.querySelectorAll('.profile-label').forEach(label=>{
      const raw=label.textContent.trim();
      const map={
        'Crop Stage':d.farm.stage,
        'Crop Stage • పంట దశ':d.farm.stage,
        'Crop Stage • फसल की अवस्था':d.farm.stage,
        'Land Area':d.farm.area,
        'Land Area • భూమి విస్తీర్ణం':d.farm.area,
        'Land Area • भूमि क्षेत्र':d.farm.area,
        'Location':d.common.location,
        'Location • ప్రాంతం':d.common.location,
        'Location • स्थान':d.common.location,
        'Fish Type • చేప రకం':d.farm.fishType,
        'Fish Type • मछली का प्रकार':d.farm.fishType,
        'Pond Area • చెరువు విస్తీర్ణం':d.farm.pondArea,
        'Pond Area • तालाब का क्षेत्र':d.farm.pondArea,
        'Animal Type • జంతువు రకం':d.farm.animalType,
        'Animal Type • पशु का प्रकार':d.farm.animalType,
        'Number of Animals • జంతువుల సంఖ్య':d.farm.animalCount,
        'Number of Animals • पशुओं की संख्या':d.farm.animalCount
      };
      if(map[raw]) label.textContent=map[raw];
    });

    /* UNIT SELECTS */
    document.querySelectorAll('#land-unit option,#pond-unit option').forEach(opt=>{
      const raw=opt.textContent.trim();
      if(raw==='Acres' || raw.includes('ఎకరాలు') || raw.includes('एकड़')) opt.textContent=d.farm.acres;
      if(raw==='Guntas' || raw.includes('గుంటలు') || raw.includes('गुंटा')) opt.textContent=d.farm.guntas;
      if(raw==='Hectares' || raw.includes('హెక్టార్లు') || raw.includes('हेक्टेयर')) opt.textContent=d.farm.hectares;
    });

    /* WAITING MESSAGE */
    document.querySelectorAll('.farm-ai-status').forEach(el=>{
      el.textContent=d.common.checking;
    });

    /* SECOND PAGES — preserve the currently visible category */
    if(typeof window.applySecondPageLanguage==='function'){
      window.applySecondPageLanguage();
    }
  }

  window.farmAiApplyLanguage=translateAll;

  /* Language buttons */
  document.querySelectorAll('.language-option').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const next=btn.dataset.language;
      if(!T[next]) return;
      localStorage.farmAiLanguage=next;

      document.querySelectorAll('.language-option').forEach(x=>{
        x.classList.toggle('active',x.dataset.language===next);
      });

      requestAnimationFrame(()=>{
        translateAll();
      });
    });
  });

  /* Observe page changes so page 3/details also gets translated automatically. */
  const observer=new MutationObserver(()=>{
    if(!window.__farmAiLanguageApplying){
      window.__farmAiLanguageApplying=true;
      requestAnimationFrame(()=>{
        translateAll();
        window.__farmAiLanguageApplying=false;
      });
    }
  });

  document.querySelectorAll('.view').forEach(view=>{
    observer.observe(view,{
      attributes:true,
      attributeFilter:['class','hidden']
    });
  });

  /* Initial language */
  translateAll();

})();





/* =========================================================
   FARMAI_AUTHORITATIVE_LANGUAGE
   One language state for Home + Page 2 + Page 3 + Chat.
   ========================================================= */
(function FARMAI_AUTHORITATIVE_LANGUAGE(){

  const LANG=['en','te','hi'];

  const TEXT={
    en:{
      crop:{
        Agriculture:'Agriculture',
        Horticulture:'Horticulture',
        title:'Choose your crop',
        sub:'Select a crop to continue'
      },
      farm:{
        title:'Farm Details',
        sub:'Better guidance for your farm',
        stage:'Crop Stage',
        area:'Land Area',
        location:'Location',
        stagePlaceholder:'Select crop stage',
        locationPlaceholder:'Village / District / State'
      },
      fish:{
        sector:'Fisheries',
        title:'Select Fish Type',
        sub:'Choose your fish type',
        details:'Fisheries Details',
        detailsSub:'Better guidance for your pond',
        type:'Fish Type',
        pond:'Pond Area',
        location:'Location'
      },
      live:{
        sector:'Livestock',
        title:'Select Animal',
        sub:'Choose your animal',
        details:'Livestock Details',
        detailsSub:'Better guidance for your animals',
        type:'Animal Type',
        count:'Number of Animals',
        location:'Location'
      },
      chat:{
        ready:'FarmAI is ready',
        clear:'Clear',
        upload:'Upload a photo',
        camera:'Capture with camera',
        placeholder:'Ask about your farm…',
        checking:'FarmAI is checking…'
      },
      common:{continue:'Continue',back:'Back'}
    },

    te:{
      crop:{
        Agriculture:'Agriculture • వ్యవసాయం',
        Horticulture:'Horticulture • ఉద్యానవనం',
        title:'Choose your crop • మీ పంటను ఎంచుకోండి',
        sub:'Select a crop to continue • కొనసాగించడానికి పంటను ఎంచుకోండి'
      },
      farm:{
        title:'Farm Details • పొలం వివరాలు',
        sub:'Better guidance for your farm • మీ పొలానికి మెరుగైన సలహా',
        stage:'Crop Stage • పంట దశ',
        area:'Land Area • భూమి విస్తీర్ణం',
        location:'Location • ప్రాంతం',
        stagePlaceholder:'Select crop stage • పంట దశను ఎంచుకోండి',
        locationPlaceholder:'Village / District / State • గ్రామం / జిల్లా / రాష్ట్రం'
      },
      fish:{
        sector:'Fisheries • మత్స్య రంగం',
        title:'Select Fish Type • చేప రకం ఎంచుకోండి',
        sub:'Choose your fish type • మీ చేప రకాన్ని ఎంచుకోండి',
        details:'Fisheries Details • మత్స్య వివరాలు',
        detailsSub:'Better guidance for your pond • మీ చెరువుకు మెరుగైన సలహా',
        type:'Fish Type • చేప రకం',
        pond:'Pond Area • చెరువు విస్తీర్ణం',
        location:'Location • ప్రాంతం'
      },
      live:{
        sector:'Livestock • పశుపోషణ',
        title:'Select Animal • జంతువును ఎంచుకోండి',
        sub:'Choose your animal • మీ జంతువును ఎంచుకోండి',
        details:'Livestock Details • పశుపోషణ వివరాలు',
        detailsSub:'Better guidance for your animals • మీ జంతువులకు మెరుగైన సలహా',
        type:'Animal Type • జంతువు రకం',
        count:'Number of Animals • జంతువుల సంఖ్య',
        location:'Location • ప్రాంతం'
      },
      chat:{
        ready:'FarmAI is ready • FarmAI సిద్ధంగా ఉంది',
        clear:'Clear • క్లియర్',
        upload:'Upload a photo • ఫోటో అప్లోడ్ చేయండి',
        camera:'Capture with camera • కెమెరాతో ఫోటో తీయండి',
        placeholder:'Ask about your farm… • మీ పొలం గురించి అడగండి…',
        checking:'FarmAI is checking… • FarmAI పరిశీలిస్తోంది…'
      },
      common:{continue:'Continue • కొనసాగించండి',back:'Back • వెనక్కి'}
    },

    hi:{
      crop:{
        Agriculture:'Agriculture • कृषि',
        Horticulture:'Horticulture • बागवानी',
        title:'Choose your crop • अपनी फसल चुनें',
        sub:'Select a crop to continue • आगे बढ़ने के लिए फसल चुनें'
      },
      farm:{
        title:'Farm Details • खेत की जानकारी',
        sub:'Better guidance for your farm • आपके खेत के लिए बेहतर सलाह',
        stage:'Crop Stage • फसल की अवस्था',
        area:'Land Area • भूमि क्षेत्र',
        location:'Location • स्थान',
        stagePlaceholder:'Select crop stage • फसल की अवस्था चुनें',
        locationPlaceholder:'Village / District / State • गांव / जिला / राज्य'
      },
      fish:{
        sector:'Fisheries • मत्स्य पालन',
        title:'Select Fish Type • मछली का प्रकार चुनें',
        sub:'Choose your fish type • अपनी मछली का प्रकार चुनें',
        details:'Fisheries Details • मत्स्य जानकारी',
        detailsSub:'Better guidance for your pond • आपके तालाब के लिए बेहतर सलाह',
        type:'Fish Type • मछली का प्रकार',
        pond:'Pond Area • तालाब का क्षेत्र',
        location:'Location • स्थान'
      },
      live:{
        sector:'Livestock • पशुपालन',
        title:'Select Animal • पशु चुनें',
        sub:'Choose your animal • अपना पशु चुनें',
        details:'Livestock Details • पशुपालन जानकारी',
        detailsSub:'Better guidance for your animals • आपके पशुओं के लिए बेहतर सलाह',
        type:'Animal Type • पशु का प्रकार',
        count:'Number of Animals • पशुओं की संख्या',
        location:'Location • स्थान'
      },
      chat:{
        ready:'FarmAI is ready • FarmAI तैयार है',
        clear:'Clear • साफ करें',
        upload:'Upload a photo • फोटो अपलोड करें',
        camera:'Capture with camera • कैमरे से फोटो लें',
        placeholder:'Ask about your farm… • अपने खेत के बारे में पूछें…',
        checking:'FarmAI is checking… • FarmAI जांच कर रहा है…'
      },
      common:{continue:'Continue • जारी रखें',back:'Back • वापस'}
    }
  };

  const CROP={
    te:{
      Rice:'Rice • వరి',Cotton:'Cotton • పత్తి',Maize:'Maize • మొక్కజొన్న',
      Groundnut:'Groundnut • వేరుశెనగ',Other:'Other • ఇతర',
      Tomato:'Tomato • టమాటా',Chilli:'Chilli • మిరప',Brinjal:'Brinjal • వంకాయ',
      Okra:'Okra • బెండ',Onion:'Onion • ఉల్లిపాయ',Mango:'Mango • మామిడి',
      Banana:'Banana • అరటి'
    },
    hi:{
      Rice:'Rice • धान',Cotton:'Cotton • कपास',Maize:'Maize • मक्का',
      Groundnut:'Groundnut • मूंगफली',Other:'Other • अन्य',
      Tomato:'Tomato • टमाटर',Chilli:'Chilli • मिर्च',Brinjal:'Brinjal • बैंगन',
      Okra:'Okra • भिंडी',Onion:'Onion • प्याज़',Mango:'Mango • आम',
      Banana:'Banana • केला'
    }
  };

  const ANIMAL={
    te:{
      Rohu:'Rohu • రోహు',Catla:'Catla • కట్లా',Mrigal:'Mrigal • మృగాల్',
      Tilapia:'Tilapia • తిలాపియా',Pangasius:'Pangasius • పంగాసియస్',
      'Prawns / Shrimp':'Prawns / Shrimp • రొయ్యలు',Crabs:'Crabs • పీతలు',
      Cow:'Cow • ఆవు',Buffalo:'Buffalo • గేదె',Goat:'Goat • మేక',
      Sheep:'Sheep • గొర్రె',Poultry:'Poultry • కోళ్లు',Other:'Other • ఇతర'
    },
    hi:{
      Rohu:'Rohu • रोहू',Catla:'Catla • कतला',Mrigal:'Mrigal • मृगल',
      Tilapia:'Tilapia • तिलापिया',Pangasius:'Pangasius • पंगासियस',
      'Prawns / Shrimp':'Prawns / Shrimp • झींगा',Crabs:'Crabs • केकड़े',
      Cow:'Cow • गाय',Buffalo:'Buffalo • भैंस',Goat:'Goat • बकरी',
      Sheep:'Sheep • भेड़',Poultry:'Poultry • मुर्गी पालन',Other:'Other • अन्य'
    }
  };

  function getLang(){
    const x=localStorage.getItem('farmAiLanguage');
    return LANG.includes(x) ? x : 'en';
  }

  function set(el,text){
    if(el && text!=null) el.textContent=text;
  }

  function header(){
    const lang=getLang();
    document.querySelectorAll('.language-option').forEach(btn=>{
      const active=btn.dataset.language===lang;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function translate(){
    const lang=getLang();
    const d=TEXT[lang];

    header();

    /* PAGE 2 — CROP */
    const ag=document.querySelector('#crop-options-agriculture');
    const hor=document.querySelector('#crop-options-horticulture');

    if(ag && !ag.hidden){
      set(document.querySelector('#crop-sector-name'),d.crop.Agriculture);
    }else if(hor && !hor.hidden){
      set(document.querySelector('#crop-sector-name'),d.crop.Horticulture);
    }

    set(
      document.querySelector('#crop-select .chat-head small'),
      d.crop.sub
    );

    document.querySelectorAll('#crop-options-agriculture .crop-option,#crop-options-horticulture .crop-option')
      .forEach(btn=>{
        const key=btn.dataset.crop;
        const span=btn.querySelector('span');
        if(span){
          span.textContent=lang==='en' ? key : (CROP[lang]?.[key] || key);
        }
      });

    set(document.querySelector('#crop-continue'),d.common.continue+' →');

    /* PAGE 3 — FARM DETAILS */
    set(document.querySelector('#farm-profile .section-title h2'),d.farm.title);
    set(document.querySelector('#farm-profile .section-title span'),d.farm.sub);

    document.querySelectorAll('#farm-profile .profile-label').forEach(label=>{
      const t=label.textContent.trim().toLowerCase();
      if(t.includes('crop stage')) label.textContent=d.farm.stage;
      else if(t.includes('land area')) label.textContent=d.farm.area;
      else if(t.includes('location')) label.textContent=d.farm.location;
    });

    const loc=document.querySelector('#farm-location');
    if(loc) loc.placeholder=d.farm.locationPlaceholder;

    /* FISH / ANIMAL PAGE 2 */
    const fish=document.querySelector('#fish-select-options');
    const livestock=document.querySelector('#livestock-select-options');

    if(fish && !fish.hidden){
      set(document.querySelector('#animal-select-sector'),d.fish.sector);
      set(document.querySelector('#animal-select-title'),d.fish.title);
      set(document.querySelector('#animal-select-help'),d.fish.sub);
    }

    if(livestock && !livestock.hidden){
      set(document.querySelector('#animal-select-sector'),d.live.sector);
      set(document.querySelector('#animal-select-title'),d.live.title);
      set(document.querySelector('#animal-select-help'),d.live.sub);
    }

    document.querySelectorAll('#fish-select-options .animal-option,#livestock-select-options .animal-option')
      .forEach(btn=>{
        const key=btn.dataset.value;
        const span=btn.querySelector('span');
        if(span) span.textContent=lang==='en' ? key : (ANIMAL[lang]?.[key] || key);
      });

    set(document.querySelector('#animal-select-continue'),d.common.continue+' →');

    /* FISH / LIVESTOCK DETAILS */
    const animalProfile=document.querySelector('#animal-profile');
    if(animalProfile){
      const isFish=fish && !fish.hidden;
      set(document.querySelector('#animal-profile-title'),isFish?d.fish.details:d.live.details);
      set(document.querySelector('#animal-profile-subtitle'),isFish?d.fish.detailsSub:d.live.detailsSub);

      document.querySelectorAll('#animal-profile .profile-label').forEach(label=>{
        const t=label.textContent.trim().toLowerCase();

        if(t.includes('fish type')){
          label.textContent=d.fish.type;
        }else if(t.includes('pond area')){
          label.textContent=d.fish.pond;
        }else if(t.includes('animal type')){
          label.textContent=d.live.type;
        }else if(t.includes('number of animals')){
          label.textContent=d.live.count;
        }else if(t.includes('location')){
          label.textContent=isFish?d.fish.location:d.live.location;
        }
      });
    }

    /* CHAT */
    set(document.querySelector('#chat .chat-head small'),d.chat.ready);
    set(document.querySelector('#clear'),d.chat.clear);

    const question=document.querySelector('#question');
    if(question) question.placeholder=d.chat.placeholder;

    const upload=document.querySelector('.attach:not(.camera-capture)');
    const camera=document.querySelector('.camera-capture');
    if(upload) upload.title=d.chat.upload;
    if(camera) camera.title=d.chat.camera;

    document.querySelectorAll('.farm-ai-status').forEach(x=>set(x,d.chat.checking));

    /* BACK BUTTONS */
    document.querySelectorAll('.back').forEach(btn=>{
      btn.setAttribute('aria-label',d.common.back);
      btn.title=d.common.back;
    });
  }

  /* Public function used by navigation */
  window.farmAiApplyLanguage=translate;
  window.applySecondPageLanguage=translate;

  /* Header click: persist first, then update everything */
  document.querySelectorAll('.language-option').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const lang=btn.dataset.language;
      if(!LANG.includes(lang)) return;

      localStorage.setItem('farmAiLanguage',lang);
      translate();

      /* Navigation handlers may run immediately after this */
      setTimeout(translate,20);
      setTimeout(translate,100);
      setTimeout(translate,300);
    });
  });

  /* Every view transition reapplies the SAME stored language */
  const observer=new MutationObserver(()=>{
    requestAnimationFrame(translate);
  });

  document.querySelectorAll('.view').forEach(view=>{
    observer.observe(view,{
      attributes:true,
      attributeFilter:['class','hidden']
    });
  });

  /* First load */
  if(!LANG.includes(localStorage.getItem('farmAiLanguage'))){
    localStorage.setItem('farmAiLanguage','en');
  }

  translate();

})();

/* =========================================================
   FARMAI_AUTHORITATIVE_LANGUAGE
   One language state for Home + Page 2 + Page 3 + Chat.
   ========================================================= */
(function FARMAI_AUTHORITATIVE_LANGUAGE(){

  const LANG=['en','te','hi'];

  const TEXT={
    en:{
      crop:{
        Agriculture:'Agriculture',
        Horticulture:'Horticulture',
        title:'Choose your crop',
        sub:'Select a crop to continue'
      },
      farm:{
        title:'Farm Details',
        sub:'Better guidance for your farm',
        stage:'Crop Stage',
        area:'Land Area',
        location:'Location',
        stagePlaceholder:'Select crop stage',
        locationPlaceholder:'Village / District / State'
      },
      fish:{
        sector:'Fisheries',
        title:'Select Fish Type',
        sub:'Choose your fish type',
        details:'Fisheries Details',
        detailsSub:'Better guidance for your pond',
        type:'Fish Type',
        pond:'Pond Area',
        location:'Location'
      },
      live:{
        sector:'Livestock',
        title:'Select Animal',
        sub:'Choose your animal',
        details:'Livestock Details',
        detailsSub:'Better guidance for your animals',
        type:'Animal Type',
        count:'Number of Animals',
        location:'Location'
      },
      chat:{
        ready:'FarmAI is ready',
        clear:'Clear',
        upload:'Upload a photo',
        camera:'Capture with camera',
        placeholder:'Ask about your farm…',
        checking:'FarmAI is checking…'
      },
      common:{continue:'Continue',back:'Back'}
    },

    te:{
      crop:{
        Agriculture:'Agriculture • వ్యవసాయం',
        Horticulture:'Horticulture • ఉద్యానవనం',
        title:'Choose your crop • మీ పంటను ఎంచుకోండి',
        sub:'Select a crop to continue • కొనసాగించడానికి పంటను ఎంచుకోండి'
      },
      farm:{
        title:'Farm Details • పొలం వివరాలు',
        sub:'Better guidance for your farm • మీ పొలానికి మెరుగైన సలహా',
        stage:'Crop Stage • పంట దశ',
        area:'Land Area • భూమి విస్తీర్ణం',
        location:'Location • ప్రాంతం',
        stagePlaceholder:'Select crop stage • పంట దశను ఎంచుకోండి',
        locationPlaceholder:'Village / District / State • గ్రామం / జిల్లా / రాష్ట్రం'
      },
      fish:{
        sector:'Fisheries • మత్స్య రంగం',
        title:'Select Fish Type • చేప రకం ఎంచుకోండి',
        sub:'Choose your fish type • మీ చేప రకాన్ని ఎంచుకోండి',
        details:'Fisheries Details • మత్స్య వివరాలు',
        detailsSub:'Better guidance for your pond • మీ చెరువుకు మెరుగైన సలహా',
        type:'Fish Type • చేప రకం',
        pond:'Pond Area • చెరువు విస్తీర్ణం',
        location:'Location • ప్రాంతం'
      },
      live:{
        sector:'Livestock • పశుపోషణ',
        title:'Select Animal • జంతువును ఎంచుకోండి',
        sub:'Choose your animal • మీ జంతువును ఎంచుకోండి',
        details:'Livestock Details • పశుపోషణ వివరాలు',
        detailsSub:'Better guidance for your animals • మీ జంతువులకు మెరుగైన సలహా',
        type:'Animal Type • జంతువు రకం',
        count:'Number of Animals • జంతువుల సంఖ్య',
        location:'Location • ప్రాంతం'
      },
      chat:{
        ready:'FarmAI is ready • FarmAI సిద్ధంగా ఉంది',
        clear:'Clear • క్లియర్',
        upload:'Upload a photo • ఫోటో అప్లోడ్ చేయండి',
        camera:'Capture with camera • కెమెరాతో ఫోటో తీయండి',
        placeholder:'Ask about your farm… • మీ పొలం గురించి అడగండి…',
        checking:'FarmAI is checking… • FarmAI పరిశీలిస్తోంది…'
      },
      common:{continue:'Continue • కొనసాగించండి',back:'Back • వెనక్కి'}
    },

    hi:{
      crop:{
        Agriculture:'Agriculture • कृषि',
        Horticulture:'Horticulture • बागवानी',
        title:'Choose your crop • अपनी फसल चुनें',
        sub:'Select a crop to continue • आगे बढ़ने के लिए फसल चुनें'
      },
      farm:{
        title:'Farm Details • खेत की जानकारी',
        sub:'Better guidance for your farm • आपके खेत के लिए बेहतर सलाह',
        stage:'Crop Stage • फसल की अवस्था',
        area:'Land Area • भूमि क्षेत्र',
        location:'Location • स्थान',
        stagePlaceholder:'Select crop stage • फसल की अवस्था चुनें',
        locationPlaceholder:'Village / District / State • गांव / जिला / राज्य'
      },
      fish:{
        sector:'Fisheries • मत्स्य पालन',
        title:'Select Fish Type • मछली का प्रकार चुनें',
        sub:'Choose your fish type • अपनी मछली का प्रकार चुनें',
        details:'Fisheries Details • मत्स्य जानकारी',
        detailsSub:'Better guidance for your pond • आपके तालाब के लिए बेहतर सलाह',
        type:'Fish Type • मछली का प्रकार',
        pond:'Pond Area • तालाब का क्षेत्र',
        location:'Location • स्थान'
      },
      live:{
        sector:'Livestock • पशुपालन',
        title:'Select Animal • पशु चुनें',
        sub:'Choose your animal • अपना पशु चुनें',
        details:'Livestock Details • पशुपालन जानकारी',
        detailsSub:'Better guidance for your animals • आपके पशुओं के लिए बेहतर सलाह',
        type:'Animal Type • पशु का प्रकार',
        count:'Number of Animals • पशुओं की संख्या',
        location:'Location • स्थान'
      },
      chat:{
        ready:'FarmAI is ready • FarmAI तैयार है',
        clear:'Clear • साफ करें',
        upload:'Upload a photo • फोटो अपलोड करें',
        camera:'Capture with camera • कैमरे से फोटो लें',
        placeholder:'Ask about your farm… • अपने खेत के बारे में पूछें…',
        checking:'FarmAI is checking… • FarmAI जांच कर रहा है…'
      },
      common:{continue:'Continue • जारी रखें',back:'Back • वापस'}
    }
  };

  const CROP={
    te:{
      Rice:'Rice • వరి',Cotton:'Cotton • పత్తి',Maize:'Maize • మొక్కజొన్న',
      Groundnut:'Groundnut • వేరుశెనగ',Other:'Other • ఇతర',
      Tomato:'Tomato • టమాటా',Chilli:'Chilli • మిరప',Brinjal:'Brinjal • వంకాయ',
      Okra:'Okra • బెండ',Onion:'Onion • ఉల్లిపాయ',Mango:'Mango • మామిడి',
      Banana:'Banana • అరటి'
    },
    hi:{
      Rice:'Rice • धान',Cotton:'Cotton • कपास',Maize:'Maize • मक्का',
      Groundnut:'Groundnut • मूंगफली',Other:'Other • अन्य',
      Tomato:'Tomato • टमाटर',Chilli:'Chilli • मिर्च',Brinjal:'Brinjal • बैंगन',
      Okra:'Okra • भिंडी',Onion:'Onion • प्याज़',Mango:'Mango • आम',
      Banana:'Banana • केला'
    }
  };

  const ANIMAL={
    te:{
      Rohu:'Rohu • రోహు',Catla:'Catla • కట్లా',Mrigal:'Mrigal • మృగాల్',
      Tilapia:'Tilapia • తిలాపియా',Pangasius:'Pangasius • పంగాసియస్',
      'Prawns / Shrimp':'Prawns / Shrimp • రొయ్యలు',Crabs:'Crabs • పీతలు',
      Cow:'Cow • ఆవు',Buffalo:'Buffalo • గేదె',Goat:'Goat • మేక',
      Sheep:'Sheep • గొర్రె',Poultry:'Poultry • కోళ్లు',Other:'Other • ఇతర'
    },
    hi:{
      Rohu:'Rohu • रोहू',Catla:'Catla • कतला',Mrigal:'Mrigal • मृगल',
      Tilapia:'Tilapia • तिलापिया',Pangasius:'Pangasius • पंगासियस',
      'Prawns / Shrimp':'Prawns / Shrimp • झींगा',Crabs:'Crabs • केकड़े',
      Cow:'Cow • गाय',Buffalo:'Buffalo • भैंस',Goat:'Goat • बकरी',
      Sheep:'Sheep • भेड़',Poultry:'Poultry • मुर्गी पालन',Other:'Other • अन्य'
    }
  };

  function getLang(){
    const x=localStorage.getItem('farmAiLanguage');
    return LANG.includes(x) ? x : 'en';
  }

  function set(el,text){
    if(el && text!=null) el.textContent=text;
  }

  function header(){
    const lang=getLang();
    document.querySelectorAll('.language-option').forEach(btn=>{
      const active=btn.dataset.language===lang;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function translate(){
    const lang=getLang();
    const d=TEXT[lang];

    header();

    /* PAGE 2 — CROP */
    const ag=document.querySelector('#crop-options-agriculture');
    const hor=document.querySelector('#crop-options-horticulture');

    if(ag && !ag.hidden){
      set(document.querySelector('#crop-sector-name'),d.crop.Agriculture);
    }else if(hor && !hor.hidden){
      set(document.querySelector('#crop-sector-name'),d.crop.Horticulture);
    }

    set(
      document.querySelector('#crop-select .chat-head small'),
      d.crop.sub
    );

    document.querySelectorAll('#crop-options-agriculture .crop-option,#crop-options-horticulture .crop-option')
      .forEach(btn=>{
        const key=btn.dataset.crop;
        const span=btn.querySelector('span');
        if(span){
          span.textContent=lang==='en' ? key : (CROP[lang]?.[key] || key);
        }
      });

    set(document.querySelector('#crop-continue'),d.common.continue+' →');

    /* PAGE 3 — FARM DETAILS */
    set(document.querySelector('#farm-profile .section-title h2'),d.farm.title);
    set(document.querySelector('#farm-profile .section-title span'),d.farm.sub);

    document.querySelectorAll('#farm-profile .profile-label').forEach(label=>{
      const t=label.textContent.trim().toLowerCase();
      if(t.includes('crop stage')) label.textContent=d.farm.stage;
      else if(t.includes('land area')) label.textContent=d.farm.area;
      else if(t.includes('location')) label.textContent=d.farm.location;
    });

    const loc=document.querySelector('#farm-location');
    if(loc) loc.placeholder=d.farm.locationPlaceholder;

    /* FISH / ANIMAL PAGE 2 */
    const fish=document.querySelector('#fish-select-options');
    const livestock=document.querySelector('#livestock-select-options');

    if(fish && !fish.hidden){
      set(document.querySelector('#animal-select-sector'),d.fish.sector);
      set(document.querySelector('#animal-select-title'),d.fish.title);
      set(document.querySelector('#animal-select-help'),d.fish.sub);
    }

    if(livestock && !livestock.hidden){
      set(document.querySelector('#animal-select-sector'),d.live.sector);
      set(document.querySelector('#animal-select-title'),d.live.title);
      set(document.querySelector('#animal-select-help'),d.live.sub);
    }

    document.querySelectorAll('#fish-select-options .animal-option,#livestock-select-options .animal-option')
      .forEach(btn=>{
        const key=btn.dataset.value;
        const span=btn.querySelector('span');
        if(span) span.textContent=lang==='en' ? key : (ANIMAL[lang]?.[key] || key);
      });

    set(document.querySelector('#animal-select-continue'),d.common.continue+' →');

    /* FISH / LIVESTOCK DETAILS */
    const animalProfile=document.querySelector('#animal-profile');
    if(animalProfile){
      const isFish=fish && !fish.hidden;
      set(document.querySelector('#animal-profile-title'),isFish?d.fish.details:d.live.details);
      set(document.querySelector('#animal-profile-subtitle'),isFish?d.fish.detailsSub:d.live.detailsSub);

      document.querySelectorAll('#animal-profile .profile-label').forEach(label=>{
        const t=label.textContent.trim().toLowerCase();

        if(t.includes('fish type')){
          label.textContent=d.fish.type;
        }else if(t.includes('pond area')){
          label.textContent=d.fish.pond;
        }else if(t.includes('animal type')){
          label.textContent=d.live.type;
        }else if(t.includes('number of animals')){
          label.textContent=d.live.count;
        }else if(t.includes('location')){
          label.textContent=isFish?d.fish.location:d.live.location;
        }
      });
    }

    /* CHAT */
    set(document.querySelector('#chat .chat-head small'),d.chat.ready);
    set(document.querySelector('#clear'),d.chat.clear);

    const question=document.querySelector('#question');
    if(question) question.placeholder=d.chat.placeholder;

    const upload=document.querySelector('.attach:not(.camera-capture)');
    const camera=document.querySelector('.camera-capture');
    if(upload) upload.title=d.chat.upload;
    if(camera) camera.title=d.chat.camera;

    document.querySelectorAll('.farm-ai-status').forEach(x=>set(x,d.chat.checking));

    /* BACK BUTTONS */
    document.querySelectorAll('.back').forEach(btn=>{
      btn.setAttribute('aria-label',d.common.back);
      btn.title=d.common.back;
    });
  }

  /* Public function used by navigation */
  window.farmAiApplyLanguage=translate;
  window.applySecondPageLanguage=translate;

  /* Header click: persist first, then update everything */
  document.querySelectorAll('.language-option').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const lang=btn.dataset.language;
      if(!LANG.includes(lang)) return;

      localStorage.setItem('farmAiLanguage',lang);
      translate();

      /* Navigation handlers may run immediately after this */
      setTimeout(translate,20);
      setTimeout(translate,100);
      setTimeout(translate,300);
    });
  });

  /* Every view transition reapplies the SAME stored language */
  const observer=new MutationObserver(()=>{
    requestAnimationFrame(translate);
  });

  document.querySelectorAll('.view').forEach(view=>{
    observer.observe(view,{
      attributes:true,
      attributeFilter:['class','hidden']
    });
  });

  /* First load */
  if(!LANG.includes(localStorage.getItem('farmAiLanguage'))){
    localStorage.setItem('farmAiLanguage','en');
  }

  translate();

})();


/* FARMAI_CROP_STAGE_LANGUAGE_FIX */
(function(){
  const cropStageTranslations = {
    en: {
      "": "Select crop stage",
      seedling: "Seed / Nursery",
      vegetative: "Vegetative growth",
      flowering: "Flowering",
      fruiting: "Fruit / Grain development",
      harvest: "Harvest stage"
    },
    te: {
      "": "పంట దశ ఎంచుకోండి",
      seedling: "విత్తనం / నర్సరీ",
      vegetative: "పెరుగుదల దశ",
      flowering: "పూత దశ",
      fruiting: "కాయ / గింజ అభివృద్ధి దశ",
      harvest: "కోత దశ"
    },
    hi: {
      "": "फसल की अवस्था चुनें",
      seedling: "बीज / नर्सरी",
      vegetative: "वानस्पतिक वृद्धि अवस्था",
      flowering: "फूल आने की अवस्था",
      fruiting: "फल / दाना विकास अवस्था",
      harvest: "कटाई की अवस्था"
    }
  };

  window.farmAiTranslateCropStage = function(){
    const select = document.querySelector('#crop-stage');
    if(!select) return;

    const lang = localStorage.getItem('farmAiLanguage') || 'en';
    const labels = cropStageTranslations[lang] || cropStageTranslations.en;
    const current = select.value;

    Array.from(select.options).forEach(option => {
      const key = option.value;
      if(Object.prototype.hasOwnProperty.call(labels, key)){
        option.textContent = labels[key];
      }
    });

    if(Array.from(select.options).some(o => o.value === current)){
      select.value = current;
    }
  };

  window.addEventListener('load', window.farmAiTranslateCropStage);

  document.addEventListener('click', function(event){
    const langBtn = event.target.closest('.language-option');
    if(langBtn){
      setTimeout(window.farmAiTranslateCropStage, 0);
      setTimeout(window.farmAiTranslateCropStage, 100);
      setTimeout(window.farmAiTranslateCropStage, 300);
    }
  });

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value){
    const result = originalSetItem(key, value);
    if(key === 'farmAiLanguage'){
      setTimeout(window.farmAiTranslateCropStage, 0);
    }
    return result;
  };

  setTimeout(window.farmAiTranslateCropStage, 0);
  setTimeout(window.farmAiTranslateCropStage, 300);
})();


/* PHOTO CHECK PAGE ROUTING */
(() => {
  const startBtn = document.querySelector('#home-photo-start');
  const photoPage = document.querySelector('#photo-check');
  const homePage = document.querySelector('#home');
  const tools = document.querySelector('#home-photo-tools');

  if (!startBtn || !photoPage || !homePage) return;

  startBtn.addEventListener('click', () => {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    photoPage.classList.add('active');

    if (tools) tools.hidden = true;
    startBtn.hidden = false;

    const messagesBox = document.querySelector('#photo-check-messages');
    if (messagesBox && !messagesBox.children.length) {
      messagesBox.innerHTML = `
        <div class="bubble bot">
          <b>🤖 FarmAI Photo Check</b><br>
          Upload a photo or take a photo. I’ll check what’s visible and connect farm-related images to the right FarmAI section automatically.
        </div>
      `;
    }
  });

  document.querySelector('.photo-check-back')?.addEventListener('click', () => {
    photoPage.classList.remove('active');
    homePage.classList.add('active');
  });
})();

/* HOME PHOTO CHECK START BUTTON */
(() => {
  const startBtn = document.querySelector('#home-photo-start');
  const tools = document.querySelector('#home-photo-tools');

  if (!startBtn || !tools) return;

  startBtn.addEventListener('click', () => {
    tools.hidden = false;
    startBtn.hidden = true;
  });
})();

/* UNIVERSAL HOME PHOTO CHECK */
(() => {
  const fileInput = document.querySelector('#home-photo-file');
  const cameraInput = document.querySelector('#home-camera-file');
  const preview = document.querySelector('#home-photo-preview');
  const previewImg = preview?.querySelector('img');
  const removeBtn = document.querySelector('#home-photo-remove');
  const analyzeBtn = document.querySelector('#home-photo-analyze');
  const box = document.querySelector('.home-photo-check');

  if (!fileInput || !analyzeBtn || !box) return;

  let homePhoto = null;

  async function loadHomePhoto(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image under 5 MB.');
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';

    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }

    homePhoto = {
      mimeType: file.type || 'image/jpeg',
      data: btoa(binary)
    };

    if (previewImg) previewImg.src = URL.createObjectURL(file);
    if (preview) preview.hidden = false;
    analyzeBtn.disabled = false;
  }

  fileInput.addEventListener('change', () => {
    loadHomePhoto(fileInput.files?.[0]);
  });

  cameraInput?.addEventListener('change', () => {
    loadHomePhoto(cameraInput.files?.[0]);
  });

  removeBtn?.addEventListener('click', () => {
    homePhoto = null;
    fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (preview) preview.hidden = true;
    analyzeBtn.disabled = true;
  });

  analyzeBtn.addEventListener('click', async () => {
    if (!homePhoto) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🔍 Checking...';

    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    chat.classList.add('active');

    messages.innerHTML = `
      <div class="photo-check-full-loading">
        <div class="scan-icon">
          🔍
          <span class="scan-ring"></span>
        </div>
        <div class="scan-text">
          FarmAI is analyzing<span class="scan-dots"></span>
        </div>
      </div>
    `;

    messages.scrollTop = messages.scrollHeight;

    try {
      const lang = localStorage.getItem('farmAiLanguage') || 'en';
      const languageName =
        lang === 'te' ? 'Telugu' :
        lang === 'hi' ? 'Hindi' :
        'English';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Analyze this photo as a Universal Photo Check. Identify what is visible and explain the useful information without assuming it is a farming image.',
          image: homePhoto,
          history: [],
          sector: 'General',
          crop: 'Other',
          cropStage: '',
          landArea: '',
          landUnit: 'Acres',
          location: '',
          language: lang,
          languageName,
          photoCheck: true,
          fishType: '',
          pondArea: '',
          pondUnit: 'Acres',
          animalType: '',
          animalCount: '',
          animalLocation: ''
        })
      });

      const data = await response.json();

      console.log('FarmAI Photo Check API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Photo check failed');
      }

      const answer = data.answer || data.reply || data.text || 'No result returned.';

      photoCheckMode = true;
      photoCheckImage = homePhoto;
      image = homePhoto;
      sector = 'General';
      crop = '';

      history = [
        {
          role: 'user',
          text: 'Please analyze this photo.',
          photoCheckImage: homePhoto
        },
        {
          role: 'assistant',
          text: answer
        }
      ];

      document.querySelector('#sector-name').textContent = 'Photo Check';

      save();
      render();
      question.focus();

    } catch (error) {
      messages.innerHTML = '';

      const errorBubble = document.createElement('div');
      errorBubble.className = 'bubble bot';
      errorBubble.textContent =
        `⚠️ ${error.message || 'Unable to analyze this photo.'}`;

      messages.append(errorBubble);

    } finally {
      analyzeBtn.disabled = !homePhoto;
      analyzeBtn.textContent = '🔍 Check Photo';
    }
  });
})();

/* DEDICATED FARM AI PHOTO CHECK */
(() => {
  const page = document.querySelector('#photo-check');
  const messagesBox = document.querySelector('#photo-check-messages');
  const fileInput = document.querySelector('#photo-check-file');
  const cameraInput = document.querySelector('#photo-check-camera');
  const preview = document.querySelector('#photo-check-preview');
  const previewImg = preview?.querySelector('img');
  const removeBtn = document.querySelector('#photo-check-remove');
  const form = document.querySelector('#photo-check-composer');
  const questionInput = document.querySelector('#photo-check-question');

  if (!page || !messagesBox || !fileInput || !form) return;

  let photo = null;

  async function loadPhoto(selected) {
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      alert('Please choose an image under 5 MB.');
      return;
    }

    const bytes = new Uint8Array(await selected.arrayBuffer());
    let binary = '';

    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }

    photo = {
      mimeType: selected.type || 'image/jpeg',
      data: btoa(binary)
    };

    if (previewImg) {
      previewImg.src = URL.createObjectURL(selected);
    }

    if (preview) preview.hidden = false;
  }

  fileInput.addEventListener('change', () => {
    loadPhoto(fileInput.files?.[0]);
  });

  cameraInput?.addEventListener('change', () => {
    loadPhoto(cameraInput.files?.[0]);
  });

  removeBtn?.addEventListener('click', () => {
    photo = null;
    fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (preview) preview.hidden = true;
  });

  document.querySelector('#photo-check-clear')?.addEventListener('click', () => {
    photo = null;
    fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (questionInput) questionInput.value = '';
    if (preview) preview.hidden = true;

    messagesBox.innerHTML = `
      <div class="bubble bot">
        <b>🤖 FarmAI Photo Check</b><br>
        Upload a photo or take a photo to start a new check.
      </div>
    `;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const text = questionInput?.value.trim() || '';

    if (!photo && !text) return;

    const currentPhoto = photo;

    messagesBox.innerHTML = `
      <div class="photo-check-full-loading">
        <div class="scan-icon">
          🔍
          <span class="scan-ring"></span>
        </div>
        <div class="scan-text">
          FarmAI is analyzing<span class="scan-dots"></span>
        </div>
      </div>
    `;

    messagesBox.scrollTop = messagesBox.scrollHeight;

    try {
      const lang = localStorage.getItem('farmAiLanguage') || 'en';

      const languageName =
        lang === 'te' ? 'Telugu' :
        lang === 'hi' ? 'Hindi' :
        'English';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text || 'Analyze this photo using FarmAI Photo Check.',
          image: currentPhoto,
          history: [],
          sector: 'General',
          crop: 'Other',
          cropStage: '',
          landArea: '',
          landUnit: 'Acres',
          location: '',
          language: lang,
          languageName,
          photoCheck: true,
          fishType: '',
          pondArea: '',
          pondUnit: 'Acres',
          animalType: '',
          animalCount: '',
          animalLocation: ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Photo check failed');
      }

      const answer =
        data.answer ||
        data.reply ||
        data.text ||
        'No result returned.';

      messagesBox.innerHTML = '';

      if (currentPhoto) {
        const photoBubble = document.createElement('div');
        photoBubble.className = 'bubble user photo-check-user';

        const img = document.createElement('img');
        img.className = 'chat-photo-check-thumb';
        img.src = `data:${currentPhoto.mimeType};base64,${currentPhoto.data}`;
        img.alt = 'Photo checked by FarmAI';

        photoBubble.append(img);
        messagesBox.append(photoBubble);
      }

      const resultBubble = document.createElement('div');
      resultBubble.className = 'bubble bot photo-check-result';

      const title = document.createElement('div');
      title.className = 'photo-check-result-title';
      title.textContent = '✨ FarmAI Photo Check Result';

      const resultText = document.createElement('div');
      resultText.className = 'photo-check-result-text';
      resultText.textContent = answer;

      resultBubble.append(title, resultText);
      messagesBox.append(resultBubble);

      messagesBox.scrollTop = messagesBox.scrollHeight;

      if (questionInput) {
        questionInput.value = '';
      }

      // Keep the submitted photo in the result history,
      // but remove the duplicate composer preview after sending.
      photo = null;
      if (fileInput) fileInput.value = '';
      if (cameraInput) cameraInput.value = '';
      if (preview) preview.hidden = true;

      if (data.route && typeof window.routeFarmAiPhotoCheck === 'function') {
        const detectedSector = String(data.route.sector || '').toLowerCase();

        if (['agriculture', 'horticulture', 'fisheries', 'livestock'].includes(detectedSector)) {
          setTimeout(() => {
            window.routeFarmAiPhotoCheck(data.route);
          }, 900);
          return;
        }
      }

      if (questionInput) {
        questionInput.focus();
      }

    } catch (error) {
      messagesBox.innerHTML = '';

      const errorBubble = document.createElement('div');
      errorBubble.className = 'bubble bot';
      errorBubble.textContent =
        `⚠️ ${error.message || 'Unable to analyze this photo.'}`;

      messagesBox.append(errorBubble);
    }
  });
})();

/* PHOTO CHECK AUTO ROUTING */
(() => {
  const originalPhotoCheckHandler = window.__farmAiPhotoCheckRouting;
  if (originalPhotoCheckHandler) return;

  window.__farmAiPhotoCheckRouting = true;

  window.routeFarmAiPhotoCheck = function(route) {
    if (!route || !route.sector) return;

    const sectorMap = {
      agriculture: 'Agriculture',
      horticulture: 'Horticulture',
      fisheries: 'Fisheries',
      livestock: 'Livestock'
    };

    const detectedSector = sectorMap[route.sector];

    if (!detectedSector) return;

    photoCheckMode = false;
    photoCheckImage = null;

    const photoPage = document.querySelector('#photo-check');
    if (photoPage) photoPage.classList.remove('active');

    const messagesBox = document.querySelector('#photo-check-messages');
    const preview = document.querySelector('#photo-check-preview');
    const fileInput = document.querySelector('#photo-check-file');
    const cameraInput = document.querySelector('#photo-check-camera');
    const questionInput = document.querySelector('#photo-check-question');

    if (messagesBox) messagesBox.innerHTML = '';
    if (preview) preview.hidden = true;
    if (fileInput) fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (questionInput) questionInput.value = '';

    if (typeof openChat === 'function') {
      openChat(detectedSector, route.crop || '');
    }
  };
})();
