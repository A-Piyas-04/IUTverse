(function () {
  "use strict";
  var theme = "dark";
  var requestedTheme = new URLSearchParams(window.location.search).get("theme");
  try {
    var storedTheme = localStorage.getItem("iutverse-theme");
    var windowTheme = /^iutverse-theme:(light|dark)$/.test(window.name) ? window.name.split(":")[1] : "";
    theme = requestedTheme === "light" || requestedTheme === "dark" ? requestedTheme :
      (storedTheme === "light" || storedTheme === "dark" ? storedTheme : (windowTheme || "dark"));
  } catch (error) {
    theme = requestedTheme === "light" || requestedTheme === "dark" ? requestedTheme :
      (/^iutverse-theme:(light|dark)$/.test(window.name) ? window.name.split(":")[1] : "dark");
  }
  window.name = "iutverse-theme:" + theme;
  document.documentElement.setAttribute("data-theme", theme);
}());
