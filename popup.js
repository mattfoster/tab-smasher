document.addEventListener("DOMContentLoaded", () => {
  const tabList = document.getElementById("tabList");
  const domainTableBody = document.querySelector("#domainTable tbody");

  // Fetch all tabs and sort by domain
  function loadTabs() {
    tabList.innerHTML = "";
    domainTableBody.innerHTML = "";

    chrome.tabs.query({}, (tabs) => {
      const domainCount = {};

      tabs.forEach((tab) => {
        const domain = new URL(tab.url).hostname;

        if (domain == "") {
          return;
        }

        // Update the count for each domain
        if (domainCount[domain]) {
          domainCount[domain]++;
        } else {
          domainCount[domain] = 1;
        }
      });

      // Sort domains alphabetically
          const sortedDomains = Object.keys(domainCount).sort((a, b) => {
            // Sort by count first (descending)
            if (domainCount[b] !== domainCount[a]) {
              return domainCount[b] - domainCount[a];
            }
            // If counts are equal, sort alphabetically
            return a.localeCompare(b);
          });

      // Display the sorted tabs
      sortedDomains.forEach((domain) => {
        const count = domainCount[domain];
        const tr = document.createElement("tr");
        const tdDomain = document.createElement("td");
        tdDomain.textContent = domain;
        tdDomain.title = "Click to close all tabs from this domain";
        tdDomain.style.cursor = "pointer";
        tdDomain.innerHTML = `${domain} <span class="close-icon">×</span>`;
        tdDomain.addEventListener("click", () => {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (new URL(tab.url).hostname === domain) {
                chrome.tabs.remove(tab.id, () => {
                  loadTabs(); // Reload the popup after closing tabs
                });
              }
            });
          });
        });
        tr.appendChild(tdDomain);

        const tdCount = document.createElement("td");
        tdCount.textContent = count;
        tr.appendChild(tdCount);

        domainTableBody.appendChild(tr);
      });

      // Display the sorted tabs with URLs
      tabs.sort((a, b) => new URL(a.url).hostname.localeCompare(new URL(b.url).hostname))
          .forEach((tab) => {
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = tab.url;
            link.textContent = tab.title || tab.url;
            link.target = "_blank";
            li.appendChild(link);
            tabList.appendChild(li);
          });
    });
  }

  loadTabs();

  // Close tabs matching the regex
  document.getElementById("closeTabs").addEventListener("click", () => {
    const regex = document.getElementById("regex").value;

    if (regex) {
      chrome.runtime.sendMessage({ action: "closeTabs", regex: regex });
    }
  });
});

