document.addEventListener("DOMContentLoaded", () => {
  const domainTableBody = document.querySelector("#domainTable tbody");

  function clearTable() {
    while (domainTableBody.firstChild) {
      domainTableBody.removeChild(domainTableBody.firstChild);
    }
  }

  function createDomainData(tabs) {
    const domainData = {};
    tabs.forEach((tab) => {
      const url = new URL(tab.url);
      const domain = url.hostname;
      if (domain === "") return;

      const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
      const firstPath = pathParts.length > 0 ? "/" + pathParts[0] : "";

      initializeDomainIfNeeded(domainData, domain);
      updateDomainCounts(domainData[domain], tab);
      updatePathCounts(domainData[domain], domain, firstPath, tab);
    });
    return domainData;
  }

  function initializeDomainIfNeeded(domainData, domain) {
    if (!domainData[domain]) {
      domainData[domain] = {
        count: 0,
        paths: {},
        hasPinned: false,
      };
    }
  }

  function updateDomainCounts(domainInfo, tab) {
    domainInfo.count++;
    if (tab.pinned) {
      domainInfo.hasPinned = true;
    }
  }

  function updatePathCounts(domainInfo, domain, firstPath, tab) {
    const fullPath = domain + firstPath;
    if (!domainInfo.paths[fullPath]) {
      domainInfo.paths[fullPath] = {
        count: 0,
        hasPinned: false,
      };
    }
    domainInfo.paths[fullPath].count++;
    if (tab.pinned) {
      domainInfo.paths[fullPath].hasPinned = true;
    }
  }

  function createDomainRow(domain, domainInfo) {
    const domainRow = document.createElement("tr");
    const tdDomain = document.createElement("td");
    const pinIndicator = domainInfo.hasPinned ? "📌 " : "";
    
    tdDomain.title = "Click to close all unpinned tabs from this domain";
    tdDomain.style.cursor = "pointer";
    
    const textNode = document.createTextNode(`${pinIndicator}${domain} `);
    tdDomain.appendChild(textNode);
    const closeSpan = document.createElement('span');
    closeSpan.className = 'close-icon';
    closeSpan.textContent = '×';
    tdDomain.appendChild(closeSpan);

    addDomainClickHandler(tdDomain, domain);
    domainRow.appendChild(tdDomain);

    const tdCount = document.createElement("td");
    tdCount.textContent = domainInfo.count;
    domainRow.appendChild(tdCount);

    return domainRow;
  }

  function createPathRow(path, pathInfo) {
    const pathRow = document.createElement("tr");
    const tdPath = document.createElement("td");
    const pathPinIndicator = pathInfo.hasPinned ? "📌 " : "";
    
    tdPath.style.paddingLeft = "20px";
    tdPath.style.cursor = "pointer";
    tdPath.title = "Click to close all unpinned tabs from this path";
    
    const pathTextNode = document.createTextNode(`${pathPinIndicator}▸ ${path} `);
    tdPath.appendChild(pathTextNode);
    const pathCloseSpan = document.createElement('span');
    pathCloseSpan.className = 'close-icon';
    pathCloseSpan.textContent = '×';
    tdPath.appendChild(pathCloseSpan);

    addPathClickHandler(tdPath, path);
    pathRow.appendChild(tdPath);

    const tdPathCount = document.createElement("td");
    tdPathCount.textContent = pathInfo.count;
    pathRow.appendChild(tdPathCount);

    return pathRow;
  }

  function addDomainClickHandler(element, domain) {
    element.addEventListener("click", () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (!tab.pinned && new URL(tab.url).hostname === domain) {
            chrome.tabs.remove(tab.id, () => loadTabs());
          }
        });
      });
    });
  }

  function addPathClickHandler(element, path) {
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          const url = new URL(tab.url);
          const tabPath = url.hostname + url.pathname
            .split("/")
            .filter((part) => part.length > 0)
            .map((p) => "/" + p)[0];
          if (!tab.pinned && tabPath === path) {
            chrome.tabs.remove(tab.id, () => loadTabs());
          }
        });
      });
    });
  }

  function loadTabs() {
    clearTable();

    chrome.tabs.query({}, (tabs) => {
      const domainData = createDomainData(tabs);
      const sortedDomains = Object.keys(domainData).sort((a, b) => {
        if (domainData[b].count !== domainData[a].count) {
          return domainData[b].count - domainData[a].count;
        }
        return a.localeCompare(b);
      });

      sortedDomains.forEach((domain) => {
        const domainRow = createDomainRow(domain, domainData[domain]);
        domainTableBody.appendChild(domainRow);

        if (domainData[domain].count > 1) {
          Object.keys(domainData[domain].paths).forEach((path) => {
            if (path !== domain && domainData[domain].paths[path].count < domainData[domain].count) {
              const pathRow = createPathRow(path, domainData[domain].paths[path]);
              domainTableBody.appendChild(pathRow);
            }
          });
        }
      });
    });
  }

  loadTabs();

  document.getElementById("closeTabs").addEventListener("click", () => {
    const regex = document.getElementById("regex").value;
    if (regex) {
      chrome.runtime.sendMessage({ action: "closeTabs", regex: regex });
    }
  });
});