$(function () {

  /* ------------------------------------------------------------
     0. Section anchor 정의
        index 1 = Section1(Hero), index 2~6 = 상세 화면
     ------------------------------------------------------------ */
  var ANCHORS = [
    'section1',            // 1 : Hero
    'director-industrial', // 2 : 산업단지 태양광 / 조성현
    'director-support',    // 3 : 정부지원사업 / 박도훈&임준길
    'director-esg',        // 4 : RE100·ESG / 최창민
    'director-om',         // 5 : AI O&M·안전 / 김현우
    'director-partner'     // 6 : 영업·파트너 / 장광수
  ];

  var $gnb = $('#gnb');
  var $gnbItems = $('.gnb__item');

  /* 현재 anchor 에 맞춰 GNB 노출 여부 + active 메뉴 갱신 */
  function syncGnb(anchorLink) {
    var isDetail = anchorLink && anchorLink !== 'section1';

    $gnb.toggleClass('is-visible', !!isDetail);

    // 섹션별 포인트 컬러를 CSS 에서 매칭하기 위한 속성
    if (isDetail) {
      $gnb.attr('data-active', anchorLink);
    } else {
      $gnb.removeAttr('data-active');
    }

    $gnbItems.removeClass('is-active');
    if (isDetail) {
      var $active = $gnbItems.filter('[data-anchor="' + anchorLink + '"]').addClass('is-active');
      centerActiveMenu($active[0]);
    }
  }

  /* 모바일 GNB 는 가로 스크롤 한 줄이므로,
     화면 밖에 있는 active 메뉴를 가운데로 끌어온다 */
  function centerActiveMenu(el) {
    if (!el) return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;

    var list = document.querySelector('.gnb__list');
    if (!list || list.scrollWidth <= list.clientWidth) return;

    var lr = list.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    var left = list.scrollLeft + (er.left - lr.left) - (lr.width - er.width) / 2;

    if (list.scrollTo) {
      list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    } else {
      list.scrollLeft = Math.max(0, left);
    }
  }

  /* ------------------------------------------------------------
     1. fullPage.js 초기화

     verticalCentered: false 가 핵심.
     기본값(true)이면 .section 내부가 .fp-tableCell 로 한 번 더
     감싸져서 section 을 flex 컨테이너로 쓰는 상/하 2분할 레이아웃이
     동작하지 않는다. false 로 두어야 .section 이 곧바로
     .hero-upper(가변) + .hero-lower(하단 고정) 구조를 갖는다.
     ------------------------------------------------------------ */
  var fpOptions = {
    anchors: ANCHORS,
    verticalCentered: false,
    scrollingSpeed: 700,
    navigation: false,
    slidesNavigation: false,
    scrollOverflow: false,
    fitToSection: true,
    autoScrolling: true,

    /* [SNAP] 모바일 스냅 ON
       아래 responsiveWidth 를 살리면 768px 미만에서 자동스크롤이 해제되어
       일반 스크롤로 동작한다. 롤백 시 주석만 해제하고
       style.css 의 [SNAP] 표시 블록들을 되돌리면 됨. */
    // responsiveWidth: 768,

    afterRender: function () {
      syncGnb(ANCHORS[$('.section.active').index()] || ANCHORS[0]);
    },

    /* 섹션 진입이 끝난 시점에 메뉴 상태 동기화 */
    afterLoad: function (anchorLink, index) {
      syncGnb(anchorLink || ANCHORS[index - 1]);
    },

    /* 이동이 시작되는 순간 바로 반영해 메뉴가 늦게 따라오지 않도록 */
    onLeave: function (index, nextIndex) {
      syncGnb(ANCHORS[nextIndex - 1]);
    }
  };

  /* 모바일 GNB 는 가로 스크롤 목록이다.
     autoScrolling 이 켜져 있으면 fullPage 가 body 의 touchmove 에
     preventDefault 를 걸어(preventBouncing) 가로 스와이프를 막는다.
     Chrome 은 passive 리스너 강제 적용으로 우연히 동작하지만
     iOS Safari 에서는 실제로 막히므로, 해당 목록을 예외로 등록한다.
     (데스크톱에서는 5개 메뉴가 모두 보여 가로 스크롤이 필요 없고,
      메뉴 위에서 휠 스크롤이 잠기는 부작용만 생기므로 모바일에서만 적용) */
  if (window.matchMedia('(max-width: 768px)').matches) {
    fpOptions.normalScrollElements = '.gnb__list';
  }

  $('#fullpage').fullpage(fpOptions);

  /* ------------------------------------------------------------
     2. 모바일(자동스크롤 해제 상태) 메뉴 active 처리
        fullPage 콜백이 동작하지 않으므로 IntersectionObserver 사용
     ------------------------------------------------------------ */
  if ('IntersectionObserver' in window) {
    var sections = document.querySelectorAll('#fullpage .section');

    var io = new IntersectionObserver(function (entries) {
      if (!$('#fullpage').hasClass('fp-responsive')) return; // PC는 fullPage 콜백이 담당

      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(sections, entry.target);
        syncGnb(ANCHORS[idx]);
      });
    }, { threshold: 0.5 });

    Array.prototype.forEach.call(sections, function (sec) { io.observe(sec); });
  }

  /* ------------------------------------------------------------
     3. Director 카드 인터랙션 (Section 1)
        - 카드 = <div data-target="#anchor">, 내부 버튼 = 실제 <a>
        - PC   : 카드 아무 곳이나 클릭 → 해당 상세 섹션으로 이동
        - 터치 : :hover 가 없으므로 첫 tap = CTA 열기,
                 이후 버튼을 직접 tap 하면 링크대로 이동
     ------------------------------------------------------------ */
  var $cards = $('.director-card');
  var isTouch = window.matchMedia('(hover: none)').matches;

  /* 768px 미만 : 카드가 리스트 형태로 바뀌고 CTA 버튼이 없으므로
     첫 탭에 곧바로 상세 섹션으로 이동한다 */
  function isMobileList() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function goToTarget($card) {
    var target = $card.attr('data-target');
    if (!target) return;

    var idx = ANCHORS.indexOf(target.replace('#', ''));
    if (idx < 0) return;

    // fullPage 가 반응형으로 해제된 상태면 일반 스크롤로 이동
    if ($('#fullpage').hasClass('fp-responsive')) {
      var sec = document.querySelectorAll('#fullpage .section')[idx];
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if ($.fn.fullpage && $.fn.fullpage.moveTo) {
      $.fn.fullpage.moveTo(idx + 1);
    } else {
      location.hash = target.replace('#', '');
    }
  }

  $cards.on('click', function (e) {
    var $card = $(this);

    // 버튼(자세히 보기 / 상담 신청 하기)은 자기 href 대로 동작
    if ($(e.target).closest('.director-card__btn').length) return;

    // 모바일 리스트 : 바로 이동
    if (isMobileList()) {
      goToTarget($card);
      return;
    }

    if (isTouch) {
      var wasActive = $card.hasClass('is-active');
      $cards.not($card).removeClass('is-active');
      if (!wasActive) {
        $card.addClass('is-active');   // 첫 tap : CTA 노출
        return;
      }
      // 이미 열린 카드를 다시 tap → 상세 섹션 이동
    }

    goToTarget($card);
  });

  /* 키보드 접근성 : Enter / Space 로도 이동 */
  $cards.on('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
      e.preventDefault();
      goToTarget($(this));
    }
  });

});