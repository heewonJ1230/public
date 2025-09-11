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

// BGM 관리
const bgmUrls = [
    'https://firebasestorage.googleapis.com/v0/b/hwsghouse.firebasestorage.app/o/BGM%2F80%EB%85%84%EB%8C%80%20%EB%AF%B8%EC%97%B0%EC%8B%9C%20%EA%B2%8C%EC%9E%84%20%20(1).mp3?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/hwsghouse.firebasestorage.app/o/BGM%2F80%EB%85%84%EB%8C%80%20%EB%AF%B8%EC%97%B0%EC%8B%9C%20%EA%B2%8C%EC%9E%84%20%20(Remix).mp3?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/hwsghouse.firebasestorage.app/o/BGM%2F80%EB%85%84%EB%8C%80%20%EB%AF%B8%EC%97%B0%EC%8B%9C%20%EA%B2%8C%EC%9E%84%20.mp3?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/hwsghouse.firebasestorage.app/o/BGM%2FUntitled.mp3?alt=media'
];

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
    shuffledPlaylist = shuffleArray([0, 1, 2, 3]);
    currentBgmIndex = 0;
    
    const bgmPlayer = document.getElementById('bgmPlayer');
    const bgmToggle = document.getElementById('bgmToggle');
    const bgmNext = document.getElementById('bgmNext');
    const bgmPrev = document.getElementById('bgmPrev');
    
    bgmPlayer.volume = 0.3;
    loadCurrentTrack();
    
    bgmToggle.addEventListener('click', function() {
        if (isPlaying) {
            bgmPlayer.pause();
            isPlaying = false;
        } else {
            bgmPlayer.play().catch(e => {
                console.log('Play prevented:', e);
            });
            isPlaying = true;
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
        navBgmToggle.addEventListener('click', function() {
            if (isPlaying) {
                bgmPlayer.pause();
                isPlaying = false;
            } else {
                bgmPlayer.play().catch(e => {
                    console.log('Play prevented:', e);
                });
                isPlaying = true;
            }
            updateBgmButtonsState();
        });
    }

    if (navBgmNext) navBgmNext.addEventListener('click', nextTrack);
    if (navBgmPrev) navBgmPrev.addEventListener('click', prevTrack);
}

function loadCurrentTrack() {
    const bgmPlayer = document.getElementById('bgmPlayer');
    const trackIndex = shuffledPlaylist[currentBgmIndex];
    bgmPlayer.src = bgmUrls[trackIndex];
    
    if (isPlaying) {
        bgmPlayer.play().catch(e => {
            console.log('Auto-play prevented:', e);
        });
    }
}

function nextTrack() {
    currentBgmIndex = (currentBgmIndex + 1) % shuffledPlaylist.length;
    
    if (currentBgmIndex === 0) {
        shuffledPlaylist = shuffleArray([0, 1, 2, 3]);
    }
    
    loadCurrentTrack();
    updateBgmButtonsState();
}

function prevTrack() {
    currentBgmIndex = currentBgmIndex === 0 ? shuffledPlaylist.length - 1 : currentBgmIndex - 1;
    loadCurrentTrack();
    updateBgmButtonsState();
}

function startAutoPlay() {
    const bgmPlayer = document.getElementById('bgmPlayer');
    
    bgmPlayer.play().then(() => {
        isPlaying = true;
        updateBgmButtonsState();
        console.log('BGM auto-play started');
    }).catch(e => {
        console.log('Auto-play prevented:', e);
        document.addEventListener('click', function startOnFirstClick() {
            bgmPlayer.play().then(() => {
                isPlaying = true;
                updateBgmButtonsState();
            });
            document.removeEventListener('click', startOnFirstClick);
        }, { once: true });
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
        
        const firebaseConfig = {
            apiKey: configParts.key1 + configParts.key2,
            authDomain: `${configParts.domain}.firebaseapp.com`,
            databaseURL: `https://${configParts.domain}-default-rtdb.${configParts.region}.firebasedatabase.app`,
            projectId: configParts.domain,
            storageBucket: `${configParts.domain}.firebasestorage.app`,
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
    
    const STORAGE_BUCKET = 'hwsghouse.firebasestorage.app';
    
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

    // Firebase Storage 헬퍼 함수들
    function getStorage() {
        try {
            return firebase.storage();
        } catch (e) {
            console.log('Firebase Storage 접근 불가:', e);
            return null;
        }
    }

    function getUrlKey(url) {
        try {
            const match = /\/o\/([^?]+)/.exec(url);
            return match ? decodeURIComponent(match[1]) : url;
        } catch (e) {
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
        const bucket = STORAGE_BUCKET;
        const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
        const urls = [];
        let pageToken = null;
        let guard = 0;

        const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;

        do {
            try {
                const qs = new URLSearchParams({ prefix: normalized });
                if (pageToken) qs.set('pageToken', pageToken);

                console.log(`Firebase REST 요청: ${base}?${qs.toString()}`);
                
                const response = await fetch(`${base}?${qs.toString()}`);
                
                if (!response.ok) {
                    console.error(`REST API 실패: ${response.status} ${response.statusText}`);
                    break;
                }

                const data = await response.json();
                const items = data.items || [];

                console.log(`${prefix} 폴더에서 ${items.length}개 파일 발견`);

                for (const item of items) {
                    urls.push(`${base}/${encodeURIComponent(item.name)}?alt=media`);
                }

                pageToken = data.nextPageToken || null;
            } catch (error) {
                console.error('REST 요청 중 오류:', error);
                break;
            }
        } while (pageToken && ++guard < 100);

        return urls;
    }

    async function listAllUrls(refPath) {
        const storage = getStorage();
        if (!storage) return [];

        const clean = String(refPath || '').replace(/^\/+/, '');

        // 1) Firebase SDK 시도
        try {
            const ref = storage.ref(clean);
            const urls = await listFromRef(ref);
            if (urls && urls.length) return urls;
        } catch (e) {
            console.log('SDK 접근 실패, REST API 시도:', e);
        }

        // 2) REST API 시도
        try {
            const urls = await listViaRest(clean);
            if (urls && urls.length) return urls;
        } catch (e) {
            console.log('REST API 접근 실패:', e);
        }

        return [];
    }

    function pickRandomImages(urls, count) {
        if (!urls || urls.length === 0) return [];
        
        const picked = new Set();
        const needed = Math.min(count, urls.length);
        
        while (picked.size < needed) {
            picked.add(Math.floor(Math.random() * urls.length));
        }
        
        return [...picked].map(idx => urls[idx]);
    }

    function applySpecialFocus(imgElement, src) {
        // 7.png의 경우 얼굴 위쪽으로 포커스
        if (src.includes('Photo%2Ftopimages%2F7.png') || src.includes('/Photo/topimages/7.png')) {
            imgElement.style.objectPosition = '50% 10%';
        }
    }

    // 인덱스 페이지 갤러리 섹션 미리보기 렌더링
    function renderIndexPreview() {
        console.log('인덱스 갤러리 미리보기 렌더링 시작');
        
        const container = document.getElementById('indexGalleryContainer');
        if (!container) {
            console.warn('indexGalleryContainer 요소를 찾을 수 없음 - 나중에 다시 시도');
            setTimeout(renderIndexPreview, 500);
            return;
        }

        // topimages 로드 후 렌더링
        listAllUrls('Photo/topimages')
            .then(urls => {
                topImageUrls = urls;
                console.log('Top 이미지 로딩 완료:', topImageUrls.length);

                // fallback URLs
                if (!topImageUrls.length) {
                    console.log('Firebase에서 로드 실패, fallback URL 사용');
                    const fallbackUrls = [
                        '0Start.png', '1.png', '2.png', '3.png', '4.png', 
                        '5.png', '6.png', '7.png', '8.png', '9.png', '10.png'
                    ].map(name => 
                        `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/Photo%2Ftopimages%2F${encodeURIComponent(name)}?alt=media`
                    );
                    topImageUrls = fallbackUrls;
                }

                // 랜덤 4개 선택
                const randomImages = pickRandomImages(topImageUrls, 4);
                console.log('랜덤 선택된 이미지:', randomImages.length);
                
                // more 카드 보존
                const moreCard = document.getElementById('indexGalleryMore');
                const moreCardClone = moreCard ? moreCard.cloneNode(true) : null;
                
                // 컨테이너 초기화
                container.innerHTML = '';

                // 랜덤 이미지 카드 생성
                randomImages.forEach((src, idx) => {
                    const card = document.createElement('div');
                    card.className = 'gallery-item';

                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = `갤러리 미리보기 ${idx + 1}`;
                    img.loading = 'lazy';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.objectPosition = 'center 30%';

                    // 7.png 특별 처리
                    applySpecialFocus(img, src);

                    // 클릭 시 오버레이 열기
                    card.addEventListener('click', openOverlay);

                    card.appendChild(img);
                    container.appendChild(card);
                });

                // more 카드 마지막에 다시 추가
                if (moreCardClone) {
                    container.appendChild(moreCardClone);
                }

                console.log('인덱스 미리보기 완료:', randomImages.length, '개 이미지');
            })
            .catch(error => {
                console.error('인덱스 미리보기 렌더링 실패:', error);
            });
    }

    // 오버레이 HTML 생성
    function ensureOverlayHTML() {
        if (!document.getElementById('galleryOverlay')) {
            const overlayHTML = `
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
                /* PC 버전 갤러리 오버레이 70% 컨테이너 */
                @media (min-width: 1024px) {
                    .gallery-overlay .overlay-inner {
                        max-width: 70%;
                        margin: 0 auto;
                        left: 15%;
                        right: 15%;
                    }
                }
                
                .gallery-overlay .overlay-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                
                .gallery-overlay .section-title {
                    margin: 0;
                    text-align: center;
                    flex: 1;
                }
                
                .overlay-close-btn {
                    flex-shrink: 0;
                }
            </style>`;
            document.body.insertAdjacentHTML('beforeend', overlayHTML);
        }
    }

    // 오버레이 열기
    async function openOverlay() {
        console.log('갤러리 오버레이 열기');

        if (!overlay) return;

        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // 이미지 로딩
        if (!allImageUrls.length) {
            await loadAllImages();
        } else {
            renderGrid();
            hideLoading();
        }
    }

    // 오버레이 닫기
    function closeOverlay() {
        if (!overlay) return;

        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // 전체 이미지 로딩
    async function loadAllImages() {
        if (isLoading) return;
        isLoading = true;

        console.log('모든 이미지 로딩 시작');

        try {
            showLoading();

            // 1) topimages 먼저
            if (!topImageUrls.length) {
                topImageUrls = await listAllUrls('Photo/topimages');
            }
            console.log('Top 이미지들:', topImageUrls.length);

            // 2) Photo/ 전체 
            const allPhotoUrls = await listAllUrls('Photo');
            console.log('전체 Photo 이미지들:', allPhotoUrls.length);

            // 이미지 URL을 이름으로 정렬하는 함수
            function sortUrlsByName(urls) {
                return urls.sort((a, b) => {
                    const nameA = getImageName(a).toLowerCase();
                    const nameB = getImageName(b).toLowerCase();
                    return nameA.localeCompare(nameB, 'ko', { numeric: true });
                });
            }

            // URL에서 파일명 추출
            function getImageName(url) {
                try {
                    const match = /\/([^\/]+\.(?:png|jpg|jpeg|gif|webp))(\?|$)/i.exec(url);
                    return match ? decodeURIComponent(match[1]) : url;
                } catch (e) {
                    return url;
                }
            }

            // topimages 이름순 정렬
            const sortedTopImages = sortUrlsByName(topImageUrls);
            
            // Photo/ 전체에서 topimages 제외하고 이름순 정렬
            const topKeys = new Set(topImageUrls.map(getUrlKey));
            const otherImageUrls = allPhotoUrls.filter(url => !topKeys.has(getUrlKey(url)));
            const sortedOtherImages = sortUrlsByName(otherImageUrls);

            // 최종 배열: topimages(이름순) + 나머지 이미지들(이름순)
            allImageUrls = [...sortedTopImages, ...sortedOtherImages];

            console.log('최종 이미지 수:', allImageUrls.length);
            console.log('첫 번째 이미지:', allImageUrls[0]);

            renderGrid();
            hideLoading();

        } catch (error) {
            console.error('이미지 로딩 실패:', error);
            hideLoading();
            showError();
        } finally {
            isLoading = false;
        }
    }

    // 슬라이드쇼 오버레이 열기
    function openSlideshow(startIndex) {
        currentSlideIndex = startIndex;
        
        // 슬라이드쇼 HTML 생성
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

            // 슬라이드쇼 이벤트 리스너
            slideshow.querySelector('.slideshow-close-btn').addEventListener('click', closeSlideshow);
            slideshow.querySelector('#slideshowPrev').addEventListener('click', () => navigateSlide(-1));
            slideshow.querySelector('#slideshowNext').addEventListener('click', () => navigateSlide(1));
            
            // 배경 클릭으로 닫기
            slideshow.addEventListener('click', (e) => {
                if (e.target === slideshow) {
                    closeSlideshow();
                }
            });

            // ESC 키로 닫기
            document.addEventListener('keydown', handleSlideshowKeydown);
        }

        updateSlideshow();
        slideshow.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 슬라이드쇼 업데이트
    function updateSlideshow() {
        if (!slideshow) return;

        const img = slideshow.querySelector('.slideshow-image');
        const currentIndexSpan = slideshow.querySelector('#slideCurrentIndex');
        
        img.src = allImageUrls[currentSlideIndex];
        img.alt = `갤러리 이미지 ${currentSlideIndex + 1}`;
        currentIndexSpan.textContent = currentSlideIndex + 1;

        // 7.png 특별 처리
        applySpecialFocus(img, allImageUrls[currentSlideIndex]);
    }

    // 슬라이드 내비게이션
    function navigateSlide(direction) {
        currentSlideIndex += direction;
        
        if (currentSlideIndex >= allImageUrls.length) {
            currentSlideIndex = 0;
        } else if (currentSlideIndex < 0) {
            currentSlideIndex = allImageUrls.length - 1;
        }
        
        updateSlideshow();
    }

    // 슬라이드쇼 닫기
    function closeSlideshow() {
        if (slideshow) {
            slideshow.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 슬라이드쇼 키보드 핸들러
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

    // 그리드 렌더링
    function renderGrid() {
        if (!overlayGrid) return;

        console.log('오버레이 그리드 렌더링 시작:', allImageUrls.length);

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

            // 7.png 특별 처리
            applySpecialFocus(img, src);

            // 에러 처리
            img.onerror = function() {
                console.warn('이미지 로드 실패:', src);
                card.style.background = 'rgba(255,0,0,0.2)';
                card.innerHTML = '<div style="color: #fff; text-align: center; padding: 20px;">로드 실패</div>';
            };

            // 클릭 시 슬라이드쇼 오버레이 열기
            card.addEventListener('click', () => openSlideshow(idx));

            card.appendChild(img);
            overlayGrid.appendChild(card);
        });

        console.log('그리드 렌더링 완료');
    }

    // UI 상태 관리 함수들
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

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 갤러리 열기 버튼
        const bindOpenBtn = () => {
            openBtn = document.getElementById('openGalleryOverlay');
            if (openBtn) {
                openBtn.addEventListener('click', openOverlay);
                console.log('갤러리 열기 버튼 연결됨');
            } else {
                setTimeout(bindOpenBtn, 100);
            }
        };
        bindOpenBtn();

        // 갤러리 닫기 버튼 (동적 생성)
        const bindCloseBtn = () => {
            closeBtn = document.getElementById('closeGalleryOverlay');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeOverlay);
                console.log('갤러리 닫기 버튼 연결됨');
            }
        };
        setTimeout(bindCloseBtn, 100);

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) {
                closeOverlay();
            }
        });
    }

    // 초기화
    function init() {
        console.log('갤러리 시스템 초기화 시작');
        
        ensureOverlayHTML();
        
        // DOM 요소 바인딩
        overlay = document.getElementById('galleryOverlay');
        overlayGrid = document.getElementById('overlayGrid');
        overlayLoading = document.getElementById('overlayLoading');
        
        setupEventListeners();
        
        // 오버레이 배경 클릭으로 닫기
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeOverlay();
                }
            });
        }
        
        // 인덱스 미리보기 렌더링
        renderIndexPreview();
    }

    // 스피너 CSS 추가
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

    // CSS 주입
    if (!document.getElementById('gallery-spinner-styles')) {
        document.head.insertAdjacentHTML('beforeend', spinnerCSS);
    }

    // 디버깅 함수
    window.debugGallery = function() {
        console.log('=== 갤러리 디버깅 ===');
        console.log('전체 이미지:', allImageUrls.length);
        console.log('Top 이미지:', topImageUrls.length);
        console.log('Firebase Storage:', !!getStorage());
        console.log('오버레이 요소:', !!overlay);
        
        if (allImageUrls.length) {
            console.log('첫 번째 이미지:', allImageUrls[0]);
        }
    };

    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

      /* ☝🏻☝🏻☝🏻☝🏻☝🏻☝🏻☝🏻=====================
    * 🖼️🖼️🖼️🖼️Index 끗 갤러리 오버레이🖼️🖼️🖼️🖼️
    /* ☝🏻☝🏻☝🏻☝🏻☝🏻☝🏻☝🏻=====================
    * ===================== */

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

    // 덮개 그리기
    function paintCover() {
      const { width, height } = strip.getBoundingClientRect();
      // CSS 크기
      canvas.style.width  = width + 'px';
      canvas.style.height = height + 'px';
      // 실제 캔버스 크기(레티나)
      canvas.width  = Math.max(1, Math.floor(width * DPR));
      canvas.height = Math.max(1, Math.floor(height * DPR));

      const ctx = canvas.getContext('2d');
      ctx.reset && ctx.reset();

      // 배경(그라디언트)
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, '#7c3aed');   // 보라
      g.addColorStop(.5, '#fd028f');  // 핑크
      g.addColorStop(1, '#60a5fa');   // 블루
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 메탈 느낌 스트라이프
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
        // 👉 클릭이나 터치가 발생하면 힌트 바로 숨기기
        canvas.addEventListener('pointerdown', () => { hint.style.display = 'none'; }, { once: true });
        canvas.addEventListener('touchstart',   () => { hint.style.display = 'none'; }, { once: true });
        }
      // 상태 초기화
      card.classList.remove('revealed');
      erasedArea.sampled = false;
    }

    // 지우기(스크래치) 설정
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0, lastY = 0;
    const BRUSH = 20 * DPR;

    // 지워진 비율 계산(너무 자주 호출하면 느려지니 간헐적으로)
    const erasedArea = { sampled: false };
    function checkReveal(force=false) {
      if (card.classList.contains('revealed')) return;
      if (!force && erasedArea.sampled) return; // 한 번만
      erasedArea.sampled = true;

      try {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const total = img.data.length / 4;
        let transparent = 0;
        // 알파가 작으면(=이미 긁힌 부분) 카운트
        for (let i = 3; i < img.data.length; i += 4) {
          if (img.data[i] < 32) transparent++;
        }
        const ratio = transparent / total;
        if (ratio > 0.25) {
          card.classList.add('revealed');
        }
      } catch(e) {
        // 보안상 실패하면 버튼으로 대체
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
      const [x, y] = pointerPos(e);
      drawing = true;
      lastX = x; lastY = y;

      // 👉 긁는 동안 버튼 보여주기
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
    function end(){ drawing = false; checkReveal(); card.classList.remove('scratching'); }


    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    // 터치 호환(일부 브라우저)
    canvas.addEventListener('touchstart', start, {passive:false});
    canvas.addEventListener('touchmove',  move, {passive:false});
    window.addEventListener('touchend',   end);

    // 리사이즈 시 덮개 리페인트
    const ro = new ResizeObserver(() => {
      if (!card.classList.contains('revealed')) paintCover();
    });
    ro.observe(strip);

    // 복사 버튼
    copyBtn?.addEventListener('click', async (e) => {
      const text = copyBtn.getAttribute('data-copy') || '';
      try { await navigator.clipboard.writeText(text); } catch {}

      showCopiedToastAt(e, 'Copied!'); // ← 커서/터치 좌표로 토스트
    });


    // 커서 옆 토스트
    function showCursorToast(x, y, message){
      const el = document.createElement('div');
      el.className = 'scratch-copied scratch-copied--cursor';
      el.textContent = message || 'Copied!';
      el.style.left = `${Math.max(4, x)}px`;
      el.style.top  = `${Math.max(4, y)}px`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  


    // 헬퍼 함수 (initScratchAccountCards 안에 추가해도 되고, 밖에 두어도 됩니다)
    function showCopiedToast(container, message){
      const el = document.createElement('div');
      el.className = 'scratch-copied';
      el.textContent = message || 'copied';
      container.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
    function showCopiedToastAt(e, message = 'Copied!') {
      const point = (e.touches && e.touches[0]) || e;
      let x = point?.clientX, y = point?.clientY;

      // 좌표 없으면 버튼 기준으로
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


    // 최초 페인트
    paintCover();
  });

    
  // 전체 공개 버튼
  document.getElementById('revealAllScratch')?.addEventListener('click', () => {
    document.querySelectorAll('.scratch-card').forEach(c => c.classList.add('revealed'));
  });
}

// 안전한 클립보드 복사(폴백 포함)
async function writeToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // 폴백: 임시 textarea 이용
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

    const strip = card.querySelector('.scratch-strip');
    const numEl = card.querySelector('.scratch-number');
    // 버튼은 initScratchAccountCards 안에서 이미 별도 핸들러가 있어 중복 방지 차원에서 제외
    // const btn = card.querySelector('.scratch-copy');

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
      // 아직 가려져 있으면(스크래치 덮개 남아있으면) 무시
      if (!card.classList.contains('revealed')) return;
      // 버튼 자체 클릭은 버튼 전용 핸들러에 맡기기(중복 토스트 방지)
      if (e.target.closest('.scratch-copy')) return;

      e.preventDefault();
      const ok = await writeToClipboard(account);
      toast(ok ? '계좌번호 복사됨!' : '복사 실패 😢');
    };

    strip && strip.addEventListener('click', copyHandler);
    numEl && numEl.addEventListener('click', copyHandler);
    // btn은 기존 핸들러 사용(커서 위치 토스트 유지)
  });
}

// ☝🏻☝🏻✅ 스크래치 카드 - 끗


// ===== gs:// -> https 변환 (Firebase Storage) =====
function gsToHttps(gsUrl){
  const m = /^gs:\/\/([^\/]+)\/(.+)$/.exec(gsUrl || '');
  if(!m) return gsUrl;
  const bucket = m[1];
  const path = m[2].split('/').map(encodeURIComponent).join('%2F');
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;
}

// ===== 핀치줌(오버레이 내부 전용) =====
class PinchZoom {
  constructor(canvas, img){
    this.canvas = canvas;
    this.img = img;
    this.scale = 1; this.minScale = 1; this.maxScale = 4;
    this.tx = 0; this.ty = 0;
    this.prevDistance = 0;
    this.pointers = new Map();
    this.lastTap = 0;

    this._down = e => { canvas.setPointerCapture?.(e.pointerId); this.pointers.set(e.pointerId, e); };
    this._move = e => {
      if(!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, e);
      const pts = Array.from(this.pointers.values());
      if(pts.length === 2){
        e.preventDefault();
        const [p1,p2] = pts;
        const dist = Math.hypot(p1.clientX-p2.clientX, p1.clientY-p2.clientY);
        if(this.prevDistance === 0) this.prevDistance = dist;
        const factor = dist / this.prevDistance; this.prevDistance = dist;
        this._zoomAt(factor, (p1.clientX+p2.clientX)/2, (p1.clientY+p2.clientY)/2);
      } else if(pts.length === 1 && this.scale > 1){
        e.preventDefault();
        this.tx += (e.movementX||0);
        this.ty += (e.movementY||0);
        this._clamp(); this._apply();
      }
    };
    this._up = e => { this.pointers.delete(e.pointerId); if(this.pointers.size<2) this.prevDistance=0; };
    this._wheel = e => {
      // 트랙패드 수평/수직 스크롤은 팬, Ctrl/Cmd/Shift + 스크롤은 줌
      if(!(e.ctrlKey || e.metaKey || e.shiftKey)){
        if(this.scale>1){ e.preventDefault(); this.tx -= e.deltaX; this.ty -= e.deltaY; this._clamp(); this._apply(); }
        return;
      }
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.1 : 0.9;
      this._zoomAt(f, e.clientX, e.clientY);
    };
    this._tap = e => {
      const now = performance.now();
      if(now - this.lastTap < 300){
        if(this.scale > 1){ this.scale=1; this.tx=this.ty=0; }
        else { this.scale=2; this._zoomAt(1, e.clientX, e.clientY); }
        this._clamp(); this._apply();
      }
      this.lastTap = now;
    };

    canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move, {passive:false});
    window.addEventListener('pointerup', this._up);
    canvas.addEventListener('wheel', this._wheel, {passive:false});
    canvas.addEventListener('click', this._tap);
  }
  _zoomAt(factor, cx, cy){
    const before = this.scale;
    let next = Math.max(this.minScale, Math.min(this.maxScale, before*factor));
    factor = next / before; if(factor === 1) return;

    const rect = this.canvas.getBoundingClientRect();
    const ox = cx - (rect.left + rect.width/2);
    const oy = cy - (rect.top + rect.height/2);
    this.tx = (this.tx - ox)*factor + ox;
    this.ty = (this.ty - oy)*factor + oy;
    this.scale = next; this._clamp(); this._apply();
  }
  _clamp(){
    const rect = this.canvas.getBoundingClientRect();
    const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
    if(!iw || !ih) return;
    const displayH = rect.height * this.scale;
    const displayW = displayH * (iw/ih);
    const maxX = Math.max(0, (displayW - rect.width)/2);
    const maxY = Math.max(0, (displayH - rect.height)/2);
    this.tx = Math.max(-maxX, Math.min(maxX, this.tx));
    this.ty = Math.max(-maxY, Math.min(maxY, this.ty));
  }
  _apply(){
    this.img.style.transform = `translate(calc(-50% + ${this.tx}px), calc(-50% + ${this.ty}px)) scale(${this.scale})`;
  }
  zoom(delta){ this._zoomAt(delta>0?1.1:0.9, window.innerWidth/2, window.innerHeight/2); }
  reset(){ this.scale=1; this.tx=this.ty=0; this._apply(); }
}

// ===== 오버레이 컨트롤 =====
(function initFloorOverlay(){
  const root = document.getElementById('pzOverlay');
  const backdrop = document.getElementById('pzBackdrop');
  const closeBtn = document.getElementById('pzClose');
  const titleEl = document.getElementById('pzTitle');
  const canvas = document.getElementById('pzCanvas');
  const img = document.getElementById('pzImage');
  const zoomIn = document.getElementById('pzZoomIn');
  const zoomOut = document.getElementById('pzZoomOut');
  const zoomReset = document.getElementById('pzZoomReset');

  let pz = null;

  function openOverlay(title, gsUrl){
    titleEl.textContent = title || '';
    img.src = gsToHttps(gsUrl);
    img.onload = () => {
      pz = new PinchZoom(canvas, img);
      root.classList.add('show');
      document.body.style.overflow = 'hidden';
    };
  }
  function closeOverlay(){
    root.classList.remove('show');
    document.body.style.overflow = '';
    // 이벤트/상태 정리
    pz && pz.reset();
    pz = null;
  }

  // 버튼 바인딩
  zoomIn.addEventListener('click', ()=> pz && pz.zoom(+1));
  zoomOut.addEventListener('click', ()=> pz && pz.zoom(-1));
  zoomReset.addEventListener('click', ()=> pz && pz.reset());
  closeBtn.addEventListener('click', closeOverlay);
  backdrop.addEventListener('click', closeOverlay);
  window.addEventListener('keydown', e => { if(e.key === 'Escape') closeOverlay(); });

  // 트리거 바인딩 (오시는 길 섹션의 버튼들)
  document.querySelectorAll('.floor-open').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openOverlay(btn.getAttribute('data-title'), btn.getAttribute('data-gs'));
    });
  });
})();


/* 👇🏻👇🏻👇🏻👇🏻👇🏻👇🏻=========================
 * 📤 Guest Upload (모바일 전용) 시작
 * 📤📤📤📤📤📤========================= */
(function () {
  const input = document.getElementById('guestUploadInput');
  const btn   = document.getElementById('guestUploadBtn');
  const list  = document.getElementById('guestUploadList');
  const block = document.getElementById('guestUploadDesktopBlock');
    // 📌 업로드 루트(GS URL → 폴더명만 뽑아씀)
  const GUEST_UPLOAD_GS = 'gs://hwsghouse.firebasestorage.app/hagack';
  const UPLOAD_PREFIX = (function(gs){
    const m = /^gs:\/\/[^/]+\/(.+)$/.exec(gs||'');
    return (m ? m[1] : 'hagack').replace(/^\/+|\/+$/g,''); // → "hagack"
  })(GUEST_UPLOAD_GS);


  if (!input || !btn || !list) return;

  // 휴대폰/태블릿 판별 (실사용용으로 충분한 2중 체크)
  const ua = navigator.userAgent || '';
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua);
  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
  const isMobile = (isMobileUA || isCoarsePointer) && isTouch;

  // 데스크톱 차단 UI
  if (!isMobile) {
    input.disabled = true;
    btn.disabled = true;
    block.hidden = false;
  }

  // 드래그&드롭 업로드도 PC에서 막기
  window.addEventListener('dragover', e => { if (!isMobile) { e.preventDefault(); } }, { passive:false });
  window.addEventListener('drop',     e => { if (!isMobile) { e.preventDefault(); } }, { passive:false });

  // 설정값
  const MAX_FILES      = 10;                 // 한 번에 최대 10장
  const CEILING_MB     = 100;                // 100MB 이하 보장 (요청 사항)
  const MAX_DIMENSION  = 4096;               // 너무 큰 원본은 축소
  const PREFERRED_MIME = supportsWebP() ? 'image/webp' : 'image/jpeg';

  function supportsWebP() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext && c.toDataURL('image/webp').indexOf('data:image/webp') === 0);
    } catch { return false; }
  }

  // 유틸
  const fmt = (bytes) => {
    const kb = 1024, mb = kb*1024;
    if (bytes >= mb) return (bytes/mb).toFixed(2) + ' MB';
    if (bytes >= kb) return (bytes/kb).toFixed(1) + ' KB';
    return bytes + ' B';
  };
  const ceilBytes = CEILING_MB * 1024 * 1024;

  // 이미지 로드 → 비트맵(가능하면 EXIF 방향 반영)
  async function loadToBitmap(file) {
    if ('createImageBitmap' in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {}
    }
    // Fallback: <img>
    const img = document.createElement('img');
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = URL.createObjectURL(file);
    await img.decode().catch(()=>{});
    // canvas 그리기를 위해 비트맵 유사 객체 반환
    return img;
  }

  // 브라우저 내 압축 (차례대로 품질/해상도를 낮추며 ceiling 이하가 될때까지)
  async function compressImage(file) {
    // HEIC/HEIF 등 브라우저가 못 여는 건 제외
    if (!/^image\/(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.type)) {
      throw new Error('이미지 파일만 업로드할 수 있어요.');
    }
    let bmp = await loadToBitmap(file);
    let w = bmp.width, h = bmp.height;

    // 너무 큰 이미지는 축소
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    if (scale < 1) { w = Math.round(w*scale); h = Math.round(h*scale); }

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.drawImage(bmp, 0, 0, w, h);

    // 1차 인코딩
    let quality = 0.92;
    let blob = await new Promise(res => canvas.toBlob(res, PREFERRED_MIME, quality));

    // 사이즈가 ceiling 넘으면 점진적으로 줄이기
    let guard = 0;
    while (blob && blob.size > ceilBytes && guard++ < 10) {
      if (quality > 0.5) {
        quality -= 0.1; // 품질 먼저 낮춤
      } else {
        // 품질을 충분히 낮췄는데도 크면 해상도 축소
        w = Math.round(w * 0.85);
        h = Math.round(h * 0.85);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(bmp, 0, 0, w, h);
      }
      blob = await new Promise(res => canvas.toBlob(res, PREFERRED_MIME, quality));
    }

    if (!blob) throw new Error('이미지 압축 실패');
    return blob;
  }

  // Firebase Storage 참조 얻기 (이미 index.html에서 compat SDK 로드됨)
  function getStorageRef(path) {
    if (typeof firebase === 'undefined' || !firebase.storage) {
      throw new Error('Firebase Storage를 사용할 수 없습니다.');
    }
    return firebase.storage().ref(path);
  }

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
    list.appendChild(wrap);
    return {
      bar: wrap.querySelector('.upload-bar > span'),
      status: wrap.querySelector('.upload-status')
    };
  }

  async function doUpload(files) {
    if (!files || !files.length) return;
    const arr = Array.from(files).slice(0, MAX_FILES);

    list.setAttribute('aria-busy', 'true');

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

        const ref = getStorageRef(path);
        const task = ref.put(compressed, meta);

        await new Promise((resolve, reject) => {
          task.on('state_changed', (snap) => {
            const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
            row.bar.style.width = pct.toFixed(1) + '%';
          }, reject, resolve);
        });

        row.bar.style.width = '100%';
        row.status.className = 'upload-done';
        row.status.textContent = `업로드 완료 (${fmt(compressed.size)}, ${took}s)`;
      } catch (err) {
        console.error(err);
        row.status.className = 'upload-error';
        row.status.textContent = `업로드 실패: ${err.message || err}`;
      }
    }

    list.setAttribute('aria-busy', 'false');
  }

  // 버튼 클릭 → 파일 선택 트리거 (모바일만)
  btn.addEventListener('click', () => {
    if (!isMobile) return;
    input.click();
  });

  // 파일 선택 시 바로 업로드
  input.addEventListener('change', (e) => {
    if (!isMobile) return;
    if (!e.target.files || !e.target.files.length) return;
    doUpload(e.target.files);
    // iOS에서 같은 파일 재선택 허용
    e.target.value = '';
  });
})();

/* ==== Memorized Memories: hagack/ 목록 → 가로 스크롤 & 오버레이 ==== */
(function(){
  const UPLOAD_PREFIX = 'hagack'; // gs://hwsghouse.firebasestorage.app/hagack

  let files = [];     // {url, time}
  let cur = 0;        // overlay current index

  // 외부에서 초기화 타이밍 맞춰 부르기 위함
  window.loadMemorizedMemories = async function(){
    try {
      if (typeof firebase === 'undefined' || !firebase.storage) return;
      const rail = document.getElementById('mmRail');
      if (!rail) return;

      files = [];
      const root = firebase.storage().ref(UPLOAD_PREFIX);

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

document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive:false });


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
  initScratchAccountCards?.();
  initScratchCopy();

});

// Allow copying account number by clicking the number area even under the cover
document.addEventListener('click', async (e) => {
  const card = e.target.closest?.('.scratch-card');
  if (!card) return;
  // Skip if already revealed; original handler will cover this case
  if (card.classList.contains('revealed')) return;
  // Ignore dedicated copy button (handled elsewhere)
  if (e.target.closest('.scratch-copy')) return;

  const stripEl = e.target.closest('.scratch-strip');
  const numEl = card.querySelector('.scratch-number');
  const numClicked = e.target.closest?.('.scratch-number');

  // Only act when the click is on the number element or inside its rect within the strip
  let insideNumber = false;
  if (numClicked) {
    insideNumber = true;
  } else if (stripEl && numEl) {
    const x = e.clientX, y = e.clientY;
    if (x != null && y != null) {
      const r = numEl.getBoundingClientRect();
      insideNumber = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }
  }
  if (!insideNumber) return;

  const account = (card.dataset.number || '').trim();
  if (!account) return;

  e.preventDefault();
  const ok = await writeToClipboard(account);

  // Lightweight toast
  const t = document.createElement('div');
  t.textContent = ok ? '계좌번호 복사됨' : '복사 실패';
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 12px;border-radius:8px;background:#2d0036;color:#fff4fa;z-index:99999;';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1200);
});
