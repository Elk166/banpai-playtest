import * as THREE from 'three';
import { RoomEnvironment } from './three/RoomEnvironment.js';

window.__banpaiBootCleanup?.();
document.querySelectorAll('.player-pet[data-boot]').forEach(e=>e.remove());
const hero = document.querySelector('.atmosphere-hero');
hero.removeAttribute('aria-hidden');
hero.replaceChildren();
const button = document.createElement('button');
button.className = 'pet-trigger companion';
button.dataset.ready = 'false';
button.dataset.state = 'idle';
button.setAttribute('aria-label', '柔角小伙伴，轻点回应，长按输入');
const caption = document.createElement('p');
caption.className = 'pet-caption';
caption.setAttribute('role', 'status');
caption.setAttribute('aria-live', 'polite');
caption.textContent = '你好，我是小半。';
hero.append(button, caption);
const label = document.createElement('div');
label.className = 'pet-label';
label.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6"/></svg><span>长按输入你正在做什么</span>';
hero.append(label);

document.querySelectorAll('#screen-main .rec-card').forEach(card=>{const icons=card.querySelectorAll('svg');icons.forEach((icon,i)=>{if(i>0)icon.remove();});const id=card.dataset.scene;const source=document.querySelector(`.scene-tile[data-scene-theme="${id}"] .ico svg`);if(source&&icons[0]) { icons[0].innerHTML=source.innerHTML; icons[0].setAttribute('viewBox',source.getAttribute('viewBox')); }});
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const home = document.querySelector('#screen-main');
const player = document.querySelector('#screen-player');
const tiny = document.createElement('button');tiny.className='player-pet';tiny.setAttribute('aria-label','轻点小伙伴，放松一下');
const tinyCanvas=document.createElement('canvas');tinyCanvas.width=210;tinyCanvas.height=170;tiny.append(tinyCanvas);player.querySelector('.controls').append(tiny);const tinyContext=tinyCanvas.getContext('2d');
let tinyTaps = 0;
const state = { x: 0, y: 0, jump: 0, glow: 0, holding: false, level: 0,
  spring: 0, velocity: 0, sway: 0, swayVelocity: 0, pressing: false };
const tinyReply = document.createElement('span');
tinyReply.className = 'pet-toy-reply';
tinyReply.setAttribute('role', 'status');
tinyReply.setAttribute('aria-live', 'polite');
tiny.append(tinyReply);
let toyReplyTimer;
function toyImpulse() {
  tinyTaps++;
  tiny.dataset.reactions = String(tinyTaps);
  tiny.dataset.scene = activeScene;
  state.pressing = false;
  state.velocity = Math.max(-3.4, state.velocity - 1.8);
  state.swayVelocity = (tinyTaps % 2 ? 1 : -1) * 1.2;
  state.jump = 1;
  state.glow = 1;
  tinyReply.textContent = ['在呢。', '慢慢来。', '陪着你。'][tinyTaps % 3];
  clearTimeout(toyReplyTimer);
  toyReplyTimer = setTimeout(() => { tinyReply.textContent = ''; }, 1200);
  // Browsers without vibration support still show the same visual response.
  if (!reduced.matches) navigator.vibrate?.(12);
}
tiny.addEventListener('pointerdown', event => {
  event.stopPropagation();
  state.pressing = true;
  tiny.setPointerCapture(event.pointerId);
});
tiny.addEventListener('pointerup', event => { event.stopPropagation(); state.pressing = false; });
tiny.addEventListener('pointercancel', event => { event.stopPropagation(); state.pressing = false; });
tiny.addEventListener('pointermove', event => event.stopPropagation());
tiny.addEventListener('click', event => { event.stopPropagation(); toyImpulse(); });
tiny.addEventListener('blur', () => { state.pressing = false; });
let scene, renderer, camera, model, bodyMaterial, eyeGroup, eyes, voiceBars;
let environment, environmentBuilder, renderFrame = 0;
let sceneProps, pencil, paperInk, travelMarks, openBook, laptop, creativeNotes;
let activeScene = document.querySelector("#phone").dataset.theme || "commute";

function buildModel() {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(210, 170);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .68;
  button.append(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 210 / 170, .1, 30);
  camera.position.set(0, .15, 4.4);
  camera.lookAt(0, -.05, 0);
  environmentBuilder = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  environment = environmentBuilder.fromScene(room, .06);
  room.dispose();
  scene.environment = environment.texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c8aa, .9));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(-3, 4, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0xe2f4c7, 2.5, 12);
  rim.position.set(1, -1, 2);
  scene.add(rim);
  model = new THREE.Group();
  scene.add(model);
  const shape = new THREE.SphereGeometry(1, 96, 64);
  const positions = shape.attributes.position;
  const soften = value => Math.sign(value) * Math.pow(Math.abs(value), .78);
  for (let index = 0; index < positions.count; index++) {
    positions.setXYZ(index, soften(positions.getX(index)) * .97,
      soften(positions.getY(index)) * .65, soften(positions.getZ(index)) * .58);
  }
  shape.computeVertexNormals();
  bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbfd6af, roughness: .3, metalness: 0,
    transmission: .24, thickness: .9, ior: 1.35,
    clearcoat: .8, clearcoatRoughness: .16, envMapIntensity: .5,
    attenuationColor: new THREE.Color(0xcce6bc), attenuationDistance: 3,
    emissive: 0xc6eeb1, emissiveIntensity: .018
  });
  model.add(new THREE.Mesh(shape, bodyMaterial));
  eyeGroup = new THREE.Group();
  model.add(eyeGroup);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x496537 });
  eyes = [-.22, .22].map(x => {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .1, 6, 12), eyeMaterial);
    eye.position.set(x, .04, .595);
    eye.rotation.z = -.07;
    eyeGroup.add(eye);
    return eye;
  });
  voiceBars = [-.17, 0, .17].map((x, index) => {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(.027, index === 1 ? .15 : .06, 6, 12), eyeMaterial);
    bar.position.set(x, .04, .61);
    bar.visible = false;
    model.add(bar);
    return bar;
  });
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const paint = shadowCanvas.getContext('2d');
  const gradient = paint.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(62,87,45,.22)');
  gradient.addColorStop(.5, 'rgba(62,87,45,.1)');
  gradient.addColorStop(1, 'rgba(62,87,45,0)');
  paint.fillStyle = gradient;
  paint.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, .55), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false
  }));
  shadow.position.set(0, -.72, -.1);
  scene.add(shadow);
  buildSceneProps();
  applyScene();
  button.dataset.ready = 'true';
  button.dataset.renderer = 'webgl';
}

// Props remain separate from the voice/face state so listening can interrupt work.
function buildSceneProps() {
  sceneProps = new THREE.Group();
  model.add(sceneProps);
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf3f4e9, roughness: .85 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x63794d });
  const penMaterial = new THREE.MeshStandardMaterial({ color: 0xa2ba7c, roughness: .35 });
  const writing = new THREE.Group();
  writing.name = 'writing';
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(.92, .44), paperMaterial);
  sheet.position.set(.35, -.62, .8);
  sheet.rotation.x = -.3;
  writing.add(sheet);
  const strokes = [];
  for (let row = 0; row < 3; row++) {
    for (let step = 0; step < 14; step++) {
      const x = -.03 + step * .038;
      const y = -.49 - row * .09;
      strokes.push(x, y, .84, x + .025, y + Math.sin(step) * .012, .84);
    }
  }
  const inkGeometry = new THREE.BufferGeometry();
  inkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strokes, 3));
  paperInk = new THREE.LineSegments(inkGeometry, dark);
  writing.add(paperInk);
  pencil = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.027, .027, .65, 8), penMaterial);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.027, .1, 8), dark);
  tip.rotation.z = Math.PI;
  tip.position.y = -.375;
  const grip = new THREE.Mesh(new THREE.SphereGeometry(.075, 16, 12), bodyMaterial);
  grip.scale.set(1.3, .7, 1);
  pencil.add(shaft, tip, grip);
  pencil.rotation.z = -.58;
  writing.add(pencil);
  sceneProps.add(writing);

  travelMarks = new THREE.Group();
  travelMarks.name = 'travel';
  for (let index = 0; index < 7; index++) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-.11, 0, 0), new THREE.Vector3(.11, 0, 0)
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x789366, transparent: true, opacity: .3 }));
    line.position.set(index * .37 - 1.1, -.8, .2);
    travelMarks.add(line);
  }
  sceneProps.add(travelMarks);

  openBook = new THREE.Group();
  openBook.name = 'reading';
  for (const sign of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(.45, .4), paperMaterial);
    page.position.set(sign * .23, -.47, .85);
    page.rotation.y = sign * -.18;
    openBook.add(page);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .4, 8), dark);
  spine.position.set(0, -.47, .88);
  openBook.add(spine);
  sceneProps.add(openBook);

  laptop = new THREE.Group();
  laptop.name = 'office';
  const display = new THREE.Mesh(new THREE.BoxGeometry(.85, .47, .035), new THREE.MeshStandardMaterial({ color: 0x8ba6ac, roughness: .4 }));
  display.position.set(0, -.41, .87);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.94, .045, .28), paperMaterial);
  base.position.set(0, -.66, .9);
  laptop.add(display, base);
  sceneProps.add(laptop);
  creativeNotes=new THREE.Group();creativeNotes.name='inspiration';
  for(let i=0;i<3;i++){const note=new THREE.Group();const ink=new THREE.MeshBasicMaterial({color:0x84759d,transparent:true,opacity:.65});const head=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),ink);head.scale.set(1.2,.7,.5);note.add(head);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.19,8),ink);stem.position.set(.045,.09,0);note.add(stem);note.position.set(-.7+i*.65,.5+(i%2)*.22,.6);creativeNotes.add(note);}sceneProps.add(creativeNotes);

}

function applyScene() {
  activeScene = document.querySelector('#phone').dataset.theme || 'commute';
  button.dataset.scene = activeScene;
  tiny.dataset.scene = activeScene;
  if (!sceneProps) return;
  const prop = { focus: 'writing', creative: 'inspiration', commute: 'travel', reading: 'reading', office: 'office' }[activeScene];
  button.dataset.prop = tiny.dataset.prop = prop || 'none';
  sceneProps.children.forEach(child => { child.visible = child.name === prop || (activeScene === 'creative' && child.name === 'inspiration'); });
  const colors = { commute: 0xbfd6af, relax: 0xe5c6c3, office: 0xb5cfd7, reading: 0xc4ddbf, focus: 0xddd0b1, creative: 0xc9c9df };
  bodyMaterial.color.setHex(colors[activeScene] || colors.commute);
  state.jump = .3;
}
new MutationObserver(applyScene).observe(document.querySelector('#phone'), { attributes: true, attributeFilter: ['data-theme'] });

let audioContext, microphone, analyser, recorder;
let holdTimer, resetTimer, pressed = null, recordingToken = 0;
let microphoneData;
let voiceGeneration=0, voiceTimer, voiceAbort, previousMute;

function announce(text) {
  clearTimeout(resetTimer);
  caption.textContent = text;
}
function greet() {
  state.jump = 1;
  state.glow = 1;
  button.dataset.state = 'greeting';
  const greetings = { commute: '路上辛苦了，想听点什么？', focus: '一起慢慢做题，想听点什么？', reading: '我陪你读，想听点什么？', office: '我陪你工作，想听点什么？', relax: '慢下来，我在。', creative: '灵感慢慢来，我陪你。' };
  announce(greetings[activeScene] || '我在。现在想听点什么？');
  resetTimer = setTimeout(() => {
    button.dataset.state = 'idle';
    caption.textContent = '你好，我是小半。';
  }, 2600);
}
async function listen() {
  if (window.BanpaiStaticBeta) {
    window.BanpaiSceneInput?.open();
    return;
  }
  const token = ++recordingToken;
  const voiceId=++voiceGeneration;voiceAbort?.abort();
  state.holding = true;
  button.dataset.state = 'requesting';
  announce('请允许麦克风，按住说话');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {echoCancellation:true,noiseSuppression:true,autoGainControl:true} });
    if (token !== recordingToken || !state.holding) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    microphone = stream;
    const Recorder = window.MediaRecorder;
    if (!Recorder) throw new Error('unsupported');
    const preferred = ['audio/mp4', 'audio/webm;codecs=opus']
      .find(type => Recorder.isTypeSupported?.(type));
    try {
      recorder = new Recorder(stream, preferred ? {mimeType: preferred} : undefined);
    } catch (_) {
      // Some iOS containers report support but reject explicit recorder options.
      recorder = new Recorder(stream);
    }
    {
      const localRecorder=recorder,chunks=[];
      localRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      localRecorder.onstop=async()=>{
        if(!localRecorder.submitVoice||voiceId!==voiceGeneration)return;
        announce('正在识别…');button.dataset.state='processing';
        const controller=new AbortController();voiceAbort=controller;
        const timeout=setTimeout(()=>controller.abort(),60000);
        try{
          const blob = new Blob(chunks, {type: localRecorder.mimeType || chunks[0]?.type || ''});
          if (!blob.size) throw new Error('没录到声音，请重新长按');
          await window.BanpaiLive?.ensureVoiceSession();
          if (voiceId !== voiceGeneration) return;
          const response=await fetch(BanpaiAPI.base+'/v1/app/voice/transcribe',{method:'POST',headers:{Authorization:'Bearer '+BanpaiAPI.token,'Content-Type':blob.type||'application/octet-stream'},body:blob,signal:controller.signal});
          const result=await response.json();
          if(!response.ok)throw new Error(result.detail||'识别失败，请重试');
          if(voiceId!==voiceGeneration)return;
          const matched=window.BanpaiSceneInput?.speech(result.text);
          announce(matched?'小半已为你选好场景':'听到：'+result.text.slice(0,24)+'。请选择适合的场景。');
        }catch(error){if(voiceId!==voiceGeneration)return;announce(error.name==='AbortError'?'识别超时，请重试':error.message);}
        finally{clearTimeout(timeout);if(voiceId===voiceGeneration)button.dataset.state='idle';}
      };
      recorder.start();
      window.BanpaiLive?.playback.setMuted(true);previousMute=false;
      voiceTimer=setTimeout(()=>finishHold(false),30000);
      // Metering is optional. Starting the recorder must not wait for Web Audio.
      startVoiceMeter(stream, token);
    }
    button.dataset.state = 'listening';
    announce('我在听，松开结束');
  } catch {
    if (token !== recordingToken) return;
    stopListening();
    button.dataset.state = 'unavailable';
    announce('麦克风未开启，可输入此刻状态');
    window.BanpaiSceneInput?.open();
  }
}
function startVoiceMeter(stream, token) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  try {
    const meter = new Context();
    audioContext = meter;
    meter.resume().then(() => {
      if (token !== recordingToken || audioContext !== meter) return;
      analyser = meter.createAnalyser();
      analyser.fftSize = 256;
      microphoneData = new Uint8Array(analyser.fftSize);
      meter.createMediaStreamSource(stream).connect(analyser);
    }).catch(() => {});
  } catch (_) {
    // The recording continues even if this runtime does not support a meter.
  }
}
function stopListening() {
  clearTimeout(voiceTimer);if(previousMute!==undefined){window.BanpaiLive?.playback.setMuted(false);previousMute=undefined;}
  recordingToken++;
  state.holding = false;
  state.level = 0;
  if (recorder?.state === 'recording') recorder.stop();
  recorder = null;
  microphone?.getTracks().forEach(track => track.stop());
  microphone = null;
  audioContext?.close().catch(() => {});
  audioContext = null;
  analyser = null;
}
function finishHold(cancelled) {
  const hadAudio = button.dataset.state === 'listening';
  if(recorder)recorder.submitVoice=!cancelled&&hadAudio;
  if(cancelled){voiceGeneration++;voiceAbort?.abort();}
  stopListening();
  button.dataset.state = 'idle';
  announce(cancelled ? '已取消' : hadAudio ? '正在识别…' : '你好，我是小半。');

}
button.addEventListener('pointerdown', event => {
  event.stopPropagation();
  clearTimeout(resetTimer);
  button.setPointerCapture(event.pointerId);
  pressed = { x: event.clientX, y: event.clientY, at:performance.now() };
  holdTimer = setTimeout(listen, 550);
  state.glow = .5;
});
button.addEventListener('pointermove', event => {
  const rect = button.getBoundingClientRect();
  state.x = Math.max(-1, Math.min(1, (event.clientX - rect.x) / rect.width * 2 - 1));
  state.y = Math.max(-1, Math.min(1, (event.clientY - rect.y) / rect.height * 2 - 1));
  if (pressed && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 18) {
    clearTimeout(holdTimer);
  }
});
function release(event, cancelled = false) {
  event.stopPropagation();
  clearTimeout(holdTimer);
  if (!pressed) return;
  const dx=event.clientX-pressed.x,dy=event.clientY-pressed.y;
  const duration=performance.now()-pressed.at;
  pressed = null;
  if(!cancelled&&!state.holding&&duration<=900&&Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.8){
    document.dispatchEvent(new CustomEvent('banpai-home-swipe'));
    return;
  }
  if (state.holding) finishHold(cancelled);
  else if (!cancelled) greet();
}
button.addEventListener('pointerup', event => release(event));
button.addEventListener('pointercancel', event => release(event, true));
button.addEventListener('pointerleave', () => { if (!pressed) { state.x = 0; state.y = 0; } });
button.addEventListener('click', event => {
  event.stopPropagation();
  if (event.detail === 0) greet();
});
button.addEventListener('keydown', event => {
  if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
    event.preventDefault();
    pressed = { x: 0, y: 0 };
    holdTimer = setTimeout(listen, 550);
  }
});
button.addEventListener('keyup', event => {
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    release(event);
  }
});
button.addEventListener('blur', () => {
  clearTimeout(holdTimer);
  pressed = null;
  voiceGeneration++;voiceAbort?.abort();
  if (state.holding) finishHold(true);
});

let previous = 0;
function render(time) {
  renderFrame = 0;
  if (document.hidden || !(home.classList.contains('is-active') || player.classList.contains('is-active'))) return;
  const delta = Math.min((time - previous) / 1000 || .016, .05);
  previous = time;
  if (analyser) {
    analyser.getByteTimeDomainData(microphoneData);
    let sum = 0;
    microphoneData.forEach(value => { sum += ((value - 128) / 128) ** 2; });
    state.level = Math.min(1, Math.sqrt(sum / microphoneData.length) * 8);
  }
  state.jump *= Math.exp(-delta * 4);
  state.glow *= Math.exp(-delta * 2);
  const seconds = time / 1000;
  if (reduced.matches) {
    state.spring = state.velocity = state.sway = state.swayVelocity = 0;
  } else {
    state.velocity += (-105 * state.spring - 13 * state.velocity) * delta;
    state.spring = Math.max(-.24, Math.min(.12, state.spring + state.velocity * delta));
    state.swayVelocity += (-115 * state.sway - 12 * state.swayVelocity) * delta;
    state.sway = Math.max(-.12, Math.min(.12, state.sway + state.swayVelocity * delta));
  }
  tiny.dataset.motion = String(Math.abs(state.spring) + Math.abs(state.sway));
  if (model) {
    model.rotation.y += ((reduced.matches ? 0 : state.x * .2) - model.rotation.y) * .09;
    model.rotation.x += ((reduced.matches ? 0 : state.y * .12) - model.rotation.x) * .09;
    model.rotation.z = reduced.matches ? 0 : Math.sin(seconds * 9) * state.jump * .08;
    model.position.y = reduced.matches ? 0 : Math.sin(seconds * 11) * state.jump * .16 + Math.sin(seconds * 1.7) * .012;
    const moving = !reduced.matches && !state.holding;
    sceneProps.visible = !state.holding;
    model.position.x = moving && activeScene === 'commute' ? Math.sin(seconds * .9) * .22 : 0;
    if (moving && activeScene === 'commute') {
      model.position.y += Math.abs(Math.sin(seconds * 3.5)) * .045;
      model.rotation.z += Math.sin(seconds * 3.5) * .025;
      travelMarks.children.forEach((mark, index) => { mark.position.x = ((index * .37 - seconds * .55) % 2.6 + 2.6) % 2.6 - 1.3; });
    }
    if (activeScene === 'focus') {
      const cycle = moving ? (seconds % 6) / 6 : .5;
      pencil.position.set(.28 + cycle * .32 + (moving ? Math.sin(seconds * 15) * .025 : 0), -.1 + (moving ? Math.cos(seconds * 15) * .016 : 0), .9);
      pencil.rotation.z = -.58 + (moving ? Math.sin(seconds * 9) * .045 : 0);
      paperInk.geometry.setDrawRange(0, Math.max(2, Math.floor(cycle * 42) * 2));
      if (moving) model.rotation.x += .06;
    }
    if(moving && activeScene === 'creative'){model.rotation.z+=Math.sin(seconds*1.6)*.035;creativeNotes.children.forEach((note,i)=>{const a=seconds*.65+i*2.1;note.position.set(Math.cos(a)*.78,.28+Math.sin(a)*.38,.85+Math.sin(a*.7)*.12);note.rotation.z=Math.sin(seconds*2+i)*.18;});}
    if (moving && activeScene === 'reading') openBook.rotation.y = Math.sin(seconds * .8) * .04;
    if (moving && activeScene === 'office') model.rotation.x += Math.sin(seconds * 3) * .018;
    if (moving && activeScene === 'relax') model.scale.setScalar(1 + Math.sin(seconds * .8) * .012);
    else model.scale.setScalar(1);
    model.position.y -= state.spring;
    model.rotation.z += state.sway;
    if (!reduced.matches) {
      const press = state.pressing ? .035 : 0;
      const squeeze = Math.min(.025, Math.abs(state.spring) * .1) + press;
      model.scale.set(1 + squeeze * .6, 1 - squeeze, 1 + squeeze * .3);
    }
    const blink = (seconds % 5.8 > 5.65 && !reduced.matches) || false;
    eyes.forEach(eye => { eye.visible = !state.holding; eye.scale.y = blink ? .13 : 1; });
    voiceBars.forEach((bar, index) => {
      bar.visible = state.holding;
      bar.scale.y = reduced.matches ? 1 : .65 + state.level * (index === 1 ? 3 : 1.8);
    });
    bodyMaterial.emissiveIntensity = .018 + state.glow * .06 + state.level * .08;
    renderer.render(scene, camera);
    if(player.classList.contains("is-active")){tinyContext.clearRect(0,0,210,170);tinyContext.drawImage(renderer.domElement,0,0,210,170);}
  }
  renderFrame = requestAnimationFrame(render);
}
function syncVisibility() {
  cancelAnimationFrame(renderFrame);
  if (document.hidden || !(home.classList.contains('is-active') || player.classList.contains('is-active'))) {
    clearTimeout(holdTimer);
    pressed = null;
    voiceGeneration++;voiceAbort?.abort();
  if (state.holding) finishHold(true);
    return;
  }
  previous = performance.now();
  renderFrame = requestAnimationFrame(render);
}
new MutationObserver(syncVisibility).observe(home, { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', syncVisibility);
try {
  buildModel();
  syncVisibility();
} catch (error) {
  button.dataset.ready = 'fallback';
  button.innerHTML = '<span style="display:block;margin:auto;width:116px;height:80px;border-radius:40%;background:linear-gradient(145deg,#ffffffbb,#d6e8cb);box-shadow:inset 1px 2px 3px #fff,0 10px 18px #36554120;color:#496537;line-height:80px;letter-spacing:15px">Ⅱ</span>';
  announce('当前设备未开启三维显示，仍可轻点与长按');
  window.__banpaiBootStart?.();
  console.warn('Companion renderer unavailable', error);
}
window.addEventListener('pagehide', () => {
  clearTimeout(holdTimer);
  clearTimeout(resetTimer);
  clearTimeout(toyReplyTimer);
  cancelAnimationFrame(renderFrame);
  stopListening();
  scene?.traverse(object => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => { material?.map?.dispose(); material?.dispose(); });
  });
  environment?.dispose();
  environmentBuilder?.dispose();
  renderer?.dispose();
});
