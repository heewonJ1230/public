function toggleMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.getElementById('mobileMenu');
    toggle.classList.toggle('active');
    menu.classList.toggle('show');
}

function closeMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.getElementById('mobileMenu');
    toggle.classList.remove('active');
    menu.classList.remove('show');
}

// Firebase 설정
let firebaseDatabase;

let firebaseStorageInstance = null;
let resolveStorageReady;
const storageReady = new Promise(resolve => { resolveStorageReady = resolve; });
const storageDownloadUrlCache = new Map();
const storageBucketCandidates = new Set();

// BGM 관리
const bgmPaths = [
    'BGM/80년대 미연시 게임  (1).mp3',
    'BGM/80년대 미연시 게임  (Remix).mp3',
    'BGM/80년대 미연시 게임 .mp3',
    'BGM/Untitled.mp3'
];

function waitForStorage() {
    if (firebaseStorageInstance) return Promise.resolve(firebaseStorageInstance);
    return storageReady;
}

async function getStorageDownloadUrl(pathOrUrl) {
    if (!pathOrUrl) throw new Error('Storage path is required');
    if (storageDownloadUrlCache.has(pathOrUrl)) return storageDownloadUrlCache.get(pathOrUrl);
    const storage = await waitForStorage();
    const isAbsolute = /^gs:\/\//i.test(pathOrUrl) || /^https?:\/\//i.test(pathOrUrl);

    const buckets = Array.from(storageBucketCandidates);
    const candidates = [];

    if (isAbsolute) {
        candidates.push({ type: 'absolute', value: pathOrUrl });
        if (/^gs:\/\//i.test(pathOrUrl)) {
            const raw = pathOrUrl.slice(5); // strip gs://
            const slashIdx = raw.indexOf('/');
            const objectPath = slashIdx >= 0 ? raw.slice(slashIdx + 1) : '';
            buckets.forEach(bucket => {
                const variant = `gs://${bucket}/${objectPath}`;
                if (!candidates.some(c => c.value === variant)) {
                    candidates.push({ type: 'absolute', value: variant });
                }
            });
        }
    } else {
        candidates.push({ type: 'relative', value: pathOrUrl });
        buckets.forEach(bucket => {
            const variant = `gs://${bucket}/${pathOrUrl.replace(/^\//, '')}`;
            if (!candidates.some(c => c.value === variant)) {
                candidates.push({ type: 'absolute', value: variant });
            }
        });
    }

    let lastError = null;
    for (const candidate of candidates) {
        try {
            const ref = candidate.type === 'relative'
                ? storage.ref(candidate.value)
                : storage.refFromURL(candidate.value);
            const url = await ref.getDownloadURL();
            storageDownloadUrlCache.set(pathOrUrl, url);
            storageDownloadUrlCache.set(candidate.value, url);
            return url;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error(`Storage asset load failed for ${pathOrUrl}`);
}

async function hydrateStorageElements() {
    const elements = Array.from(document.querySelectorAll('[data-storage-path], [data-gs]'));
    await Promise.all(elements.map(async el => {
        const path = el.getAttribute('data-storage-path') || el.getAttribute('data-gs');
        if (!path) return;
        try {
            const url = await getStorageDownloadUrl(path);
            const targetAttr = el.getAttribute('data-storage-attr');
            if (targetAttr) {
                el.setAttribute(targetAttr, url);
            } else if (el.tagName === 'LINK') {
                el.href = url;
            } else if (el.tagName === 'IMG' || el.tagName === 'SOURCE') {
                el.src = url;
            } else {
                el.setAttribute('data-storage-url', url);
            }
            el.dataset.storageLoaded = '1';
        } catch (err) {
            console.error('Storage asset load failed:', path, err);
        }
    }));
}

async function hydrateStorageBackgrounds() {
    const rootStyle = document.documentElement.style;
    try {
        const castleUrl = await getStorageDownloadUrl('images/bg_castle.png');
        rootStyle.setProperty('--castle-bg-image', `url('${castleUrl}') center/cover no-repeat`);
        rootStyle.setProperty('--castle-bg-fixed-image', `url('${castleUrl}') fixed center/cover no-repeat`);
    } catch (err) {
        console.error('Failed to load castle background:', err);
    }

    try {
        const mobileUrl = await getStorageDownloadUrl('images/m_bg@3x.png');
        rootStyle.setProperty('--mobile-bg-fixed-image', `url('${mobileUrl}') fixed center/cover no-repeat`);
    } catch (err) {
        console.error('Failed to load mobile background:', err);
    }

    try {
        const gateLeft = await getStorageDownloadUrl('images/gate_leftt@3x.png');
        rootStyle.setProperty('--gate-left-image', `url('${gateLeft}')`);
    } catch (err) {
        console.error('Failed to load gate left image:', err);
    }

    try {
        const gateRight = await getStorageDownloadUrl('images/gate_rightt@3x.png');
        rootStyle.setProperty('--gate-right-image', `url('${gateRight}')`);
    } catch (err) {
        console.error('Failed to load gate right image:', err);
    }
}

async function hydrateStorageAssets() {
    await Promise.allSettled([
        hydrateStorageElements(),
        hydrateStorageBackgrounds()
    ]);
}


let isPlaying = true;
let currentBgmIndex = 0;
let shuffledPlaylist = [];

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function updateBgmButtonsState() {
    const bgmToggle = document.getElementById('bgmToggle');
    const navBgmToggle = document.getElementById('navBgmToggle');
    
    if (isPlaying) {
        bgmToggle.textContent = '🎵';
        if (navBgmToggle) navBgmToggle.textContent = '🎵';
    } else {
        bgmToggle.textContent = '🔇';
        if (navBgmToggle) navBgmToggle.textContent = '🔇';
    }
}

function initBGM() {
    shuffledPlaylist = shuffleArray(bgmPaths.map((_, idx) => idx));
    currentBgmIndex = 0;
    
    const bgmPlayer = document.getElementById('bgmPlayer');
    const bgmToggle = document.getElementById('bgmToggle');
    const bgmNext = document.getElementById('bgmNext');
    const bgmPrev = document.getElementById('bgmPrev');
    
    bgmPlayer.volume = 0.3;
    loadCurrentTrack().catch(e => console.log('BGM 초기 로드 실패:', e));
    
    bgmToggle.addEventListener('click', async function() {
        if (isPlaying) {
            bgmPlayer.pause();
            isPlaying = false;
        } else {
            isPlaying = true;
            try {
                await loadCurrentTrack();
            } catch (e) {
                console.log('Play prevented:', e);
            }
        }
        updateBgmButtonsState();
    });
    
    bgmNext.addEventListener('click', nextTrack);
    bgmPrev.addEventListener('click', prevTrack);
    
    bgmPlayer.addEventListener('ended', nextTrack);
    
    // 네비게이션 BGM 버튼 이벤트 추가
    const navBgmToggle = document.getElementById('navBgmToggle');
    const navBgmNext = document.getElementById('navBgmNext');
    const navBgmPrev = document.getElementById('navBgmPrev');

    if (navBgmToggle) {
        navBgmToggle.addEventListener('click', async function() {
            if (isPlaying) {
                bgmPlayer.pause();
                isPlaying = false;
            } else {
                isPlaying = true;
                try {
                    await loadCurrentTrack();
                } catch (e) {
                    console.log('Play prevented:', e);
                }
            }
            updateBgmButtonsState();
        });
    }

    if (navBgmNext) navBgmNext.addEventListener('click', nextTrack);
    if (navBgmPrev) navBgmPrev.addEventListener('click', prevTrack);
}

async function loadCurrentTrack() {
    const bgmPlayer = document.getElementById('bgmPlayer');
    if (!bgmPlayer) return;
    const trackIndex = shuffledPlaylist[currentBgmIndex];
    const path = bgmPaths[trackIndex];
    const url = await getStorageDownloadUrl(path);
    if (bgmPlayer.dataset.currentTrack !== path) {
        bgmPlayer.src = url;
        bgmPlayer.dataset.currentTrack = path;
    }
    if (isPlaying) {
        await bgmPlayer.play();
    } else {
        bgmPlayer.pause();
    }
}

function nextTrack() {
    currentBgmIndex = (currentBgmIndex + 1) % shuffledPlaylist.length;
    
    if (currentBgmIndex === 0) {
        shuffledPlaylist = shuffleArray(bgmPaths.map((_, idx) => idx));
    }
    
    loadCurrentTrack().catch(e => console.log('BGM next 실패:', e));
    updateBgmButtonsState();
}

function prevTrack() {
    currentBgmIndex = currentBgmIndex === 0 ? shuffledPlaylist.length - 1 : currentBgmIndex - 1;
    loadCurrentTrack().catch(e => console.log('BGM prev 실패:', e));
    updateBgmButtonsState();
}

function startAutoPlay() {
    isPlaying = true;
    loadCurrentTrack()
        .then(() => {
            updateBgmButtonsState();
            console.log('BGM auto-play started');
        })
        .catch(e => {
            console.log('Auto-play prevented:', e);
            const startOnFirstClick = async () => {
                try {
                    await loadCurrentTrack();
                } finally {
                    updateBgmButtonsState();
                }
                document.removeEventListener('click', startOnFirstClick);
            };
            document.addEventListener('click', startOnFirstClick, { once: true });
        });
}

function initQuestButtons() {
    const acceptBtn = document.querySelector('.accept-btn');
    const infoBtn = document.querySelector('.info-btn');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', function() {
            alert('퀘스트를 수락했습니다! 🎮\n결혼식 참석으로 경험치를 획득하세요!');
        });
    }
    
    if (infoBtn) {
        infoBtn.addEventListener('click', function() {
            alert('📋 퀘스트 정보\n• 난이도: ★★★☆☆\n• 예상 소요시간: 2-3시간\n• 필요 아이템: 축하하는 마음\n• 특별 보상: 평생 추억');
        });
    }
}

function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.log('Waiting for Firebase to load...');
        setTimeout(initFirebase, 500);
        return;
    }
    
    try {
        const configParts = {
            key1: 'AIzaSyBTbboYtUDwMnfanJSys_vGkpBdhI',
            key2: '-3OK4',
            domain: 'hwsghouse',
            region: 'asia-southeast1',
            projectNum: '427899831354',
            appCode: 'cacd4198e65fa4728f6103'
        };
        
        const bucketList = [
            `${configParts.domain}.firebasestorage.app`,
            `${configParts.domain}.appspot.com`
        ];
        bucketList.forEach(bucket => storageBucketCandidates.add(bucket));

        const firebaseConfig = {
            apiKey: configParts.key1 + configParts.key2,
            authDomain: `${configParts.domain}.firebaseapp.com`,
            databaseURL: `https://${configParts.domain}-default-rtdb.${configParts.region}.firebasedatabase.app`,
            projectId: configParts.domain,
            storageBucket: bucketList[0],
            messagingSenderId: configParts.projectNum,
            appId: `1:${configParts.projectNum}:web:${configParts.appCode}`,
            measurementId: "G-5TJ3Y9W2TR"
        };

        const allowedDomains = [
            'hwsghouse.com', 'hwsghouse.web.app', 'localhost',
            '127.0.0.1', '0.0.0.0', '192.168.', 'vercel.app', 'netlify.app', 'github.io'
            ];        
        
        const currentDomain = window.location.hostname;
            
        if (!allowedDomains.some(domain => currentDomain.includes(domain)) && currentDomain !== '') {
            console.error('Unauthorized domain');
            loadLocalMessages();
            return;
        }

        firebase.initializeApp(firebaseConfig);

        // App Check 활성화 (compat)
        try {
          if (firebase && firebase.appCheck) {
            // site key는 클라이언트용(공개) — 누나가 발급한 값 사용
            firebase.appCheck().activate('6LcbVM0rAAAAAPsYRVKzz9uAyj_-kMiW72q461lx', true);
            console.log('App Check (compat) activated');
          } else {
            console.warn('firebase.appCheck not available - check that firebase-app-check-compat.js is loaded');
          }
        } catch (e) {
          console.warn('App Check activation failed:', e);
        }

        
        firebaseStorageInstance = firebase.storage();
        const detectedBucket = firebaseStorageInstance?.ref?.()?.bucket;
        if (detectedBucket) storageBucketCandidates.add(detectedBucket);
        resolveStorageReady?.(firebaseStorageInstance);
        hydrateStorageAssets().catch(err => console.error('Storage asset hydration failed:', err));

        firebaseDatabase = firebase.database();
        console.log('Firebase initialized successfully');
        
        loadMessages();
        window.loadMemorizedMemories && window.loadMemorizedMemories();
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        loadLocalMessages();
    }
}


 

function disableScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
}

function enableScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
}

let gateOpened = false;

function openGate() {
    if (gateOpened) return;
    gateOpened = true;
    
    document.getElementById('gateContainer').classList.remove('active');
    document.getElementById('gateContainer').classList.add('opened');
    
    setTimeout(() => {
        startAutoPlay();
    }, 500);
    
    setTimeout(() => {
        document.getElementById('mainContainer').classList.add('visible');
        document.getElementById('gateContainer').style.display = 'none';
        
        enableScroll();
        window.scrollTo(0, 0);
    }, 2000);
}

window.addEventListener('load', function() {
    disableScroll();
    document.getElementById('gateContainer').classList.add('active');
    
    initBGM();
    
    const gateContainer = document.getElementById('gateContainer');
    
    gateContainer.addEventListener('click', openGate, { once: true });
    
    gateContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        openGate();
    }, { once: true, passive: false });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            openGate();
        }
    }, { once: true });
});

function addMessage() {
    const name = document.getElementById('name').value.trim();
    const message = document.getElementById('message').value.trim();
    
    if (!name || !message) {
        alert('이름과 메시지를 모두 입력해주세요.');
        return;
    }
    
    const messageData = {
        name: name,
        message: message,
        timestamp: Date.now(),
        date: new Date().toISOString()
    };
    
    if (firebaseDatabase) {
        firebaseDatabase.ref('messages').push(messageData)
            .then(() => {
                document.getElementById('name').value = '';
                document.getElementById('message').value = '';
                alert('축하 메시지가 등록되었습니다! 💕');
            })
            .catch((error) => {
                console.error('메시지 저장 실패:', error);
                saveLocalMessage(name, message);
                alert('축하 메시지가 등록되었습니다! 💕');
            });
    } else {
        saveLocalMessage(name, message);
        alert('축하 메시지가 등록되었습니다! 💕');
    }
}

function loadMessages() {
    if (!firebaseDatabase) {
        loadLocalMessages();
        return;
    }
    
    const messagesList = document.getElementById('messagesList');
    
    firebaseDatabase.ref('messages').orderByChild('timestamp').on('value', (snapshot) => {
        const defaultMessage = messagesList.querySelector('.message-item');
        messagesList.innerHTML = '';
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push(childSnapshot.val());
        });
        
        // 최신 메시지부터 추가 (reverse된 순서로)
        messages.reverse().forEach((msg) => {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            messageItem.innerHTML = `
                <div class="message-author">${msg.name}</div>
                <div class="message-text">${msg.message}</div>
            `;
            messagesList.appendChild(messageItem); // 순서대로 추가
        });
        
        // 가족일동 메시지를 마지막에 추가
        if (defaultMessage) {
            messagesList.appendChild(defaultMessage);
        }
    });
}

function saveLocalMessage(name, message) {
    let messages = JSON.parse(localStorage.getItem('weddingMessages') || '[]');
    messages.unshift({
        name: name,
        message: message,
        date: new Date().toISOString()
    });
    localStorage.setItem('weddingMessages', JSON.stringify(messages));
    
    const messagesList = document.getElementById('messagesList');
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';
    messageItem.innerHTML = `
        <div class="message-author">${name}</div>
        <div class="message-text">${message}</div>
    `;
    messagesList.insertBefore(messageItem, messagesList.firstChild);
}

function loadLocalMessages() {
    const messages = JSON.parse(localStorage.getItem('weddingMessages') || '[]');
    const messagesList = document.getElementById('messagesList');
    
    messages.forEach(msg => {
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        messageItem.innerHTML = `
            <div class="message-author">${msg.name}</div>
            <div class="message-text">${msg.message}</div>
        `;
        messagesList.appendChild(messageItem);
    });
}
// ==[ 네이버 길찾기/장소 링크 - 한 곳에서 관리 ]====================
const HWSG_DIRECTIONS_URL =
  "https://map.naver.com/p/directions/-/14154953.1604186,4496467.9631484,%ED%95%A0%EB%A0%90%EB%A3%A8%EC%95%BC%EA%B5%90%ED%9A%8C,1171200793,PLACE_POI/place/transit?c=13.65,0,0,0,dh";
const HWSG_PLACE_URL =
  "https://map.naver.com/p/entry/place/1171200793?c=15.00,0,0,0,dh&placePath=/home";

// ==[ Web Mercator(x,y) → WGS84(lat,lng) 변환 ]=====================
function mercatorToLatLng(x, y) {
  const R = 6378137;
  const lon = (x / R) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI;
  return new naver.maps.LatLng(lat, lon);
}

// ==[ 길찾기 URL에서 중심좌표(x,y) 파싱 → LatLng ]==================
function parseCenterFromDirections(url) {
  const m = url.match(/directions\/-\/([0-9.]+),([0-9.]+),/);
  if (!m) return null;
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  return mercatorToLatLng(x, y);
}

// ==[ 네이버 지도 로더 (신규 전환 형식) ]===========================
function loadNaverMap() {
  const script = document.createElement('script');
  // 신규 Maps API: 도메인(oapi) + 파라미터명(ncpKeyId)
  script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=8eqp5mjmat';
  script.onload = function () { initNaverMap(); };
  script.onerror = function () { showFallbackMap(); };
  document.head.appendChild(script);
}

// ==[ 지도 초기화 ]==================================================
function initNaverMap() {
  if (!(typeof naver !== 'undefined' && naver.maps)) {
    showFallbackMap();
    return;
  }

  // 링크에서 좌표를 직접 파싱(정확 일치) / 실패 시 예비값 사용
  const position =
    parseCenterFromDirections(HWSG_DIRECTIONS_URL) ||
    new naver.maps.LatLng(37.3933528, 127.1284174);

  const map = new naver.maps.Map('naverMap', {
    center: position,
    zoom: 16,
    mapTypeControl: true,
    zoomControl: true,
    logoControl: true,
    mapDataControl: true,
    scaleControl: true
  });

  const marker = new naver.maps.Marker({
    position,
    map,
    title: '할렐루야 교회 중성전 아트홀',
    icon: {
      content:
        '<div style="background:#FD028F;color:#fff;padding:8px 12px;border-radius:8px;font-family:DungGeunMo;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,.3);">💒</div>',
      anchor: new naver.maps.Point(15, 15)
    }
  });

  const infoWindow = new naver.maps.InfoWindow({
    content:
      '<div style="padding:15px;text-align:center;font-family:DungGeunMo;">' +
      '<h4 style="margin:0 0 8px 0;color:#2D0036;">할렐루야 교회</h4>' +
      '<p style="margin:0;color:#666;">중성전 아트홀 331호</p>' +
      '<p style="margin:5px 0 0 0;color:#999;">희원 ♥ 상규 결혼식</p>' +
      '<p style="margin:5px 0 0 0;font-size:12px;color:#999;">클릭하여 길찾기</p>' +
      '</div>',
    maxWidth: 250,
    backgroundColor: "#ffffff",
    borderColor: "#FD028F",
    borderWidth: 2,
    anchorSize: new naver.maps.Size(15, 15),
    pixelOffset: new naver.maps.Point(0, -10)
  });

  // 마커 클릭 → 네이버 ‘길찾기’ 새 탭
  naver.maps.Event.addListener(marker, 'click', function () {
    window.open(HWSG_DIRECTIONS_URL, '_blank', 'noopener');
  });

  // 정보창 클릭 → 네이버 ‘길찾기’ 새 탭
  naver.maps.Event.addListener(infoWindow, 'domready', function () {
    const el = infoWindow.getContentElement();
    if (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function () {
        window.open(HWSG_DIRECTIONS_URL, '_blank', 'noopener');
      });
    }
  });

  // 진입 시 정보창 자동 오픈
  setTimeout(() => infoWindow.open(map, marker), 500);
}

// ==[ 폴백 화면 ]====================================================
function showFallbackMap() {
  document.getElementById('naverMap').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#FFE3F3;background:rgba(45,0,54,0.8);backdrop-filter:blur(5px);border-radius:15px;padding:16px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:12px;">🏛️</div>
      <div style="font-size:1.2rem;font-weight:bold;margin-bottom:6px;">할렐루야 교회</div>
      <div style="font-size:0.95rem;color:#C2EAFF;line-height:1.6;">
        중성전 아트홀 331호<br/>경기도 성남시 분당구 야탑로 368
      </div>
      <a href="${HWSG_DIRECTIONS_URL}" target="_blank" rel="noopener"
         style="margin-top:14px;padding:10px 16px;border-radius:8px;background:#FD028F;color:#fff;text-decoration:none;font-weight:bold;display:inline-block;">
         🚏 네이버 길찾기
      </a>
    </div>
  `;
}
// ================== 스크롤 헤더 초기화(기존 로직 유지) ==================
function initScrollHeader() {
  const header = document.getElementById('headerSection');
  const mainContainer = document.getElementById('mainContainer');
  const coupleGif = document.getElementById('coupleGif');
  const bgmControl = document.getElementById('bgmControl');
  let isScrolled = false;
  let ticking = false;

  function updateHeader() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const shouldBeScrolled = scrollTop > 150;

    if (shouldBeScrolled !== isScrolled) {
      isScrolled = shouldBeScrolled;

      if (isScrolled) {
        header.classList.add('scrolled');
        mainContainer.classList.add('header-fixed');
        if (bgmControl) bgmControl.classList.add('hidden');

        document.querySelector('.quest-board').style.marginTop = '193px';
        if (coupleGif) {
          coupleGif.style.transform = 'scale(0.8) rotate(360deg)';
          setTimeout(() => { coupleGif.style.transform = 'scale(1) rotate(0deg)'; }, 400);
        }
      } else {
        header.classList.remove('scrolled');
        mainContainer.classList.remove('header-fixed');
        if (bgmControl) bgmControl.classList.remove('hidden');

        document.querySelector('.quest-board').style.marginTop = '41px';


        if (coupleGif) {
          coupleGif.style.transform = 'scale(1.1)';
          setTimeout(() => { coupleGif.style.transform = 'scale(1)'; }, 300);
        }
      }
    }
    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
}

// ================== 픽셀 고정 오프셋 스크롤(공통) ==================
function scrollToWithOffset(sectionId, offsetPx) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const elementTop = target.getBoundingClientRect().top + window.scrollY;
  const y = Math.max(0, elementTop - (offsetPx || 0));

  window.scrollTo({ top: y, behavior: 'smooth' });

  // 주소 해시 갱신(선택) – 필요 없으면 주석 처리해요
  try { history.replaceState(null, '', '#' + sectionId); } catch (e) {}
}

// ================== 헤더/네비 전용 함수(픽셀값만 다르게) ==================
const HEADER_OFFSET_PX = 347; // 헤더에서 클릭할 때 뺄 픽셀 (원하는 값으로)
const NAV_OFFSET_PX    = 70;  // 네비게이션 바에서 클릭할 때 뺄 픽셀

function scrollFromHeader(sectionId, ev) {
  if (ev) ev.preventDefault();            // 기본 앵커 점프 방지
  scrollToWithOffset(sectionId, HEADER_OFFSET_PX);
  return false;                           // 일부 브라우저 중복 방지
}

function scrollFromNav(sectionId, ev) {
  if (ev) ev.preventDefault();
  scrollToWithOffset(sectionId, NAV_OFFSET_PX);
  return false;
}

function scrollToTop(ev) {
  if (ev) ev.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return false;
}

// 이미지 모달 기능
function openImageModal(imgElement) {
    // 모달이 없으면 생성
    let modal = document.getElementById('imageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-content">
                <button class="image-modal-close" onclick="closeImageModal()">✕</button>
                <img id="modalImage" src="" alt="">
                <div class="image-modal-title" id="modalTitle"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // 배경 클릭으로 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImageModal();
            }
        });

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeImageModal();
            }
        });
    }

    // 이미지와 제목 설정
    const modalImg = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    
    modalImg.src = imgElement.src;
    modalImg.alt = imgElement.alt;
    modalTitle.textContent = imgElement.alt;

    // 모달 표시
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function openGalleryPage() {
    window.open('gallery.html', '_blank');
}

function seedBackgroundSnow() {
    const container = document.querySelector('.snowflakes-bg');
    if (!container) return;

    const shapes = ['❅','❄','❆','✦','✧','❉','✽'];
    const isMobile = matchMedia('(max-width: 768px)').matches;

    const COUNT = isMobile ? 40 : 80;

    for (let i = 0; i < COUNT; i++) {
        const el = document.createElement('div');
        el.className = 'snowflake-bg';
        el.textContent = shapes[(Math.random() * shapes.length) | 0];

        const sizeEm = (Math.random() * 0.5 + 0.15).toFixed(2);
        el.style.fontSize = `${sizeEm}em`;

        el.style.left = `${(Math.random() * 100).toFixed(2)}%`;

        const fall = (Math.random() * 4 + 5).toFixed(2);
        const sway = (Math.random() * 2 + 1.6).toFixed(2);

        const delayFall = (-Math.random() * fall).toFixed(2);
        const delaySway = (Math.random() * 3).toFixed(2);

        el.style.opacity = (Math.random() * 0.6 + 0.3).toFixed(2);

        el.style.animationDuration = `${fall}s, ${sway}s`;
        el.style.animationDelay = `${delayFall}s, ${delaySway}s`;

        container.appendChild(el);
    }
};

// 눈 쌓이는 시스템 - 푸터 보더탑 + 문서 최하단(항상 body 바닥)
let documentSnowSystem = {
  startTime: Date.now(),
  piles: [],
  broomBtn: null,
  broomDefaultBG: 'linear-gradient(135deg, #f472b6, #60a5fa, #34d399)',
  cleanMode: false,

  // 레이어/참조
  footer: null,
  footerBase: null,
  footerTopLayer: null,
  pageEndAnchor: null,      // body의 맨 끝 앵커
  pageBottomLayer: null,    // 문서 끝 레이어 (항상 body 바닥)
  snowContainer: null,      // 호환용

  // 상태
  atBottomVisible: false,
  addTimer: null,
  _ro: null, // ResizeObserver
  _io: null, // IntersectionObserver

  init() {
    console.log('문서 하단 눈 시스템 시작');
    this.createSnowContainer();
    this.createBroomButton();
    this.observeBottom();
    this.startAccumulation();
  },

  createSnowContainer() {
    // (옵션) 푸터
    this.footer = document.querySelector('footer, .footer') || null;
    if (this.footer) {
      if (getComputedStyle(this.footer).position === 'static') this.footer.style.position = 'relative';
      this.footer.style.overflow = 'visible';

      this.footerBase =
        this.footer.querySelector('[data-snow-base]') ||
        this.footer.querySelector('.footer-inner, .container, .wrap') ||
        this.footer;

      // [A] 푸터 border-top 위 전용 레이어
      this.footerTopLayer = document.createElement('div');
      this.footerTopLayer.style.cssText = `
        position:absolute; left:0; bottom:100%;
        width:100%; height:0; overflow:visible; pointer-events:none; z-index:98;
      `;
      this.footer.appendChild(this.footerTopLayer);
    }

    // [B] 문서 최하단(진짜 body 바닥) 전용 앵커 + 레이어
    this.pageEndAnchor = document.createElement('div');
    this.pageEndAnchor.style.cssText = `position:relative; width:103%; height:0; overflow:visible;`;
    document.body.appendChild(this.pageEndAnchor); // 항상 body 끝에 삽입

    this.pageBottomLayer = document.createElement('div');
    this.pageBottomLayer.style.cssText = `
      position:absolute; left:0; top:-1px;
      width:103%; height:0; overflow:visible; pointer-events:none; z-index:98;
    `;
    this.pageEndAnchor.appendChild(this.pageBottomLayer);

    // 호환용
    this.snowContainer = this.pageBottomLayer;

    // 반응형 (푸터 보더탑 정렬만)
    this.layoutLayers();
    this._ro = new ResizeObserver(() => this.layoutLayers());
    this._ro.observe(document.documentElement);
    if (this.footer) this._ro.observe(this.footer);
    window.addEventListener('resize', () => this.layoutLayers());
  },

  createBroomButton() {
    this.broomBtn = document.createElement('div');
    this.broomBtn.innerHTML = '🧹';
    const baseStyle = `
      width:50px; height:50px;
      background:${this.broomDefaultBG};
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:20px; cursor:pointer;
      opacity:0; transform:scale(0);
      transition:all .3s ease;
      z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,.3);
      pointer-events:none;
    `;
    if (this.footer) {
      this.broomBtn.style.cssText = `position:absolute; right:20px; top:70px; ${baseStyle}`;
      this.footer.appendChild(this.broomBtn);
    } else {
      this.broomBtn.style.cssText = `position:fixed; right:20px; bottom:20px; ${baseStyle}`;
      document.body.appendChild(this.broomBtn);
    }
    this.broomBtn.onclick = () => this.toggleClean();
  },

  // 바닥 가시성(아이콘 표시용)만 관찰
  observeBottom() {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = `width:100%; height:1px;`;
    this.pageEndAnchor.appendChild(sentinel);

    const update = () => this.updateBroomVisibility();

    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver((entries) => {
        this.atBottomVisible = entries.some(e => e.isIntersecting);
        update();
      }, { threshold: 0.01 });
      this._io.observe(sentinel);
    } else {
      const check = () => {
        const nearBottom = window.innerHeight + window.scrollY >= (document.body.offsetHeight - 2);
        this.atBottomVisible = !!nearBottom;
        update();
      };
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check);
      check();
    }
  },

  // 10초 후부터 스크롤 여부와 무관하게 계속 쌓임
  startAccumulation() {
    setTimeout(() => {
      const tick = () => this.addSnow();
      tick();
      this.addTimer = setInterval(tick, 7000);
    }, 10000);
  },

  addSnow() {
    if (!this.pageBottomLayer) return;

    // 50 : 50 (푸터 없으면 100% 바닥)
    const layer = (this.footerTopLayer && Math.random() < 0.5)
      ? this.footerTopLayer
      : this.pageBottomLayer;

    const width  = 25 + Math.random() * 35;
    const height = 8  + Math.random() * 15;

    const layerW = layer.getBoundingClientRect().width || window.innerWidth;
    const left = Math.max(0, Math.random() * Math.max(1, layerW - width));

    const showSnowflake = Math.random() > 0.7;
    const snowflakeShapes = ['❅','❄','❆','❉','✽'];
    const pile = document.createElement('div');

    if (showSnowflake) {
      pile.textContent = snowflakeShapes[(Math.random() * snowflakeShapes.length) | 0];
      pile.style.cssText = `
        position:absolute; left:${left}px; bottom:0;
        font-size:${12 + Math.random() * 8}px;
        color:rgba(255,255,255,.9);
        text-shadow:0 0 8px rgba(255,255,255,.8);
        animation:snowflakeGrow .8s ease-out;
        pointer-events:auto; cursor:pointer; z-index:99;
      `;
    } else {
      pile.style.cssText = `
        position:absolute; left:${left}px; bottom:0;
        width:${width}px; height:${height}px;
        background:linear-gradient(to top,
          rgba(255,255,255,.95) 0%,
          rgba(255,255,255,.8) 60%,
          rgba(255,255,255,.6) 100%);
        border-radius:${width/2}px ${width/2}px 0 0;
        box-shadow:inset 0 2px 4px rgba(255,255,255,1),
                   0 1px 3px rgba(0,0,0,.2);
        animation:snowPileGrow .6s ease-out;
        pointer-events:auto; cursor:pointer; z-index:99;
      `;
    }

    // 키프레임 1회만
    if (!document.getElementById('document-snow-styles')) {
      const style = document.createElement('style');
      style.id = 'document-snow-styles';
      style.textContent = `
        @keyframes snowPileGrow {0%{height:0;opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes snowflakeGrow {0%{opacity:0;transform:scale(0) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes snowPileRemove {0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.3);height:0}}
        @keyframes particleFloat {0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-40px) scale(.3)}}
      `;
      document.head.appendChild(style);
    }

    pile.onclick = (e) => { if (this.cleanMode) this.removePile(pile, e); };

    layer.appendChild(pile);
    this.piles.push(pile);
    this.updateBroomVisibility();
  },

  updateBroomVisibility() {
    if (!this.broomBtn) return;
    const show = this.piles.length > 0 && this.atBottomVisible;
    if (show) {
      this.broomBtn.style.opacity = '1';
      this.broomBtn.style.transform = 'scale(1)';
      this.broomBtn.style.pointerEvents = 'auto';
    } else {
      this.resetBroom();
    }
  },

  resetBroom() {
    if (!this.broomBtn) return;
    this.broomBtn.style.opacity = '0';
    this.broomBtn.style.transform = 'scale(0)';
    this.broomBtn.style.pointerEvents = 'none';
    this.broomBtn.style.background = this.broomDefaultBG;
    this.cleanMode = false;
    document.body.style.cursor = 'default';
  },

  toggleClean() {
    this.cleanMode = !this.cleanMode;
    if (this.cleanMode) {
      this.broomBtn.style.background = 'linear-gradient(45deg, #ff4757, #ff3838)';
      document.body.style.cursor = 'crosshair';
      this.showMessage('🧹 청소 모드! 눈더미를 클릭하세요!');
    } else {
      this.broomBtn.style.background = this.broomDefaultBG;
      document.body.style.cursor = 'default';
    }
  },

  removePile(pile, event) {
    this.createParticles(event.clientX, event.clientY);
    pile.style.animation = 'snowPileRemove 0.4s ease-out forwards';
    setTimeout(() => {
      if (pile.parentNode) pile.remove();
      this.piles = this.piles.filter(p => p !== pile);
      if (this.piles.length === 0) {
        this.showMessage('✨ 모든 눈을 치웠어요!');
        this.resetBroom(); // 완전 초기화
      } else {
        this.updateBroomVisibility();
      }
    }, 400);
  },

  createParticles(x, y) {
    const particles = ['❄️', '✨', '💨'];
    for (let i = 0; i < 2; i++) {
      const p = document.createElement('div');
      p.textContent = particles[(Math.random() * particles.length) | 0];
      p.style.cssText = `
        position:fixed; left:${x - 10 + Math.random()*20}px; top:${y - 10 + Math.random()*20}px;
        font-size:14px; pointer-events:none; z-index:10001; animation:particleFloat .8s ease-out forwards;
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  },

  showMessage(text) {
    window.showMessage && window.showMessage(text);
  },

  layoutLayers() {
    // 푸터 상단 레이어만 컨텐츠 폭에 맞춰 정렬
    if (this.footer && this.footerTopLayer) {
      const footerRect = this.footer.getBoundingClientRect();
      const baseRect   = (this.footerBase || this.footer).getBoundingClientRect();
      const leftInFooter = baseRect.left - footerRect.left;
      this.footerTopLayer.style.left  = `${leftInFooter}px`;
      this.footerTopLayer.style.width = `${baseRect.width}px`;
    }
    // 페이지 바닥 레이어는 width:100% 유지(문서 전체 폭)
  }
};

    /* 👇🏻👇🏻👇🏻👇🏻👇🏻👇🏻=====================
    * 🖼️🖼️🖼️🖼️Index 시작 갤러리 오버레이🖼️🖼️🖼️🖼️
    /* 👇🏻👇🏻👇🏻👇🏻👇🏻👇🏻=====================
    * ===================== */
// SPA 구조를 위한 갤러리 시스템 (IIFE 패턴)
;(function(){
    'use strict';
    const btn = document.getElementById('guestUploadBtn');
    const input = document.getElementById('guestUploadInput');
    const list = document.getElementById('guestUploadList');
    const desktopBlock = document.getElementById('guestUploadDesktopBlock');
    const mqMatch = typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 768px)').matches
        : false;
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test((navigator.userAgent || ''));
    const isMobile = mqMatch || uaMobile;

    if (desktopBlock) {
        if (isMobile) {
            desktopBlock.setAttribute('hidden', '');
        } else {
            desktopBlock.removeAttribute('hidden');
        }
    }

    const MAX_FILES = 10;
    const MAX_DIMENSION = 2560;
    const PREFERRED_MIME = 'image/webp';
    const PREFERRED_QUALITY = 0.92;

    const sizeUnits = ['B', 'KB', 'MB', 'GB'];
    const fmt = (bytes) => {
        if (!Number.isFinite(bytes)) return '0 B';
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < sizeUnits.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        const precision = unitIndex === 0 ? 0 : 1;
        return `${value.toFixed(precision)} ${sizeUnits[unitIndex]}`;
    };

    async function compressImage(file) {
        if (!(file instanceof Blob) || !file.type?.startsWith('image/')) return file;

        const objectUrl = URL.createObjectURL(file);
        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Image decode failed'));
                image.src = objectUrl;
            });

            let { width, height } = img;
            if (!width || !height) return file;

            const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
            const targetWidth = Math.max(1, Math.round(width * scale));
            const targetHeight = Math.max(1, Math.round(height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return file;

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, PREFERRED_MIME, PREFERRED_QUALITY));
            if (!blob) return file;

            const ext = PREFERRED_MIME.split('/')[1] || 'webp';
            const baseName = file.name.replace(/\.[^.]+$/, '');
            return new File([blob], `${baseName}.${ext}`, { type: blob.type, lastModified: Date.now() });
        } catch (err) {
            console.warn('compressImage fallback to original file:', err);
            return file;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }
    // 전역 변수들
    let allImageUrls = [];
    let topImageUrls = [];
    let isLoading = false;
    
    // 슬라이드쇼 관련 변수들
    let currentSlideIndex = 0;
    let slideshow = null;
    
    // DOM 요소들
    let overlay, overlayGrid, overlayLoading;
    let openBtn, closeBtn;
    function addItemRow(name, sizeText) {
    const wrap = document.createElement('div');
    wrap.className = 'upload-item';
    wrap.innerHTML = `
      <div class="upload-item__row">
        <div class="upload-name" title="${name}">${name}</div>
        <div class="upload-size">${sizeText}</div>
      </div>
      <div class="upload-bar"><span></span></div>
      <div class="upload-status" aria-live="polite"></div>
    `;
    list?.appendChild(wrap);
    return {
      bar: wrap.querySelector('.upload-bar > span'),
      status: wrap.querySelector('.upload-status')
    };
  }

  async function doUpload(files) {
    if (!files || !files.length) return;
    const storage = await waitForStorage().catch(() => null);
    if (!storage) {
      alert('스토리지 준비에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    const arr = Array.from(files).slice(0, MAX_FILES);

    list?.setAttribute('aria-busy', 'true');

    for (const f of arr) {
      const row = addItemRow(f.name, fmt(f.size));
      try {
        // 압축
        const start = Date.now();
        const compressed = await compressImage(f);
        const took = ((Date.now()-start)/1000).toFixed(1);

        // 경로: guest-uploads/YYYY/MM/ts-rand.webp|jpg
        const now = new Date();
        const yyyy = String(now.getFullYear());
        const mm   = String(now.getMonth()+1).padStart(2,'0');
        const ts   = now.toISOString().replace(/[:.]/g,'-');
        const rand = Math.random().toString(36).slice(2,8);

        const ext = (PREFERRED_MIME === 'image/webp') ? 'webp' : 'jpg';
        const path = `${UPLOAD_PREFIX}/${yyyy}/${mm}/${ts}-${rand}.${ext}`; // → hagack/YYYY/MM/...

        const meta = {
          contentType: PREFERRED_MIME,
          customMetadata: {
            originalName: f.name,
            originalSize: String(f.size),
            compressedSize: String(compressed.size),
            ua: navigator.userAgent,
            uploadedAt: new Date().toISOString()
          }
        };

        const ref = storage.ref(path);
        const task = ref.put(compressed, meta);

        await new Promise((resolve, reject) => {
          task.on('state_changed', (snap) => {
            const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
            row.bar.style.width = pct.toFixed(1) + '%';
          }, reject, resolve);
        });

        row.bar.style.width = '100%';
        row.status.className = 'upload-done';
        row.status.textContent = 'Upload complete (' + fmt(compressed.size) + ', ' + took + 's)';
      } catch (err) {
        console.error(err);
        row.status.className = 'upload-error';
        row.status.textContent = 'Upload failed: ' + (err && err.message ? err.message : err);
      }
    }

    list?.setAttribute('aria-busy', 'false');
  }

  // 버튼 클릭 → 파일 선택 트리거 (모바일만)
  btn?.addEventListener('click', () => {
    if (!isMobile) {
      alert('모바일 기기에서만 사진 업로드를 지원합니다.');
      return;
    }
    input?.click();
  });

  // 파일 선택 시 바로 업로드
  input?.addEventListener('change', (e) => {
    if (!isMobile) return;
    const files = e.target?.files;
    if (!files || !files.length) return;
    doUpload(files);
    // iOS에서 같은 파일 재선택 허용
    e.target.value = '';
  });
})();

/* ==== Memorized Memories: hagack/ 목록 → 가로 스크롤 & 오버레이 ==== */
(function(){
  const UPLOAD_PREFIX = 'hagack'; // guest uploads stay under hagack/YYYY/MM/...

  let files = [];     // {url, time}
  let cur = 0;        // overlay current index

  // 외부에서 초기화 타이밍 맞춰 부르기 위함
  window.loadMemorizedMemories = async function(){
    try {
      if (typeof firebase === 'undefined') return;
      await waitForStorage().catch(() => null);
      const storage = firebaseStorageInstance || firebase.storage?.();
      if (!storage) return;
      const rail = document.getElementById('mmRail');
      if (!rail) return;
      files = [];
      const root = storage.ref(UPLOAD_PREFIX);

      async function walk(ref){
        const res = await ref.listAll();
        for (const p of res.prefixes) await walk(p);
        for (const it of res.items) {
          const [meta, url] = await Promise.all([
            it.getMetadata().catch(()=>null),
            it.getDownloadURL().catch(()=>null)
          ]);
          if (meta && url && /^image\//.test(meta.contentType||'')) {
            files.push({ url, time: Date.parse(meta.timeCreated||0) || 0 });
          }
        }
      }

      await walk(root);

      // 최신 업로드 먼저
      files.sort((a,b)=> b.time - a.time);

      // 썸네일 렌더
      rail.innerHTML = '';
      files.forEach((f, i)=>{
        const btn = document.createElement('button');
        btn.className = 'mm-card';
        btn.innerHTML = `<img src="${f.url}" alt="Memorized Memory ${i+1}">`;
        btn.addEventListener('click', ()=> openMM(i));
        rail.appendChild(btn);
      });
    } catch (e) {
      console.error('Memorized Memories load failed:', e);
      const rail = document.getElementById('mmRail');
      if (rail) rail.innerHTML = `<div style="opacity:.8;color:#C2EAFF">사진 목록을 불러오지 못했습니다.</div>`;
    }
  };

  // 오버레이 컨트롤
  const overlay = document.getElementById('mmOverlay');
  const imgEl   = document.getElementById('mmImg');
  const btnPrev = overlay?.querySelector('.mm-prev');
  const btnNext = overlay?.querySelector('.mm-next');
  const btnClose= overlay?.querySelector('.mm-close');

  function openMM(index){
    cur = index;
    if (!overlay || !imgEl || !files.length) return;
    imgEl.src = files[cur].url;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeMM(){
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    imgEl.src = '';
  }

  function move(delta){
    if (!files.length) return;
    cur = (cur + delta + files.length) % files.length;
    imgEl.src = files[cur].url;
  }

  btnPrev?.addEventListener('click', ()=> move(-1));
  btnNext?.addEventListener('click', ()=> move(+1));
  btnClose?.addEventListener('click', closeMM);

  overlay?.addEventListener('click', (e)=> { if (e.target === overlay) closeMM(); });
  document.addEventListener('keydown', (e)=>{
    if (overlay?.hidden) return;
    if (e.key === 'Escape') closeMM();
    if (e.key === 'ArrowLeft')  move(-1);
    if (e.key === 'ArrowRight') move(+1);
  });

  // Firebase가 초기화된 뒤 불러오도록 연결 (initFirebase 성공 시점에 호출)
  // 아래 한 줄만 initFirebase 성공 블록에 추가해주면 자동으로 로드됨.
  //   window.loadMemorizedMemories && window.loadMemorizedMemories();
})();


/* ☝🏻☝🏻☝🏻☝🏻=========================
 * 📤 Guest Upload (모바일 전용) 끗☝🏻☝🏻☝🏻☝🏻
 * ☝🏻☝🏻☝🏻☝🏻========================= */

/* 👇🏻👇🏻👇🏻👇🏻👇🏻👇🏻=====================
    * 🖼️🖼️🖼️🖼️Index 시작 갤러리 오버레이🖼️🖼️🖼️🖼️
    /* 👇🏻👇🏻👇🏻👇🏻👇🏻👇🏻=====================
    * ===================== */
// SPA 구조를 위한 갤러리 시스템 (IIFE 패턴)
;(function(){
    'use strict';

    const GALLERY_ROOT = 'Photo';
    const TOP_ROOT = 'Photo/topimages';

    let allImageUrls = [];
    let topImageUrls = [];
    let isLoading = false;

    let currentSlideIndex = 0;
    let slideshow = null;

    let overlay, overlayGrid, overlayLoading;
    let openBtn, closeBtn;

    function getBucketHosts() {
        const arr = Array.from(storageBucketCandidates);
        if (!arr.length) return ['hwsghouse.firebasestorage.app', 'hwsghouse.appspot.com'];
        if (arr.length === 1) {
            const only = arr[0];
            if (only.endsWith('.appspot.com')) {
                return [only.replace('.appspot.com', '.firebasestorage.app'), only];
            }
            return [only, only.replace('.firebasestorage.app', '.appspot.com')];
        }
        return arr;
    }

    function getPrimaryBucket() {
        return getBucketHosts()[0];
    }

    async function getStorageInstance() {
        try {
            return await waitForStorage();
        } catch {
            return null;
        }
    }

    function getUrlKey(url) {
        try {
            const match = /\/o\/([^?]+)/.exec(url);
            return match ? decodeURIComponent(match[1]) : url;
        } catch {
            return url;
        }
    }

    async function listFromRef(storageRef) {
        const res = await storageRef.listAll();
        const urls = await Promise.all(res.items.map(item => item.getDownloadURL()));
        const nested = await Promise.all(res.prefixes.map(prefix => listFromRef(prefix)));
        return urls.concat(...nested);
    }

    async function listViaRest(prefix) {
        const bucket = getPrimaryBucket();
        const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
        const urls = [];
        let pageToken = null;
        let guard = 0;
        const normalized = prefix.replace(/^\/+/, '').replace(/\/+$/, '') + '/';

        do {
            const qs = new URLSearchParams({ prefix: normalized });
            if (pageToken) qs.set('pageToken', pageToken);
            const response = await fetch(`${base}?${qs.toString()}`);
            if (!response.ok) break;
            const data = await response.json();
            const items = data.items || [];
            for (const item of items) {
                urls.push(`${base}/${encodeURIComponent(item.name)}?alt=media`);
            }
            pageToken = data.nextPageToken || null;
        } while (pageToken && ++guard < 100);

        return urls;
    }

    async function listAllUrls(refPath) {
        const clean = String(refPath || '').replace(/^\/+/, '');
        const storage = await getStorageInstance();

        if (storage) {
            try {
                const ref = storage.ref(clean);
                const urls = await listFromRef(ref);
                if (urls?.length) return urls;
            } catch (err) {
                console.log('Storage SDK listAll 실패, REST로 재시도:', err);
            }
        }

        try {
            const urls = await listViaRest(clean);
            if (urls?.length) return urls;
        } catch (err) {
            console.log('REST list 실패:', err);
        }
        return [];
    }

    function pickRandomImages(urls, count) {
        if (!urls?.length) return [];
        const picked = new Set();
        const needed = Math.min(count, urls.length);
        while (picked.size < needed) picked.add(Math.floor(Math.random() * urls.length));
        return [...picked].map(idx => urls[idx]);
    }

    function applySpecialFocus(imgElement, src) {
        if (src.includes('Photo%2Ftopimages%2F7.png') || src.includes('/Photo/topimages/7.png')) {
            imgElement.style.objectPosition = '50% 10%';
        }
    }

    function renderIndexPreview() {
        const container = document.getElementById('indexGalleryContainer');
        if (!container) {
            setTimeout(renderIndexPreview, 500);
            return;
        }

        listAllUrls(TOP_ROOT)
            .then(urls => {
                topImageUrls = urls;
                if (!topImageUrls.length) {
                    const bucket = getPrimaryBucket();
                    const fallback = ['0Start.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png']
                        .map(name => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/Photo%2Ftopimages%2F${encodeURIComponent(name)}?alt=media`);
                    topImageUrls = fallback;
                }

                const randomImages = pickRandomImages(topImageUrls, 4);
                const moreCard = document.getElementById('indexGalleryMore');
                const moreClone = moreCard ? moreCard.cloneNode(true) : null;

                container.innerHTML = '';
                randomImages.forEach((src, idx) => {
                    const card = document.createElement('div');
                    card.className = 'gallery-item';
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = `갤러리 미리보기 ${idx + 1}`;
                    img.loading = 'lazy';
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;object-position:center 30%;';
                    applySpecialFocus(img, src);
                    card.addEventListener('click', openOverlay);
                    card.appendChild(img);
                    container.appendChild(card);
                });

                if (moreClone) container.appendChild(moreClone);
            })
            .catch(err => console.error('인덱스 미리보기 렌더링 실패:', err));
    }

    function ensureOverlayHTML() {
        if (document.getElementById('galleryOverlay')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="galleryOverlay" class="gallery-overlay" aria-hidden="true">
                <div class="overlay-inner" role="dialog" aria-modal="true" aria-label="갤러리 오버레이">
                    <div class="overlay-header">
                        <h2 class="section-title">📷 희원 & 상규 갤러리</h2>
                        <button id="closeGalleryOverlay" class="quick-btn overlay-close-btn" type="button">⬅️🔙 갤러리 나가기</button>
                    </div>
                    <div class="overlay-body">
                        <div id="overlayLoading" class="overlay-loading">
                            <div class="spinner"></div>
                            <span>🖼️ 갤러리 로딩 중...</span>
                        </div>
                        <div id="overlayGrid" class="overlay-grid" hidden></div>
                    </div>
                </div>
            </div>
            <style>
                @media (min-width: 1024px) {
                    .gallery-overlay .overlay-inner {
                        max-width: 70%;
                        margin: 0 auto;
                        left: 15%;
                        right: 15%;
                    }
                }
                .gallery-overlay .overlay-header {
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    margin-bottom:20px;
                }
                .gallery-overlay .section-title {
                    margin:0;
                    text-align:center;
                    flex:1;
                }
                .overlay-close-btn {
                    flex-shrink:0;
                }
            </style>
        `);
    }

    async function openOverlay() {
        if (!overlay) return;
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (!allImageUrls.length) {
            await loadAllImages();
        } else {
            renderGrid();
            hideLoading();
        }
    }

    function closeOverlay() {
        if (!overlay) return;
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    async function loadAllImages() {
        if (isLoading) return;
        isLoading = true;
        try {
            showLoading();
            if (!topImageUrls.length) {
                topImageUrls = await listAllUrls(TOP_ROOT);
            }
            const allPhotoUrls = await listAllUrls(GALLERY_ROOT);
            const topKeys = new Set(topImageUrls.map(getUrlKey));
            const otherImageUrls = allPhotoUrls.filter(url => !topKeys.has(getUrlKey(url)));

            const extractName = (url) => {
                try {
                    const match = /\/([^\/]+\.(?:png|jpg|jpeg|gif|webp))(\?|$)/i.exec(url);
                    return match ? decodeURIComponent(match[1]) : url;
                } catch {
                    return url;
                }
            };
            const sortUrlsByName = (urls) => urls.slice().sort((a, b) => extractName(a).localeCompare(extractName(b), 'ko', { numeric: true }));

            const sortedTopImages = sortUrlsByName(topImageUrls);
            const sortedOthers = sortUrlsByName(otherImageUrls);
            allImageUrls = [...sortedTopImages, ...sortedOthers];

            renderGrid();
            hideLoading();
        } catch (err) {
            console.error('이미지 로딩 실패:', err);
            hideLoading();
            showError();
        } finally {
            isLoading = false;
        }
    }

    function openSlideshow(startIndex) {
        currentSlideIndex = startIndex;
        if (!slideshow) {
            slideshow = document.createElement('div');
            slideshow.className = 'slideshow-overlay';
            slideshow.innerHTML = `
                <div class="slideshow-inner">
                    <div class="slideshow-header">
                        <button class="slideshow-close-btn quick-btn">🔙 닫기</button>
                    </div>
                    <div class="slideshow-content">
                        <button class="slideshow-nav slideshow-prev" id="slideshowPrev">❮</button>
                        <div class="slideshow-image-container">
                            <img class="slideshow-image" src="" alt="">
                            <div class="slideshow-counter">
                                <span id="slideCurrentIndex">1</span> / <span id="slideTotalCount">${allImageUrls.length}</span>
                            </div>
                        </div>
                        <button class="slideshow-nav slideshow-next" id="slideshowNext">❯</button>
                    </div>
                </div>
            `;
            document.body.appendChild(slideshow);
            slideshow.querySelector('.slideshow-close-btn').addEventListener('click', closeSlideshow);
            slideshow.querySelector('#slideshowPrev').addEventListener('click', () => navigateSlide(-1));
            slideshow.querySelector('#slideshowNext').addEventListener('click', () => navigateSlide(1));
            slideshow.addEventListener('click', (e) => {
                if (e.target === slideshow) closeSlideshow();
            });
            document.addEventListener('keydown', handleSlideshowKeydown);
        }
        updateSlideshow();
        slideshow.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function updateSlideshow() {
        if (!slideshow) return;
        const img = slideshow.querySelector('.slideshow-image');
        const currentIndexSpan = slideshow.querySelector('#slideCurrentIndex');
        img.src = allImageUrls[currentSlideIndex];
        img.alt = `갤러리 이미지 ${currentSlideIndex + 1}`;
        currentIndexSpan.textContent = currentSlideIndex + 1;
        applySpecialFocus(img, allImageUrls[currentSlideIndex]);
    }

    function navigateSlide(direction) {
        currentSlideIndex += direction;
        if (currentSlideIndex >= allImageUrls.length) currentSlideIndex = 0;
        else if (currentSlideIndex < 0) currentSlideIndex = allImageUrls.length - 1;
        updateSlideshow();
    }

    function closeSlideshow() {
        if (slideshow) {
            slideshow.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    function handleSlideshowKeydown(e) {
        if (!slideshow || !slideshow.classList.contains('show')) return;
        switch(e.key) {
            case 'Escape':
                closeSlideshow();
                break;
            case 'ArrowLeft':
                navigateSlide(-1);
                break;
            case 'ArrowRight':
                navigateSlide(1);
                break;
        }
    }

    function renderGrid() {
        if (!overlayGrid) return;
        overlayGrid.innerHTML = '';
        if (!allImageUrls.length) {
            overlayGrid.innerHTML = `
                <div style="color: #FFE3F3; text-align: center; padding: 40px; grid-column: 1/-1;">
                    📷 이미지가 없습니다
                </div>`;
            return;
        }

        allImageUrls.forEach((src, idx) => {
            const card = document.createElement('div');
            card.className = 'overlay-card';
            const img = document.createElement('img');
            img.src = src;
            img.alt = `갤러리 이미지 ${idx + 1}`;
            img.loading = 'lazy';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center 30%';
            applySpecialFocus(img, src);
            img.onerror = () => {
                card.style.background = 'rgba(255,0,0,0.2)';
                card.innerHTML = '<div style="color:#fff;text-align:center;padding:20px;">로드 실패</div>';
            };
            card.addEventListener('click', () => openSlideshow(idx));
            card.appendChild(img);
            overlayGrid.appendChild(card);
        });
    }

    function showLoading() {
        if (overlayLoading) overlayLoading.style.display = 'flex';
        if (overlayGrid) overlayGrid.hidden = true;
    }

    function hideLoading() {
        if (overlayLoading) overlayLoading.style.display = 'none';
        if (overlayGrid) overlayGrid.hidden = false;
    }

    function showError() {
        if (overlayGrid) {
            overlayGrid.innerHTML = `
                <div style="color: #FFE3F3; text-align: center; padding: 40px; grid-column: 1/-1;">
                    ❌ 이미지를 불러오는데 실패했습니다<br>
                    잠시 후 다시 시도해주세요
                </div>`;
            overlayGrid.hidden = false;
        }
    }

    function setupEventListeners() {
        const bindOpenBtn = () => {
            openBtn = document.getElementById('openGalleryOverlay');
            if (openBtn) {
                openBtn.addEventListener('click', openOverlay);
            } else {
                setTimeout(bindOpenBtn, 100);
            }
        };
        bindOpenBtn();

        const bindCloseBtn = () => {
            closeBtn = document.getElementById('closeGalleryOverlay');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeOverlay);
            }
        };
        setTimeout(bindCloseBtn, 100);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) {
                closeOverlay();
            }
        });
    }

    function init() {
        ensureOverlayHTML();
        overlay = document.getElementById('galleryOverlay');
        overlayGrid = document.getElementById('overlayGrid');
        overlayLoading = document.getElementById('overlayLoading');
        setupEventListeners();
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });
        }
        renderIndexPreview();
    }

    const spinnerCSS = `
    <style id="gallery-spinner-styles">
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,227,243,0.3);
            border-left-color: #FD028F;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .overlay-loading {
            flex-direction: column;
            gap: 15px;
            font-family: 'DungGeunMo';
            font-size: 1.1rem;
            color: #FFE3F3;
            text-shadow: 0 0 10px rgba(255,227,243,0.6);
        }
        .overlay-loading span {
            animation: pulse 1.5s ease-in-out infinite alternate;
        }
        @keyframes pulse {
            from { opacity: 0.7; }
            to { opacity: 1; }
        }
    </style>`;

    if (!document.getElementById('gallery-spinner-styles')) {
        document.head.insertAdjacentHTML('beforeend', spinnerCSS);
    }

    window.debugGallery = function() {
        console.log('=== 갤러리 디버깅 ===');
        console.log('전체 이미지:', allImageUrls.length);
        console.log('Top 이미지:', topImageUrls.length);
        console.log('버킷 후보:', Array.from(storageBucketCandidates));
        if (allImageUrls.length) {
            console.log('첫 번째 이미지:', allImageUrls[0]);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

/* ===== 스크래치 카드 초기화 ===== */
function initScratchAccountCards() {
  const cards = document.querySelectorAll('.scratch-card');
  if (!cards.length) return;

  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  cards.forEach(card => {
    const strip = card.querySelector('.scratch-strip');
    const canvas = card.querySelector('.scratch-canvas');
    const hint   = card.querySelector('.scratch-hint');
    const copyBtn= card.querySelector('.scratch-copy');
    card.dataset.scratchActive = '0';

    function paintCover() {
      const { width, height } = strip.getBoundingClientRect();
      canvas.style.width  = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width  = Math.max(1, Math.floor(width * DPR));
      canvas.height = Math.max(1, Math.floor(height * DPR));

      const ctx = canvas.getContext('2d');
      ctx.reset && ctx.reset();

      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, '#7c3aed');
      g.addColorStop(.5, '#fd028f');
      g.addColorStop(1, '#60a5fa');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#000';
      const step = 24 * DPR;
      for (let x=-canvas.height; x<canvas.width+canvas.height; x+= step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x+canvas.height, canvas.height);
        ctx.lineTo(x+canvas.height-8*DPR, canvas.height);
        ctx.lineTo(x-8*DPR, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (hint) {
        hint.textContent = '긁어서 보기';
        canvas.addEventListener('pointerdown', () => { hint.style.display = 'none'; }, { once: true });
        canvas.addEventListener('touchstart',   () => { hint.style.display = 'none'; }, { once: true });
      }

      card.classList.remove('revealed');
      erasedArea.sampled = false;
    }

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0, lastY = 0;
    const BRUSH = 20 * DPR;

    const erasedArea = { sampled: false };
    function checkReveal(force=false) {
      if (card.classList.contains('revealed')) return;
      if (!force && erasedArea.sampled) return;
      erasedArea.sampled = true;

      try {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const total = img.data.length / 4;
        let transparent = 0;
        for (let i = 3; i < img.data.length; i += 4) {
          if (img.data[i] < 32) transparent++;
        }
        const ratio = transparent / total;
        if (ratio > 0.25) {
          card.classList.add('revealed');
        }
      } catch(e) {
        // ignore
      }
    }

    function eraseAt(x, y) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.lineWidth = BRUSH*2;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      lastX = x; lastY = y;
    }

    function pointerPos(e) {
      const r = canvas.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return [px * DPR, py * DPR];
    }

    function start(e){
      e.preventDefault();
      card.dataset.scratchActive = '1';
      const [x, y] = pointerPos(e);
      drawing = true;
      lastX = x; lastY = y;
      card.classList.add('scratching');

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, BRUSH, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    function move(e){
      if (!drawing) return;
      const [x, y] = pointerPos(e);
      eraseAt(x, y);
    }
    function end(){
      drawing = false;
      card.dataset.scratchActive = '0';
      checkReveal();
      card.classList.remove('scratching');
    }
    function cancel(){
      drawing = false;
      card.dataset.scratchActive = '0';
      card.classList.remove('scratching');
    }

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    canvas.addEventListener('touchstart', start, {passive:false});
    canvas.addEventListener('touchmove', move, {passive:false});
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', cancel);

    const ro = new ResizeObserver(() => {
      if (!card.classList.contains('revealed')) paintCover();
    });
    ro.observe(strip);

    copyBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      const text = copyBtn.getAttribute('data-copy') || '';
      const ok = await writeToClipboard(text);
      showCopiedToastAt(e, ok ? 'Copied!' : '복사 실패 ㅠㅠ');
    });

    function showCopiedToastAt(e, message = 'Copied!') {
      const point = (e.touches && e.touches[0]) || e;
      let x = point?.clientX, y = point?.clientY;
      if (!x || !y) {
        const r = (e.currentTarget || e.target).getBoundingClientRect();
        x = r.right; y = r.top;
      }
      const el = document.createElement('div');
      el.className = 'scratch-copied scratch-copied--cursor';
      el.textContent = message;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }

    paintCover();
  });

  document.getElementById('revealAllScratch')?.addEventListener('click', () => {
    document.querySelectorAll('.scratch-card').forEach(c => c.classList.add('revealed'));
  });
}

async function writeToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  } catch {
    return false;
  }
}

function initScratchCopy() {
  document.querySelectorAll('.scratch-card').forEach(card => {
    const account = (card.dataset.number || '').trim();
    if (!account) return;

    const toast = (msg='계좌번호 복사됨!') => {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText =
        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);'+
        'padding:8px 12px;border-radius:8px;background:#2d0036;color:#fff4fa;z-index:99999;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 1200);
    };

    const copyHandler = async (e) => {
      if (!card.classList.contains('revealed')) return;
      if (card.dataset.scratchActive === '1') return;
      if (e.target.closest('.scratch-copy')) return;
      if (e.target.closest('.scratch-canvas')) return;

      e.preventDefault();
      const ok = await writeToClipboard(account);
      toast(ok ? '계좌번호 복사됨!' : '복사 실패 😢');
    };

    card.addEventListener('click', copyHandler);
  });
}

let startX = 0;
let startY = 0;

document.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  const diffX = e.touches[0].clientX - startX;
  const diffY = e.touches[0].clientY - startY;

  // 가로 이동이 세로보다 클 때만 기본 동작 막기
  if (Math.abs(diffX) > Math.abs(diffY)) {
    e.preventDefault();
  }
}, { passive: false });


document.addEventListener('DOMContentLoaded', function () {
  const ov = document.getElementById('mmOverlay');
if (ov && ov.parentElement !== document.body) document.body.appendChild(ov);
  initScrollHeader?.();
  scrollToTop() ;
  loadNaverMap?.();
  setTimeout(() => initFirebase?.(), 1000);
  initQuestButtons?.();

  // 눈 기능 시작
  seedBackgroundSnow?.();
  documentSnowSystem.init();
    // ✅ 스크래치 카드
  globalThis.initScratchAccountCards?.();
  globalThis.initScratchCopy?.();

});








