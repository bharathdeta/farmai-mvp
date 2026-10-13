const home = document.querySelector('#home'), chat = document.querySelector('#chat'), messages = document.querySelector('#messages');
const question = document.querySelector('#question'), file = document.querySelector('#file'), preview = document.querySelector('#preview');
let sector = localStorage.farmAiSector || 'Agriculture', crop = localStorage.farmAiCrop || '', image = null;
let history = [];
let photoCheckMode = false;
let photoCheckImage = null;
const welcome = { Agriculture: 'Namaste! I’m FarmAI. Tell me your crop or farm problem in your own words. I will ask only the needed details one step at a time. You can type, speak, or send a photo.', Horticulture: 'Let’s look after your plants. Tell me the crop, age, and what you are seeing.', Fisheries: 'Hello! Ask about pond water, fish feeding, or fish health. A clear photo helps.' };
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
document.querySelectorAll('[data-sector]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.classList.contains('start')) return;
  openChat(btn.dataset.sector);
}));
document.querySelectorAll('.start').forEach(btn=>btn.addEventListener('click',()=>{
  sector='Agriculture'; crop='Other'; history=[];
  localStorage.farmAiSector=sector; localStorage.farmAiCrop=crop; localStorage.removeItem('farmAiHistory');
  document.querySelectorAll('.view.active').forEach(view=>view.classList.remove('active'));
  chat.classList.add('active'); document.querySelector('#sector-name').textContent='FarmAI'; render(); question.focus();
}));
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

/* LOCAL FEATURE LANGUAGE + VOICE CONTROLS */
(() => {
  const copy = {
    en: { myFarm:'My Farm', myFarmTitle:'Your farm, organised.', myFarmCopy:'Your information stays on this computer while we build FarmAI locally.', addFarm:'Add a farm', farmName:'Farm name', location:'Village / district', saveFarm:'Save farm', addField:'Which crop are you growing?', fieldHelp:'Tap a crop. You can add details later.', more:'Add more details (optional)', fieldName:'Field name', area:'Area', unit:'Unit', crop:'Your crop', stage:'Crop stage', saveField:'Save crop', delete:'Delete', voice:'🎙️ Speak symptoms', listen:'🔊 Listen', ask:'Ask FarmAI', doctor:'Crop Doctor', diary:'Crop Diary', weather:'Weather', reminders:'Reminders', assessment:'New assessment', seeing:'What are you seeing?', photo:'Add a photo (optional)', cropDoctor:'Ask Crop Doctor' },
    te: { myFarm:'నా పొలం', myFarmTitle:'మీ పొలాన్ని క్రమబద్ధంగా ఉంచండి.', myFarmCopy:'స్థానికంగా నిర్మిస్తున్నప్పుడు మీ సమాచారం ఈ కంప్యూటర్‌లోనే ఉంటుంది.', addFarm:'పొలం జోడించండి', farmName:'పొలం పేరు', location:'గ్రామం / జిల్లా', saveFarm:'పొలం సేవ్ చేయండి', addField:'మీరు ఏ పంట వేస్తున్నారు?', fieldHelp:'పంటను ట్యాప్ చేయండి. మిగతా వివరాలు తరువాత పెట్టవచ్చు.', more:'మరిన్ని వివరాలు జోడించండి (ఐచ్ఛికం)', fieldName:'ఫీల్డ్ పేరు', area:'విస్తీర్ణం', unit:'యూనిట్', crop:'మీ పంట', stage:'పంట దశ', saveField:'పంట సేవ్ చేయండి', delete:'తొలగించండి', voice:'🎙️ లక్షణాలు చెప్పండి', listen:'🔊 సమాధానం వినండి', ask:'FarmAIని అడగండి', doctor:'పంట డాక్టర్', diary:'పంట డైరీ', weather:'వాతావరణం', reminders:'రిమైండర్లు', assessment:'కొత్త పరిశీలన', seeing:'మీరు ఏమి చూస్తున్నారు?', photo:'ఫోటో జోడించండి (ఐచ్ఛికం)', cropDoctor:'పంట డాక్టర్‌ను అడగండి' },
    hi: { myFarm:'मेरा खेत', myFarmTitle:'अपने खेत को व्यवस्थित रखें।', myFarmCopy:'स्थानीय निर्माण के दौरान आपकी जानकारी इस कंप्यूटर पर रहती है।', addFarm:'खेत जोड़ें', farmName:'खेत का नाम', location:'गाँव / जिला', saveFarm:'खेत सहेजें', addField:'आप कौन सी फसल उगा रहे हैं?', fieldHelp:'फसल पर टैप करें। बाकी जानकारी बाद में जोड़ सकते हैं।', more:'और जानकारी जोड़ें (वैकल्पिक)', fieldName:'फील्ड का नाम', area:'क्षेत्रफल', unit:'इकाई', crop:'आपकी फसल', stage:'फसल की अवस्था', saveField:'फसल सहेजें', delete:'हटाएं', voice:'🎙️ लक्षण बोलें', listen:'🔊 उत्तर सुनें', ask:'FarmAI से पूछें', doctor:'फसल डॉक्टर', diary:'फसल डायरी', weather:'मौसम', reminders:'रिमाइंडर', assessment:'नया आकलन', seeing:'आप क्या देख रहे हैं?', photo:'फोटो जोड़ें (वैकल्पिक)', cropDoctor:'फसल डॉक्टर से पूछें' }
  };
  const lang = () => localStorage.farmAiLanguage || 'en';
  const optionCopy = {
    en: { units:['Acres','Guntas','Hectares'], stages:['Not sure yet','Seed / Nursery','Vegetative growth','Flowering','Fruit / Grain development','Harvest stage'], crops:['Rice','Cotton','Maize','Tomato','Chilli','Banana'], diary:['Select activity','Sowing / planting','Irrigation','Fertilizer','Plant protection','Field scouting','Labour','Harvest','Other'], reminder:['Irrigation','Crop check','Fertilizer','Plant protection','Harvest','Other'] },
    te: { units:['ఎకరాలు','గుంటలు','హెక్టార్లు'], stages:['ఇంకా తెలియదు','విత్తనం / నర్సరీ','ఆకుల పెరుగుదల','పుష్పించే దశ','పండు / ధాన్యం అభివృద్ధి','కోత దశ'], crops:['వరి','పత్తి','మొక్కజొన్న','టమాటా','మిరప','అరటి'], diary:['కార్యకలాపం ఎంచుకోండి','విత్తడం / నాటడం','నీటిపారుదల','ఎరువులు','పంట రక్షణ','పొలం పరిశీలన','కూలీ పని','కోత','ఇతర'], reminder:['నీటిపారుదల','పంట తనిఖీ','ఎరువులు','పంట రక్షణ','కోత','ఇతర'] },
    hi: { units:['एकड़','गुंटा','हेक्टेयर'], stages:['अभी पता नहीं','बीज / नर्सरी','वनस्पति वृद्धि','फूल आने की अवस्था','फल / अनाज विकास','कटाई की अवस्था'], crops:['धान','कपास','मक्का','टमाटर','मिर्च','केला'], diary:['गतिविधि चुनें','बुवाई / रोपाई','सिंचाई','उर्वरक','फसल सुरक्षा','खेत निरीक्षण','मजदूरी','कटाई','अन्य'], reminder:['सिंचाई','फसल जांच','उर्वरक','फसल सुरक्षा','कटाई','अन्य'] }
  };
  window.farmAiFeatureText = key => (copy[lang()] || copy.en)[key] || copy.en[key] || key;
  const set = (selector, key) => { const el = document.querySelector(selector); if (el) el.textContent = window.farmAiFeatureText(key); };
  const label = (selector, key) => { const el = document.querySelector(selector); if (el?.firstChild) el.firstChild.textContent = window.farmAiFeatureText(key); };
  const apply = () => {
    set('#my-farm .chat-head b', 'myFarm'); set('#my-farm-title', 'myFarmTitle'); set('#my-farm-copy', 'myFarmCopy');
    set('#farm-form-title', 'addFarm'); label('#farm-name-label', 'farmName'); label('#farm-location-label', 'location'); set('#farm-save', 'saveFarm');
    set('#field-form-title', 'addField'); set('#field-simple-help', 'fieldHelp'); set('#field-more-details', 'more'); label('#field-name-label', 'fieldName'); label('#field-area-label', 'area'); label('#field-unit-label', 'unit'); label('#field-crop-label', 'crop'); label('#field-stage-label', 'stage'); set('#field-save', 'saveField');
    set('#doctor-form-title', 'assessment'); label('#doctor-symptoms-label', 'seeing'); set('#doctor-voice', 'voice'); label('#doctor-photo-label', 'photo'); set('#crop-doctor-analyze', 'cropDoctor'); set('#listen-last-answer', 'listen');
    document.querySelectorAll('.field-card-actions .ask').forEach(el => el.textContent = window.farmAiFeatureText('ask'));
    document.querySelectorAll('.field-card-actions .doctor').forEach(el => el.textContent = window.farmAiFeatureText('doctor'));
    document.querySelectorAll('.field-card-actions .diary').forEach(el => el.textContent = window.farmAiFeatureText('diary'));
    document.querySelectorAll('.field-card-actions .weather').forEach(el => el.textContent = window.farmAiFeatureText('weather'));
    document.querySelectorAll('.field-card-actions .reminders').forEach(el => el.textContent = window.farmAiFeatureText('reminders'));
    const options = optionCopy[lang()] || optionCopy.en;
    const translateOptions = (selector, labels) => document.querySelectorAll(`${selector} option`).forEach((option, index) => { if (labels[index]) option.textContent = labels[index]; });
    translateOptions('#my-field-unit', options.units); translateOptions('#my-field-stage', options.stages); translateOptions('#diary-type', options.diary); translateOptions('#reminder-type', options.reminder);
    document.querySelectorAll('#quick-crops button span').forEach((item, index) => { if (options.crops[index]) item.textContent = options.crops[index]; });
  };
  const speak = text => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = { te:'te-IN', hi:'hi-IN', en:'en-IN' }[lang()] || 'en-IN'; window.speechSynthesis.speak(utterance);
  };
  const recorder = document.querySelector('#voice-recorder');
  const recorderTitle = document.querySelector('#voice-recorder-title');
  const recorderCopy = document.querySelector('#voice-recorder-copy');
  let activeRecognition = null;
  let activeVoiceButton = null;
  const stopVoice = () => { if (activeRecognition) activeRecognition.stop(); };
  const voiceInto = (input, button) => {
    if (activeRecognition) { stopVoice(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { alert('Voice input is not supported by this browser. Try Chrome.'); return; }
    const recognition = new Recognition(); recognition.lang = { te:'te-IN', hi:'hi-IN', en:'en-IN' }[lang()] || 'en-IN'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { activeRecognition = recognition; activeVoiceButton = button; button.classList.add('listening'); if (recorder) recorder.hidden = false; if (recorderTitle) recorderTitle.textContent = { te:'వింటున్నాను…', hi:'सुन रहा हूँ…', en:'Listening…' }[lang()] || 'Listening…'; if (recorderCopy) recorderCopy.textContent = { te:'మీరు పూర్తి చేసినప్పుడు మైక్‌ను మళ్లీ నొక్కండి.', hi:'पूरा होने पर माइक फिर दबाएं।', en:'Tap the microphone again when you finish.' }[lang()] || 'Tap the microphone again when you finish.'; };
    recognition.onend = () => { if (activeVoiceButton) activeVoiceButton.classList.remove('listening'); activeRecognition = null; activeVoiceButton = null; if (recorder) recorder.hidden = true; };
    recognition.onerror = () => { if (recorder) recorder.hidden = true; };
    recognition.onresult = event => { input.value = `${input.value ? `${input.value} ` : ''}${event.results[0][0].transcript}`; input.dispatchEvent(new Event('input', { bubbles: true })); };
    recognition.start();
  };
  window.farmAiVoiceInto = voiceInto;
  document.querySelectorAll('input[type="text"], textarea').forEach(input => {
    if (['question', 'crop-doctor-symptoms', 'photo-check-question'].includes(input.id)) return;
    const mic = document.createElement('button'); mic.type = 'button'; mic.className = 'input-voice'; mic.textContent = '🎙️'; mic.setAttribute('aria-label', 'Speak instead of typing');
    mic.addEventListener('click', () => voiceInto(input, mic)); input.insertAdjacentElement('afterend', mic);
  });
  document.querySelector('#voice-chat')?.addEventListener('click', () => voiceInto(document.querySelector('#question'), document.querySelector('#voice-chat')));
  document.querySelector('#doctor-voice')?.addEventListener('click', () => voiceInto(document.querySelector('#crop-doctor-symptoms'), document.querySelector('#doctor-voice')));
  document.querySelector('#voice-recorder-stop')?.addEventListener('click', stopVoice);
  document.querySelector('#listen-last-answer')?.addEventListener('click', () => speak([...history].reverse().find(item => item.role === 'assistant')?.text));
  document.querySelectorAll('.language-option').forEach(button => button.addEventListener('click', () => setTimeout(apply, 0)));
  apply();
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

/* MY FARM — local-first records. Cloud sync will replace this storage layer later. */
(() => {
  const storeKey = 'farmAiMyFarmV1';
  const view = document.querySelector('#my-farm');
  const homeView = document.querySelector('#home');
  const openButton = document.querySelector('#open-my-farm');
  const backButton = document.querySelector('#my-farm-back');
  const farmForm = document.querySelector('#farm-form');
  const fieldForm = document.querySelector('#field-form');
  const list = document.querySelector('#farm-list');
  const diaryView = document.querySelector('#crop-diary');
  const diaryForm = document.querySelector('#diary-form');
  const diaryList = document.querySelector('#diary-list');
  const diaryBack = document.querySelector('#crop-diary-back');
  const weatherView = document.querySelector('#farm-weather');
  const weatherBack = document.querySelector('#farm-weather-back');
  const weatherRefresh = document.querySelector('#weather-refresh');
  const weatherResult = document.querySelector('#weather-result');
  const remindersView = document.querySelector('#smart-reminders');
  const remindersBack = document.querySelector('#reminders-back');
  const reminderForm = document.querySelector('#reminder-form');
  const reminderList = document.querySelector('#reminder-list');
  const doctorView = document.querySelector('#crop-doctor');
  const doctorBack = document.querySelector('#crop-doctor-back');
  const doctorForm = document.querySelector('#crop-doctor-form');
  const doctorFile = document.querySelector('#crop-doctor-file');
  const doctorPreview = document.querySelector('#crop-doctor-preview');
  const doctorResult = document.querySelector('#crop-doctor-result');
  const doctorCases = document.querySelector('#crop-doctor-cases');
  if (!view || !openButton || !farmForm || !fieldForm || !list) return;

  let selectedFarmId = '';
  let selectedFieldId = '';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); }
    catch { return []; }
  };
  const write = farms => localStorage.setItem(storeKey, JSON.stringify(farms));
  const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const show = () => {
    document.querySelectorAll('.view.active').forEach(item => item.classList.remove('active'));
    view.classList.add('active');
    render();
  };
  const useFarmContext = (farm, field) => {
    localStorage.farmAiLocation = farm.location;
    localStorage.farmAiLandArea = field.area ? String(field.area) : '';
    localStorage.farmAiLandUnit = field.unit;
    localStorage.farmAiCrop = field.crop;
    localStorage.farmAiCropStage = field.stage;
  };
  const selectedField = () => {
    const farm = read().find(item => item.id === selectedFarmId);
    return { farm, field: farm?.fields?.find(item => item.id === selectedFieldId) };
  };
  const renderDiary = () => {
    if (!diaryList) return;
    const { farm, field } = selectedField();
    if (!farm || !field) return;
    document.querySelector('#crop-diary-field-name').textContent = `${farm.name} • ${field.name}`;
    document.querySelector('#crop-diary-summary').textContent = `${field.crop} • ${field.area} ${field.unit}`;
    const entries = [...(field.entries || [])].sort((a, b) => b.date.localeCompare(a.date));
    diaryList.innerHTML = '';
    if (!entries.length) { diaryList.innerHTML = '<div class="farm-empty">No activities yet. Add the first activity above.</div>'; return; }
    entries.forEach(entry => {
      const card = document.createElement('article'); card.className = 'diary-card';
      card.innerHTML = '<div class="diary-card-head"><h3></h3><time></time></div><p></p>';
      card.querySelector('h3').textContent = entry.type;
      const date = card.querySelector('time'); date.dateTime = entry.date; date.textContent = new Date(`${entry.date}T00:00:00`).toLocaleDateString();
      card.querySelector('p').textContent = entry.details;
      if (entry.cost !== '') { const cost = document.createElement('p'); cost.className = 'diary-cost'; cost.textContent = `₹${Number(entry.cost).toLocaleString('en-IN')}`; card.append(cost); }
      diaryList.append(card);
    });
  };
  const openDiary = (farm, field) => {
    selectedFarmId = farm.id; selectedFieldId = field.id;
    document.querySelectorAll('.view.active').forEach(item => item.classList.remove('active'));
    diaryView.classList.add('active'); renderDiary();
  };
  const weatherLabel = code => ({
    0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Rain showers',
    81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorm'
  })[code] || 'Conditions unavailable';
  const openWeather = (farm, field) => {
    selectedFarmId = farm.id; selectedFieldId = field.id;
    document.querySelectorAll('.view.active').forEach(item => item.classList.remove('active'));
    weatherView.classList.add('active');
    document.querySelector('#weather-location').textContent = `${farm.name} • ${farm.location}`;
    document.querySelector('#weather-status').textContent = `Check the forecast for ${field.name} when you are ready.`;
    weatherResult.innerHTML = '';
  };
  const appendWeatherText = (parent, tag, value, className = '') => {
    const item = document.createElement(tag); if (className) item.className = className; item.textContent = value; parent.append(item); return item;
  };
  const loadWeather = async () => {
    const { farm, field } = selectedField();
    if (!farm || !field) return;
    weatherRefresh.disabled = true; weatherRefresh.textContent = 'Checking weather…'; weatherResult.innerHTML = '';
    document.querySelector('#weather-status').textContent = 'Looking up the saved farm location…';
    try {
      const search = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(farm.location)}&count=1&language=en&format=json`);
      const searchData = await search.json(); const place = searchData.results?.[0];
      if (!search.ok || !place) throw new Error('Location not found. Edit the farm location with a nearby town or district.');
      const query = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, timezone: 'auto', forecast_days: '7', current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`); const data = await response.json();
      if (!response.ok || !data.current || !data.daily) throw new Error('Weather data is unavailable right now. Please try again later.');
      document.querySelector('#weather-status').textContent = `${place.name}${place.admin1 ? `, ${place.admin1}` : ''} • updated now`;
      const current = document.createElement('article'); current.className = 'weather-current';
      const summary = document.createElement('div'); appendWeatherText(summary, 'h3', weatherLabel(data.current.weather_code)); appendWeatherText(summary, 'p', `Feels ${Math.round(data.current.apparent_temperature)}°C • Humidity ${data.current.relative_humidity_2m}% • Wind ${Math.round(data.current.wind_speed_10m)} km/h`); appendWeatherText(current, 'div', `${Math.round(data.current.temperature_2m)}°C`, 'weather-temp'); current.prepend(summary); weatherResult.append(current);
      const days = document.createElement('div'); days.className = 'weather-days';
      data.daily.time.forEach((date, index) => {
        const day = document.createElement('article'); day.className = 'weather-day'; const left = document.createElement('div');
        appendWeatherText(left, 'strong', index === 0 ? 'Today' : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
        appendWeatherText(left, 'span', weatherLabel(data.daily.weather_code[index]));
        const right = document.createElement('div'); right.style.textAlign = 'right'; appendWeatherText(right, 'strong', `${Math.round(data.daily.temperature_2m_min[index])}–${Math.round(data.daily.temperature_2m_max[index])}°C`); appendWeatherText(right, 'span', `Rain ${data.daily.precipitation_probability_max[index] || 0}% • ${data.daily.precipitation_sum[index] || 0} mm`); day.append(left, right); days.append(day);
      });
      weatherResult.append(days);
    } catch (error) {
      const errorCard = document.createElement('div'); errorCard.className = 'farm-empty'; errorCard.textContent = error.message || 'Weather could not be loaded.'; weatherResult.append(errorCard);
      document.querySelector('#weather-status').textContent = 'No weather result yet.';
    } finally { weatherRefresh.disabled = false; weatherRefresh.textContent = 'Refresh weather'; }
  };
  const renderReminders = () => {
    if (!reminderList) return;
    const { farm, field } = selectedField();
    if (!farm || !field) return;
    document.querySelector('#reminders-field-name').textContent = `${farm.name} • ${field.name}`;
    document.querySelector('#reminders-summary').textContent = `${field.crop} • reminders stay on this device`;
    const reminders = [...(field.reminders || [])].sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate));
    reminderList.innerHTML = '';
    if (!reminders.length) { reminderList.innerHTML = '<div class="farm-empty">No reminders yet. Add the next important farm task above.</div>'; return; }
    reminders.forEach(reminder => {
      const card = document.createElement('article'); card.className = `reminder-card${reminder.done ? ' done' : ''}`;
      const main = document.createElement('div'); main.className = 'reminder-card-main';
      const title = document.createElement('strong'); title.textContent = reminder.title;
      const meta = document.createElement('span'); meta.textContent = `${reminder.type} • ${new Date(`${reminder.dueDate}T00:00:00`).toLocaleDateString()}`;
      main.append(title, meta);
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = reminder.done ? 'Undo' : 'Done';
      toggle.onclick = () => updateReminder(reminder.id, { done: !reminder.done });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete'; remove.textContent = 'Delete';
      remove.onclick = () => deleteReminder(reminder.id);
      card.append(main, toggle, remove); reminderList.append(card);
    });
  };
  const mutateReminders = transform => {
    const { farm, field } = selectedField(); if (!farm || !field) return;
    const farms = read(); const storedField = farms.find(item => item.id === farm.id)?.fields?.find(item => item.id === field.id);
    if (!storedField) return; storedField.reminders = transform(storedField.reminders || []); write(farms); renderReminders();
  };
  const updateReminder = (id, update) => mutateReminders(reminders => reminders.map(item => item.id === id ? { ...item, ...update } : item));
  const deleteReminder = id => mutateReminders(reminders => reminders.filter(item => item.id !== id));
  const openReminders = (farm, field) => {
    selectedFarmId = farm.id; selectedFieldId = field.id;
    document.querySelectorAll('.view.active').forEach(item => item.classList.remove('active'));
    remindersView.classList.add('active'); renderReminders();
  };
  let doctorImage = null;
  const renderCases = () => {
    if (!doctorCases) return;
    const { farm, field } = selectedField();
    if (!farm || !field) return;
    document.querySelector('#crop-doctor-field-name').textContent = `${farm.name} • ${field.name}`;
    document.querySelector('#crop-doctor-summary').textContent = `${field.crop} • ${field.stage} stage • describe symptoms clearly`;
    const cases = [...(field.cases || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    doctorCases.innerHTML = '';
    if (!cases.length) { doctorCases.innerHTML = '<div class="farm-empty">No saved crop cases yet.</div>'; return; }
    cases.forEach(caseItem => {
      const card = document.createElement('article'); card.className = 'case-card';
      const title = document.createElement('h3'); title.textContent = caseItem.symptoms;
      const time = document.createElement('time'); time.dateTime = caseItem.createdAt; time.textContent = new Date(caseItem.createdAt).toLocaleString();
      const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'View FarmAI assessment'; const answer = document.createElement('p'); answer.textContent = caseItem.answer; details.append(summary, answer); card.append(title, time, details); doctorCases.append(card);
    });
  };
  const mutateCases = transform => {
    const { farm, field } = selectedField(); if (!farm || !field) return;
    const farms = read(); const storedField = farms.find(item => item.id === farm.id)?.fields?.find(item => item.id === field.id);
    if (!storedField) return; storedField.cases = transform(storedField.cases || []); write(farms); renderCases();
  };
  const openDoctor = (farm, field) => {
    selectedFarmId = farm.id; selectedFieldId = field.id; doctorImage = null;
    document.querySelectorAll('.view.active').forEach(item => item.classList.remove('active'));
    doctorView.classList.add('active'); doctorResult.innerHTML = ''; doctorPreview.hidden = true; if (doctorFile) doctorFile.value = ''; renderCases();
  };
  const readDoctorImage = async file => {
    if (!file) return null;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Use a JPG, PNG, or WebP image smaller than 5 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer()); let binary = '';
    for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    return { mimeType: file.type, data: btoa(binary), preview: URL.createObjectURL(file) };
  };
  const render = () => {
    const farms = read();
    fieldForm.hidden = !selectedFarmId;
    list.innerHTML = '';
    if (!farms.length) {
      list.innerHTML = '<div class="farm-empty">No farms saved yet. Add your first farm above.</div>';
      return;
    }
    farms.forEach(farm => {
      const card = document.createElement('article');
      card.className = 'farm-card';
      const head = document.createElement('div');
      head.className = 'farm-card-head';
      const details = document.createElement('div');
      details.innerHTML = `<h3></h3><p></p>`;
      details.querySelector('h3').textContent = farm.name;
      details.querySelector('p').textContent = farm.location;
      const actions = document.createElement('div');
      actions.className = 'farm-card-actions';
      const addField = document.createElement('button');
      addField.type = 'button'; addField.textContent = window.farmAiFeatureText('addField');
      addField.onclick = () => { selectedFarmId = farm.id; render(); fieldForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'delete'; remove.textContent = window.farmAiFeatureText('delete');
      remove.onclick = () => { write(read().filter(item => item.id !== farm.id)); if (selectedFarmId === farm.id) selectedFarmId = ''; render(); };
      actions.append(addField, remove); head.append(details, actions); card.append(head);
      const fields = document.createElement('div'); fields.className = 'field-list';
      if (!farm.fields.length) fields.innerHTML = '<span class="field-card">No fields saved yet.</span>';
      farm.fields.forEach(field => {
        const fieldCard = document.createElement('div');
        fieldCard.className = 'field-card';
        fieldCard.innerHTML = `<strong></strong><span></span><div class="field-card-actions"><button type="button" class="ask">${window.farmAiFeatureText('ask')}</button><button type="button" class="doctor">${window.farmAiFeatureText('doctor')}</button><button type="button" class="diary">${window.farmAiFeatureText('diary')}</button><button type="button" class="weather">${window.farmAiFeatureText('weather')}</button><button type="button" class="reminders">${window.farmAiFeatureText('reminders')}</button></div>`;
        fieldCard.querySelector('strong').textContent = field.name;
        fieldCard.querySelector('span').textContent = [field.crop, field.area ? `${field.area} ${field.unit}` : '', field.stage && field.stage !== 'unknown' ? field.stage : ''].filter(Boolean).join(' • ');
        fieldCard.querySelector('.ask').onclick = () => {
          useFarmContext(farm, field);
          sector = 'Agriculture';
          crop = field.crop;
          history = [];
          localStorage.farmAiSector = sector;
          localStorage.farmAiCrop = crop;
          document.querySelector('#sector-name').textContent = `Agriculture • ${field.crop}`;
          view.classList.remove('active');
          homeView.classList.remove('active');
          chat.classList.add('active');
          render();
          question.focus();
        };
        fieldCard.querySelector('.diary').onclick = () => openDiary(farm, field);
        fieldCard.querySelector('.weather').onclick = () => openWeather(farm, field);
        fieldCard.querySelector('.reminders').onclick = () => openReminders(farm, field);
        fieldCard.querySelector('.doctor').onclick = () => openDoctor(farm, field);
        fields.append(fieldCard);
      });
      card.append(fields); list.append(card);
    });
  };
  openButton.onclick = show;
  backButton.onclick = () => { view.classList.remove('active'); homeView.classList.add('active'); };
  farmForm.onsubmit = event => {
    event.preventDefault();
    const name = document.querySelector('#my-farm-name').value.trim();
    const location = document.querySelector('#my-farm-location').value.trim();
    if (!name) return;
    const farms = read(); const farm = { id: uid(), name, location, fields: [] };
    farms.push(farm); write(farms); selectedFarmId = farm.id; farmForm.reset(); render();
  };
  fieldForm.onsubmit = event => {
    event.preventDefault();
    const fields = {
      name: document.querySelector('#my-field-name').value.trim() || 'My Field',
      area: document.querySelector('#my-field-area').value,
      unit: document.querySelector('#my-field-unit').value,
      crop: document.querySelector('#my-field-crop').value.trim(),
      stage: document.querySelector('#my-field-stage').value || 'unknown'
    };
    if (!selectedFarmId || !fields.crop) return;
    const farms = read(); const farm = farms.find(item => item.id === selectedFarmId);
    if (!farm) return;
    farm.fields.push({ id: uid(), entries: [], ...fields }); write(farms); fieldForm.reset(); render();
  };
  document.querySelectorAll('#quick-crops button').forEach(button => button.addEventListener('click', () => {
    document.querySelector('#my-field-crop').value = button.dataset.crop || '';
    document.querySelectorAll('#quick-crops button').forEach(item => item.classList.toggle('selected', item === button));
  }));
  if (diaryForm) diaryForm.onsubmit = event => {
    event.preventDefault();
    const { farm, field } = selectedField();
    const entry = {
      id: uid(), type: document.querySelector('#diary-type').value,
      date: document.querySelector('#diary-date').value,
      details: document.querySelector('#diary-details').value.trim(),
      cost: document.querySelector('#diary-cost').value
    };
    if (!farm || !field || !entry.type || !entry.date || !entry.details) return;
    const farms = read();
    const savedField = farms.find(item => item.id === farm.id)?.fields?.find(item => item.id === field.id);
    if (!savedField) return;
    savedField.entries ||= []; savedField.entries.push(entry); write(farms);
    diaryForm.reset(); renderDiary();
  };
  if (diaryBack) diaryBack.onclick = () => { diaryView.classList.remove('active'); view.classList.add('active'); render(); };
  if (weatherBack) weatherBack.onclick = () => { weatherView.classList.remove('active'); view.classList.add('active'); render(); };
  if (weatherRefresh) weatherRefresh.onclick = loadWeather;
  if (remindersBack) remindersBack.onclick = () => { remindersView.classList.remove('active'); view.classList.add('active'); render(); };
  if (reminderForm) reminderForm.onsubmit = event => {
    event.preventDefault();
    const { farm, field } = selectedField();
    const reminder = { id: uid(), title: document.querySelector('#reminder-title').value.trim(), dueDate: document.querySelector('#reminder-date').value, type: document.querySelector('#reminder-type').value, done: false };
    if (!farm || !field || !reminder.title || !reminder.dueDate) return;
    mutateReminders(reminders => [...reminders, reminder]); reminderForm.reset();
  };
  if (doctorBack) doctorBack.onclick = () => { doctorView.classList.remove('active'); view.classList.add('active'); render(); };
  if (doctorFile) doctorFile.onchange = async () => {
    try {
      doctorImage = await readDoctorImage(doctorFile.files[0]);
      if (!doctorImage) return;
      doctorPreview.querySelector('img').src = doctorImage.preview; doctorPreview.hidden = false;
    } catch (error) { doctorImage = null; doctorFile.value = ''; doctorPreview.hidden = true; alert(error.message); }
  };
  document.querySelector('#crop-doctor-remove')?.addEventListener('click', () => { doctorImage = null; doctorFile.value = ''; doctorPreview.hidden = true; });
  if (doctorForm) doctorForm.onsubmit = async event => {
    event.preventDefault();
    const { farm, field } = selectedField();
    const symptoms = document.querySelector('#crop-doctor-symptoms').value.trim();
    if (!farm || !field || !symptoms) return;
    const submit = document.querySelector('#crop-doctor-analyze'); submit.disabled = true; submit.textContent = 'Checking crop…'; doctorResult.innerHTML = '';
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Crop concern: ${symptoms}`, image: doctorImage ? { mimeType: doctorImage.mimeType, data: doctorImage.data } : null, history: [], sector: 'Agriculture', crop: field.crop, cropStage: field.stage, landArea: String(field.area), landUnit: field.unit, location: farm.location, language: localStorage.farmAiLanguage || 'en', photoCheck: false }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Crop Doctor could not answer right now.');
      const bubble = document.createElement('article'); bubble.className = 'bubble bot'; bubble.textContent = data.answer || 'No assessment returned.'; doctorResult.append(bubble);
      mutateCases(cases => [...cases, { id: uid(), symptoms, answer: data.answer || 'No assessment returned.', createdAt: new Date().toISOString() }]);
      doctorForm.reset(); doctorImage = null; doctorFile.value = ''; doctorPreview.hidden = true;
    } catch (error) { const bubble = document.createElement('article'); bubble.className = 'farm-empty'; bubble.textContent = error.message || 'Crop Doctor could not be reached.'; doctorResult.append(bubble); }
    finally { submit.disabled = false; submit.textContent = 'Ask Crop Doctor'; }
  };
})();
