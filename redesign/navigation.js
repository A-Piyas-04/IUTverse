(function () {
  "use strict";

  var themeStorageKey = "iutverse-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function persistTheme(theme) {
    window.name = "iutverse-theme:" + theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      // The selected theme still applies for this page when storage is unavailable.
    }
  }

  function syncThemeLinks(theme) {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      try {
        var url = new URL(href, window.location.href);
        if (!/\.html$/i.test(url.pathname)) return;
        url.searchParams.set("theme", theme);
        link.setAttribute("href", url.href);
      } catch (error) {
        // Leave malformed or unsupported URLs untouched.
      }
    });
  }

  function updateThemeButtons(theme) {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      var light = theme === "light";
      button.setAttribute("aria-pressed", String(light));
      button.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
      button.querySelector(".theme-toggle__symbol").textContent = light ? "☾" : "☀";
      button.querySelector(".theme-toggle__label").textContent = light ? "Dark mode" : "Light mode";
    });
  }

  function setTheme(theme, save) {
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeButtons(theme);
    syncThemeLinks(theme);
    if (save) persistTheme(theme);
  }

  function makeThemeButton(variant) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle theme-toggle--" + variant;
    button.setAttribute("data-theme-toggle", "");
    button.innerHTML = '<span class="theme-toggle__symbol" aria-hidden="true"></span><span class="theme-toggle__label"></span>';
    button.addEventListener("click", function () {
      setTheme(currentTheme() === "light" ? "dark" : "light", true);
    });
    return button;
  }

  if (!document.getElementById("phaseFrame")) {
    var navigationRail = document.querySelector('aside[aria-label="Primary navigation"], aside[aria-label="Profile navigation"], .left-rail');
    if (navigationRail) {
      var railNavigation = navigationRail.querySelector("nav");
      var railToggle = makeThemeButton("rail");
      if (railNavigation) railNavigation.insertAdjacentElement("afterend", railToggle);
      else navigationRail.appendChild(railToggle);
    }

    var mobileHeader = document.querySelector(".mobile-topbar, .mobile-top");
    var mobileToggle = makeThemeButton(mobileHeader ? "mobile" : "floating");
    if (mobileHeader) {
      var mobileActions = mobileHeader.querySelector(".mobile-actions");
      (mobileActions || mobileHeader).appendChild(mobileToggle);
    } else {
      document.body.appendChild(mobileToggle);
    }

    setTheme(currentTheme(), false);
  }

  window.addEventListener("storage", function (event) {
    if (event.key === themeStorageKey) setTheme(event.newValue === "light" ? "light" : "dark", false);
  });

  var routes = {
    home: "index.html",
    community: "community-feed.html",
    campus: "lost-found.html",
    learn: "academic-resources.html",
    messages: "messages.html",
    profile: "profile.html"
  };

  function labelOf(element) {
    return ((element.getAttribute("aria-label") || "") + " " + (element.textContent || ""))
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function routeFor(label) {
    if (label.indexOf("home") !== -1 || label.indexOf("iutverse") !== -1) return routes.home;
    if (label.indexOf("community") !== -1) return routes.community;
    if (label.indexOf("campus") !== -1) return routes.campus;
    if (label.indexOf("learn") !== -1) return routes.learn;
    if (label.indexOf("message") !== -1) return routes.messages;
    if (label.indexOf("profile") !== -1) return routes.profile;
    return "";
  }

  function disableControl(control) {
    if (!control || control.disabled) return;
    control.disabled = true;
    control.setAttribute("aria-disabled", "true");
  }

  document.querySelectorAll('a[href="#"]').forEach(function (link) {
    var route = routeFor(labelOf(link));
    if (route) {
      link.setAttribute("href", route);
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
    }
  });
  syncThemeLinks(currentTheme());

  function navigateTo(route, query) {
    var params = new URLSearchParams(query || {});
    params.set("theme", currentTheme());
    var suffix = "?" + params.toString();
    window.location.assign(route + suffix);
  }

  document.querySelectorAll("button.profile").forEach(function (button) {
    button.addEventListener("click", function () { navigateTo(routes.profile); });
  });

  document.querySelectorAll("#profileDialog button").forEach(function (button) {
    if (labelOf(button) === "view profile") {
      button.addEventListener("click", function () { navigateTo(routes.profile); });
    }
  });

  document.querySelectorAll(".message-button, [data-message-person], [data-detail-action^=\"Message\"]").forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopImmediatePropagation();
      var person = button.getAttribute("data-message-person") ||
        button.closest(".suggestion-row")?.querySelector("strong")?.textContent ||
        button.getAttribute("data-detail-action") || "";
      navigateTo(routes.messages, person ? { user: person.replace(/^Message\s+/i, "") } : null);
    }, true);
  });

  document.querySelectorAll("button").forEach(function (button) {
    var text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text === "message" || text === "message poster") {
      button.addEventListener("click", function (event) {
        event.stopImmediatePropagation();
        var person = button.closest(".person")?.querySelector("strong")?.textContent || "";
        navigateTo(routes.messages, person ? { user: person } : null);
      }, true);
    }
  });

  document.querySelectorAll("#send-message").forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateTo(routes.messages, { context: "lost-found" });
    }, true);
  });

  function markUnavailable(root) {
    root.querySelectorAll([
      '[data-menu-action="View guidelines"]',
      'button[aria-label="Conversation options"]',
      'button[aria-label="Profile options"]',
      '#ownerDialog .dialog-body > button',
      '#panel-posts .action',
      '#panel-resources .action',
      '#panel-opportunities .action',
      '#panel-replies .action',
      '.owner-actions button.ghost',
      '.resource .resource-actions > button[aria-label="More actions"]',
      '.opportunity .opp-actions > button[aria-label="More actions"]'
    ].join(",")).forEach(disableControl);

    root.querySelectorAll("button").forEach(function (button) {
      var label = labelOf(button);
      if (label === "settings and privacy" || label === "view all verified students") disableControl(button);
    });
  }

  markUnavailable(document);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) markUnavailable(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  if (/\/messages\.html$/i.test(window.location.pathname)) {
    var params = new URLSearchParams(window.location.search);
    var requestedPerson = params.get("user");
    if (params.get("context") === "lost-found") requestedPerson = "Campus Lost & Found";
    if (requestedPerson) {
      var normalizedPerson = requestedPerson.replace(/^Message\s+/i, "").toLowerCase();
      var conversation = Array.from(document.querySelectorAll(".conversation")).find(function (row) {
        var name = (row.getAttribute("data-name") || "").toLowerCase();
        return name === normalizedPerson || name.indexOf(normalizedPerson) !== -1 || normalizedPerson.indexOf(name) !== -1;
      });
      if (conversation) {
        conversation.click();
      } else {
        var displayName = requestedPerson.replace(/^Message\s+/i, "");
        var initials = displayName.split(/\s+/).map(function (part) { return part.charAt(0); }).join("").slice(0, 2).toUpperCase();
        document.getElementById("activeName").textContent = displayName;
        document.getElementById("activeMeta").textContent = "Verified IUT member";
        document.getElementById("connectionText").textContent = "New conversation";
        document.getElementById("messageThread").innerHTML = '<div class="empty-state"><h2>Start the conversation</h2><p>Send a private message to this verified IUT member.</p></div>';
        document.getElementById("workspace").classList.add("chat-open");
        var thread = document.querySelector(".thread");
        thread.setAttribute("aria-label", "Conversation with " + displayName);
        var threadPerson = document.querySelector(".thread-person");
        threadPerson.setAttribute("href", "profile.html?user=" + encodeURIComponent(displayName));
        threadPerson.querySelector(".avatar").childNodes[0].nodeValue = initials;
        var profileMini = document.querySelector(".profile-mini");
        profileMini.querySelector(".avatar").childNodes[0].nodeValue = initials;
        profileMini.querySelector("strong").textContent = displayName;
        profileMini.querySelector("strong + span").textContent = "Verified IUT member";
        profileMini.querySelector("p").textContent = "Start a private conversation with this verified IUT member.";
        profileMini.querySelector("a").setAttribute("href", "profile.html?user=" + encodeURIComponent(displayName));
        var messageInput = document.getElementById("messageInput");
        messageInput.value = "";
        messageInput.dispatchEvent(new Event("input"));
      }
    }
  }
}());
