document.addEventListener("DOMContentLoaded", () => {
  const domainTableBody = document.querySelector("#domainTable tbody");

  function loadTabs() {
    domainTableBody.innerHTML = "";

    chrome.tabs.query({}, (tabs) => {
      const domainData = {};

      tabs.forEach((tab) => {
        const url = new URL(tab.url);
        const domain = url.hostname;
        const pathParts = url.pathname
          .split("/")
          .filter((part) => part.length > 0);
        const firstPath = pathParts.length > 0 ? "/" + pathParts[0] : "";

        if (domain === "") {
          return;
        }

        if (!domainData[domain]) {
          domainData[domain] = {
            count: 0,
            paths: {},
            hasPinned: false,
          };
        }

        domainData[domain].count++;
        if (tab.pinned) {
          domainData[domain].hasPinned = true;
        }

        const fullPath = domain + firstPath;
        if (!domainData[domain].paths[fullPath]) {
          domainData[domain].paths[fullPath] = {
            count: 0,
            hasPinned: false,
          };
        }
        domainData[domain].paths[fullPath].count++;
        if (tab.pinned) {
          domainData[domain].paths[fullPath].hasPinned = true;
        }
      });

      const sortedDomains = Object.keys(domainData).sort((a, b) => {
        if (domainData[b].count !== domainData[a].count) {
          return domainData[b].count - domainData[a].count;
        }
        return a.localeCompare(b);
      });

      sortedDomains.forEach((domain) => {
        const domainRow = document.createElement("tr");
        const tdDomain = document.createElement("td");
        const pinIndicator = domainData[domain].hasPinned ? "📌 " : "";
        tdDomain.title = "Click to close all unpinned tabs from this domain";
        tdDomain.style.cursor = "pointer";
        tdDomain.innerHTML = `${pinIndicator}${domain} <span class="close-icon">×</span>`;
        tdDomain.addEventListener("click", () => {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (!tab.pinned && new URL(tab.url).hostname === domain) {
                chrome.tabs.remove(tab.id, () => {
                  loadTabs();
                });
              }
            });
          });
        });
        domainRow.appendChild(tdDomain);

        const tdCount = document.createElement("td");
        tdCount.textContent = domainData[domain].count;
        domainRow.appendChild(tdCount);
        domainTableBody.appendChild(domainRow);

        if (domainData[domain].count > 1) {
          Object.keys(domainData[domain].paths).forEach((path) => {
            if (
              path !== domain &&
              domainData[domain].paths[path].count < domainData[domain].count
            ) {
              const pathRow = document.createElement("tr");
              const tdPath = document.createElement("td");
              const pathPinIndicator = domainData[domain].paths[path].hasPinned
                ? "📌 "
                : "";
              tdPath.style.paddingLeft = "20px";
              tdPath.style.cursor = "pointer";
              tdPath.title = "Click to close all unpinned tabs from this path";
              tdPath.innerHTML = `${pathPinIndicator}▸ ${path} <span class="close-icon">×</span>`;
              tdPath.addEventListener("click", (e) => {
                e.stopPropagation();
                chrome.tabs.query({}, (tabs) => {
                  tabs.forEach((tab) => {
                    const url = new URL(tab.url);
                    const tabPath =
                      url.hostname
                      url.pathname
                        .split("/")
                        .filter((part) => part.length > 0)
                        .map((p) => "/" + p)[0];
                    if (!tab.pinned && tabPath === path) {
                      chrome.tabs.remove(tab.id, () => {
                        loadTabs();
                      });
                    }
                  });
                });
              });
              pathRow.appendChild(tdPath);

              const tdPathCount = document.createElement("td");
              tdPathCount.textContent = domainData[domain].paths[path].count;
              pathRow.appendChild(tdPathCount);
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
