if (!window.__ytm_search_widget_initialized__) {
  window.__ytm_search_widget_initialized__ = true;

  const host = document.createElement("div");
  host.id = "ytm-search-root";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { 
      position: fixed; z-index: 999999999; 
      inset: 0; pointer-events: none;
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 15vh; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    :host(.active) { pointer-events: auto; }
    
    .overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
        opacity: 0; transition: 0.3s; pointer-events: none;
    }
    :host(.active) .overlay { opacity: 1; pointer-events: auto; }

    .search-box {
      width: 600px; max-width: 90vw; background: rgba(20,20,20,0.85); backdrop-filter: blur(25px);
      border-radius: 16px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 30px 80px rgba(0,0,0,0.8);
      transform: scale(0.95) translateY(-20px); opacity: 0; transition: 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: flex; flex-direction: column; overflow: hidden; pointer-events: none;
    }
    :host(.active) .search-box {
      transform: scale(1) translateY(0); opacity: 1; pointer-events: auto;
    }

    .input-row {
      display: flex; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .input-row svg { opacity: 0.5; margin-right: 16px; color: #fff; width: 24px; }
    input {
      flex-grow: 1; background: transparent; border: none; outline: none;
      font-size: 22px; color: #fff; font-family: inherit; font-weight: 500;
    }
    input::placeholder { color: rgba(255,255,255,0.3); }

    .results {
      max-height: 480px; overflow-y: auto; padding: 10px; display: none;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) transparent;
    }
    .results::-webkit-scrollbar { width: 6px; }
    .results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 6px; }
    .results.has-items { display: block; }
    
    .result-item {
      display: flex; align-items: center; padding: 12px 16px; border-radius: 12px; cursor: pointer;
      color: #fff; transition: 0.15s; gap: 16px; margin-bottom: 4px; border: 1px solid transparent;
    }
    .result-item.selected, .result-item:hover {
      background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.1); transform: scale(0.99);
    }
    
    .cover-art { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; background: #333; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    .item-meta { display: flex; flex-direction: column; overflow: hidden; white-space: nowrap; justify-content: center; }
    .item-title { font-weight: 600; font-size: 16px; text-overflow: ellipsis; overflow: hidden; text-shadow: 0 2px 4px rgba(0,0,0,0.5);}
    .item-artist { font-size: 14px; opacity: 0.6; text-overflow: ellipsis; overflow: hidden; margin-top: 4px; }
  `;
  shadow.appendChild(style);

  const ui = document.createElement("div");
  ui.innerHTML = `
    <div class="overlay" id="overlay"></div>
    <div class="search-box">
       <div class="input-row">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="searchInput" placeholder="Search YouTube Music..." autocomplete="off" spellcheck="false"/>
       </div>
       <div class="results" id="results"></div>
    </div>
  `;
  shadow.appendChild(ui);

  const input = shadow.getElementById("searchInput");
  const resultsContainer = shadow.getElementById("results");
  const overlay = shadow.getElementById("overlay");
  
  let debounceTimeout = null;
  let currentResults = [];
  let selectedIndex = -1;

  const toggleSearch = (forceState) => {
      const isActive = host.classList.contains('active');
      const newState = forceState !== undefined ? forceState : !isActive;
      
      if (newState) {
          host.classList.add('active');
          input.value = "";
          resultsContainer.innerHTML = "";
          resultsContainer.classList.remove('has-items');
          currentResults = [];
          setTimeout(() => input.focus(), 50);
      } else {
          host.classList.remove('active');
          input.blur();
      }
  };

  overlay.onclick = () => toggleSearch(false);
  
  chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === "toggle-search-widget") {
          toggleSearch();
      }
  });

  const triggerPlay = (item) => {
      if (!item) return;
      toggleSearch(false);
      chrome.runtime.sendMessage({ type: "playSearchResult", videoId: item.videoId });
  };

  const renderResults = () => {
      const currentScroll = resultsContainer.scrollTop;
      resultsContainer.innerHTML = "";
      if (currentResults.length === 0) {
          resultsContainer.classList.remove('has-items');
          return;
      }
      
      resultsContainer.classList.add('has-items');
      currentResults.forEach((item, index) => {
          const div = document.createElement("div");
          div.className = `result-item ${index === selectedIndex ? 'selected' : ''}`;
          div.innerHTML = `
             <img class="cover-art" src="${item.cover || ''}" />
             <div class="item-meta">
                <div class="item-title">${item.title}</div>
                <div class="item-artist">${item.artist}</div>
             </div>
          `;
          div.onclick = () => triggerPlay(item);
          div.onmouseenter = () => {
              selectedIndex = index;
              renderResults();
          };
          resultsContainer.appendChild(div);
      });
      // Try to keep selected item in view
      const selectedEl = resultsContainer.children[selectedIndex];
      if (selectedEl) {
         selectedEl.scrollIntoView({ block: 'nearest' });
      }
  };

  input.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      clearTimeout(debounceTimeout);
      
      if (!q) {
          currentResults = [];
          renderResults();
          return;
      }
      
      resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; opacity: 0.5; color: white;">Searching for "${q}"...</div>`;
      resultsContainer.classList.add('has-items');

      debounceTimeout = setTimeout(() => {
          chrome.runtime.sendMessage({ type: "liveSearch", query: q }, (res) => {
              if (res && res.data) {
                  currentResults = res.data;
                  selectedIndex = currentResults.length > 0 ? 0 : -1;
                  renderResults();
                  
                  if (currentResults.length === 0) {
                      resultsContainer.innerHTML = `<div style="text-align:center; padding: 20px; opacity: 0.5; color: white;">No results found</div>`;
                  }
              }
          });
      }, 400); 
  });

  input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
          toggleSearch(false);
      } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (selectedIndex < currentResults.length - 1) {
              selectedIndex++;
              renderResults();
          }
      } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (selectedIndex > 0) {
              selectedIndex--;
              renderResults();
          }
      } else if (e.key === "Enter") {
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
              triggerPlay(currentResults[selectedIndex]);
          }
      }
  });
}
