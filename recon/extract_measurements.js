// Extractor script to run on both Tab A (Original) and Tab B (Clone)
(() => {
  const getComputed = (el) => {
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tagName: el.tagName.toLowerCase(),
      className: el.className,
      rect: {
        x: Math.round(r.x * 10) / 10,
        y: Math.round(r.y * 10) / 10,
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
      },
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      borderTop: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      borderRight: `${cs.borderRightWidth} ${cs.borderRightStyle} ${cs.borderRightColor}`,
      borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
      borderLeft: `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`,
      borderRadius: cs.borderRadius,
      padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
      gap: cs.gap,
      boxShadow: cs.boxShadow,
    };
  };

  const el = (sel) => document.querySelector(sel);
  const all = (sel) => Array.from(document.querySelectorAll(sel));

  return {
    topBar: getComputed(el('header#top')),
    logo: getComputed(el('.home')),
    searchBar: getComputed(el('.srch')),
    searchInput: getComputed(el('.srch input')),
    helpButton: getComputed(el('[data-act="help"]')),
    bellButton: getComputed(el('[data-act="notifs"]')),
    askStudioButton: getComputed(el('[data-act="ask"]')),
    createButton: getComputed(el('[data-act="create"]')),
    avatarButton: getComputed(el('[data-act="account"]')),
    
    sidebar: getComputed(el('nav#nav')),
    sidebarAvatar: getComputed(el('.nv-av')),
    yourChannelLabel: getComputed(el('.nv-yc')),
    channelName: getComputed(el('.nv-cn')),
    
    navItemDashboard: getComputed(all('.nv-items .ni')[0]),
    navItemContent: getComputed(all('.nv-items .ni')[1]),
    navItemAnalytics: getComputed(all('.nv-items .ni')[2]),
    navItemCommunity: getComputed(all('.nv-items .ni')[3]),
    navItemLanguages: getComputed(all('.nv-items .ni')[4]),
    navItemContentDetection: getComputed(all('.nv-items .ni')[5]),
    navItemEarn: getComputed(all('.nv-items .ni')[6]),
    navItemCustomization: getComputed(all('.nv-items .ni')[7]),
    navItemAudioLibrary: getComputed(all('.nv-items .ni')[8]),
    navItemSettings: getComputed(el('.nv-foot .ni:nth-child(1)')),
    navItemFeedback: getComputed(el('.nv-foot .ni:nth-child(2)')),
    
    pageTitle: getComputed(el('h1.pt')),
    uploadActionBtn: getComputed(el('.ph [data-act="upload"]')),
    goLiveActionBtn: getComputed(el('.ph [data-act="golive"]')),
    createPostActionBtn: getComputed(el('.ph [data-act="newpost"]')),
    
    cardLatestVideo: getComputed(el('.card.dc.lvp[data-v="v0"]')),
    cardLatestVideoTitle: getComputed(el('.card.dc.lvp[data-v="v0"] h2.ch')),
    cardLatestShort: getComputed(el('.card.dc.lvp[data-v="v2"]')),
    cardLatestShortTitle: getComputed(el('.card.dc.lvp[data-v="v2"] h2.ch')),
    cardChannelAnalytics: getComputed(all('.mcol')[1]?.querySelector('.card.dc')),
    cardChannelAnalyticsTitle: getComputed(all('.mcol')[1]?.querySelector('.card.dc h2.ch')),
    cardCreatorInsider: getComputed(el('.card.dc.ci')),
    cardCreatorInsiderTitle: getComputed(el('.card.dc.ci h2.ch')),
    
    dividerCard1: getComputed(el('.card.dc hr')),
    statRowViews: getComputed(all('.card.dc.lvp[data-v="v0"] .kv')[1]),
    statRowCtr: getComputed(all('.card.dc.lvp[data-v="v0"] .kv')[2]),
    trendBadgeUp: getComputed(el('.card.dc.lvp[data-v="v0"] .ti.up')),
    trendBadgeDn: getComputed(el('.card.dc.lvp[data-v="v0"] .ti.dn')),
    cmuButton: getComputed(el('.card.dc.lvp[data-v="v0"] .btn.cmu-p')),
  };
})()
