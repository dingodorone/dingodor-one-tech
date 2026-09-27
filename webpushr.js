(function (window, document, tagName, id) {
  if (typeof window.webpushr !== 'undefined') return;

  window.webpushr = window.webpushr || function () {
    (window.webpushr.q = window.webpushr.q || []).push(arguments);
  };

  const firstScript = document.getElementsByTagName(tagName)[0];
  const script = document.createElement(tagName);
  script.id = id;
  script.async = true;
  script.src = 'https://cdn.webpushr.com/app.min.js';
  firstScript.parentNode.insertBefore(script, firstScript);
})(window, document, 'script', 'webpushr-jssdk');

webpushr('setup', {
  key: 'BKm-wMk2Xcx2UUBRth0YXGgU4BQ85P_NR8qX6U5YTTrj7skEnKIwDsFNlQPpbzxlikl9b0ZDihe6L0apTD6OpPU'
});
