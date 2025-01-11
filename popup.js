document.addEventListener("DOMContentLoaded", initializePopup);

// Core initialization
function initializePopup() {
  const tabList = document.getElementById("tabList");
  const domainTableBody = document.querySelector("#domainTable tbody");
  
  // setupEventListeners();
  loadTabs();

  function setupEventListeners() {
    document.getElementById("closeTabs").addEventListener("click", handleCloseTabsClick);
  }

  function handleCloseTabsClick() {
    const regex = document.getElementById("regex").value;
    if (regex) {
      chrome.runtime.sendMessage({ action: "closeTabs", regex: regex });
    }
  }

  // Main tab loading and processing
  function loadTabs() {
    clearContainers();
    chrome.tabs.query({}, processTabs);
  }

  function clearContainers() {
    tabList.innerHTML = "";
    domainTableBody.innerHTML = "";
  }

  function processTabs(tabs) {
    const domainData = buildDomainData(tabs);
    const sortedDomains = getSortedDomains(domainData);
    
    renderDomainTable(sortedDomains, domainData);
    renderTabList(tabs);
  }

  // Domain data processing
  function buildDomainData(tabs) {
    const domainData = {};
    
    tabs.forEach(tab => {
      const { domain, firstPath } = extractUrlParts(tab.url);
      if (!domain) return;

      initializeDomainIfNeeded(domainData, domain);
      updateDomainStats(domainData[domain], tab, domain, firstPath);
    });

    return domainData;
  }

  function extractUrlParts(url) {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    return {
      domain: urlObj.hostname,
      firstPath: pathParts.length > 0 ? '/' + pathParts[0] : ''
    };
  }

  function initializeDomainIfNeeded(domainData, domain) {
      if (!domainData[domain]) {
          domainData[domain] = {
              count: 0,
              paths: {},
              hasPinned: false,
              pinnedCount: 0,
              unpinnedCount: 0
          };
      }
  }

  function updateDomainStats(domainInfo, tab, domain, firstPath) {
      domainInfo.count++;
      if (tab.pinned) {
          domainInfo.hasPinned = true;
          domainInfo.pinnedCount++;
      } else {
          domainInfo.unpinnedCount++;
      }

      const fullPath = domain + firstPath;
      if (!domainInfo.paths[fullPath]) {
          domainInfo.paths[fullPath] = { 
              count: 0, 
              hasPinned: false, 
              pinnedCount: 0,
              unpinnedCount: 0 
          };
      }
    
      domainInfo.paths[fullPath].count++;
      if (tab.pinned) {
          domainInfo.paths[fullPath].hasPinned = true;
          domainInfo.paths[fullPath].pinnedCount++;
      } else {
          domainInfo.paths[fullPath].unpinnedCount++;
      }
  }

  function renderDomainTable(sortedDomains, domainData) {
      sortedDomains.forEach(domain => {
          const info = domainData[domain];
          // Only show domains that have unpinned tabs
          if (info.unpinnedCount === 0) {
              return;
          }

          const domainRow = createDomainRow(domain, info);
          domainTableBody.appendChild(domainRow);

          if (info.count > 1) {
              renderPathRows(domain, info);
          }
      });

      document.getElementById("closeTabs").addEventListener("click", handleCloseTabsClick);
  }
  function createDomainRow(domain, domainInfo) {
    const row = document.createElement("tr");
    const tdDomain = createDomainCell(domain, domainInfo.hasPinned);
    const tdCount = createCountCell(domainInfo.count);
    
    row.appendChild(tdDomain);
    row.appendChild(tdCount);
    return row;
  }

  function createDomainCell(domain, hasPinned) {
    const td = document.createElement("td");
    const pinIndicator = hasPinned ? "📌 " : "";
    
    td.title = "Click to close all unpinned tabs from this domain";
    td.style.cursor = "pointer";
    td.innerHTML = `${pinIndicator}${domain} <span class="close-icon">×</span>`;
    
    // Add the event listener when creating the cell
    td.addEventListener("click", () => closeTabsForDomain(domain));
    
    return td;
  }

  function renderPathRows(domain, domainInfo) {
    Object.entries(domainInfo.paths).forEach(([path, pathInfo]) => {
      if (path !== domain && pathInfo.count < domainInfo.count) {
        const pathRow = createPathRow(path, pathInfo);
        domainTableBody.appendChild(pathRow);
      }
    });
  }

  function renderDomainTable(sortedDomains, domainData) {
    sortedDomains.forEach(domain => {
      const domainRow = createDomainRow(domain, domainData[domain]);
      domainTableBody.appendChild(domainRow);

      if (domainData[domain].count > 1) {
        renderPathRows(domain, domainData[domain]);
      }
    });
  }

  function renderTabList(tabs) {
    const sortedTabs = [...tabs].sort((a, b) => {
      return new URL(a.url).hostname.localeCompare(new URL(b.url).hostname);
    });

    sortedTabs.forEach(tab => {
      const li = createTabListItem(tab);
      tabList.appendChild(li);
    });
  }

  // Tab closing handlers
  function closeTabsForDomain(domain) {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (!tab.pinned && new URL(tab.url).hostname === domain) {
          chrome.tabs.remove(tab.id, loadTabs);
        }
      });
    });
  }
}

function getSortedDomains(domainData) {
  // Filter out domains with only pinned tabs before sorting
  const domainsWithUnpinnedTabs = Object.keys(domainData).filter(domain => {
      const info = domainData[domain];
      return info.count > info.pinnedCount;
  });

  return domainsWithUnpinnedTabs.sort((a, b) => {
      if (domainData[b].count !== domainData[a].count) {
          return domainData[b].count - domainData[a].count;
      }
      return a.localeCompare(b);
  });
}
function createCountCell(count) {
  const td = document.createElement("td");
  td.textContent = count;
  return td;
}

function createPathRow(path, pathInfo) {
  const row = document.createElement("tr");
  const tdPath = document.createElement("td");
  const pathPinIndicator = pathInfo.hasPinned ? "📌 " : "";
  tdPath.style.paddingLeft = "20px";
  tdPath.style.cursor = "pointer";
  tdPath.title = "Click to close all unpinned tabs from this path";
  tdPath.innerHTML = `${pathPinIndicator}▸ ${path} <span class="close-icon">×</span>`;
  tdPath.addEventListener("click", (e) => {
    e.stopPropagation();
    closeTabsForPath(path);
  });
  row.appendChild(tdPath);

  const tdPathCount = document.createElement("td");
  tdPathCount.textContent = pathInfo.count;
  row.appendChild(tdPathCount);
  return row;
}

function createTabListItem(tab) {
  const li = document.createElement("li");
  const link = document.createElement("a");
  link.href = tab.url;
  link.textContent = tab.title || tab.url;
  link.target = "_blank";
  li.appendChild(link);
  return li;
}

function closeTabsForPath(path) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const url = new URL(tab.url);
      const tabPath = url.hostname + url.pathname.split('/').filter(part => part.length > 0).map(p => '/' + p)[0];
      if (!tab.pinned && tabPath === path) {
        chrome.tabs.remove(tab.id, loadTabs);
      }
    });
  });
}