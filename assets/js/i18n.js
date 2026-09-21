(function () {
    "use strict";

    var storageKey = "site-language";
    var supportedLanguages = ["en", "zh"];

    function getSavedLanguage() {
        try {
            return window.localStorage.getItem(storageKey) === "zh" ? "zh" : "en";
        } catch (error) {
            return "en";
        }
    }

    function setLanguage(language) {
        var nextLanguage = supportedLanguages.indexOf(language) === -1 ? "en" : language;
        var root = document.documentElement;
        var toggle = document.getElementById("language-toggle");
        var pageTitle = document.body.getAttribute("data-page-title-" + nextLanguage);
        var siteName = document.querySelector('[data-site-name="' + nextLanguage + '"]');
        var ariaLabels = document.querySelectorAll("[data-i18n-aria]");

        root.dataset.language = nextLanguage;
        root.lang = nextLanguage === "zh" ? "zh-CN" : "en";

        if (toggle) {
            toggle.setAttribute("aria-pressed", nextLanguage === "zh" ? "true" : "false");
        }
        for (var index = 0; index < ariaLabels.length; index += 1) {
            var ariaLabel = ariaLabels[index].getAttribute("data-aria-" + nextLanguage);
            if (ariaLabel) ariaLabels[index].setAttribute("aria-label", ariaLabel);
        }

        if (pageTitle && siteName) {
            document.title = pageTitle + " - " + siteName.textContent.trim();
        }

        try {
            window.localStorage.setItem(storageKey, nextLanguage);
        } catch (error) {
            // Keep the current language for this page when storage is unavailable.
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        var toggle = document.getElementById("language-toggle");
        setLanguage(getSavedLanguage());

        if (toggle) {
            toggle.addEventListener("click", function () {
                var nextLanguage = document.documentElement.dataset.language === "zh" ? "en" : "zh";
                setLanguage(nextLanguage);
            });
        }
    });
}());
