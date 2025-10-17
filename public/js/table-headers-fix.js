/**
 * Table Headers Fix - v2.1 (Syntax Fixed)
 */
(function() {
  console.log('Table Headers Fix v2.1 loading');
  
  function fixTableHeaders() {
    try {
      // Force all th elements to be visible
      const allThs = document.querySelectorAll('th');
      allThs.forEach(th => {
        th.style.display = 'table-cell';
        th.style.visibility = 'visible';
        th.style.opacity = '1';
        
        // Force header divs inside to be visible
        const headerDivs = th.querySelectorAll('.header, div');
        headerDivs.forEach(div => {
          div.style.display = 'block';
          div.style.visibility = 'visible';
          div.style.opacity = '1';
          div.style.fontWeight = 'bold';
          div.style.color = '#333';
        });
      });
    } catch (error) {
      console.error('Table Headers Fix error:', error);
    }
  }
  
  // Run immediately
  fixTableHeaders();
  
  // Run on DOM changes
  if (document.body) {
    const observer = new MutationObserver(fixTableHeaders);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Run on delays
  setTimeout(fixTableHeaders, 100);
  setTimeout(fixTableHeaders, 500);
  setTimeout(fixTableHeaders, 1000);
})();
