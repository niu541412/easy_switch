function siteFaviconURL(pageUrl, size = 32) {
  const url = new URL(
    notChrome ? 'https://t3.gstatic.cn/faviconV2' : chrome.runtime.getURL('/_favicon/'),
  );
  if (notChrome) {
    url.searchParams.set('client', 'SOCIAL');
    url.searchParams.set('url', pageUrl);
  } else {
    url.searchParams.set('pageUrl', pageUrl);
  }
  url.searchParams.set('size', String(size));
  return url.toString();
}
