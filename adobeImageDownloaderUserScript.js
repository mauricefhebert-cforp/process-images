// ==UserScript==
// @name         Adobe Image Downloader
// @namespace    http://tampermonkey.net/
// @version      2024-12-12
// @description  try to take over the world!
// @author       You
// @match        https://stock.adobe.com/ca/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=microsoft.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('User script start...');

    function checkAndDownload() {
        const imageExt = document.querySelector('[data-ingest-clicktype=change-transparent-png-asset-type-JPEG]');
        const saveButton = document.querySelector('[data-action="License"][data-lib-id="desktop"][data-lib-name="Computer"]');

        console.log('Checking if image extension is jpeg...');
        if (imageExt) {
            imageExt.click();
        }

        console.log('Checking for save button...');
        if (saveButton) {
            console.log('Save button found, clicking...');
            saveButton.click();
        } else {
            console.log('Save button not found, retrying...');
            setTimeout(checkAndDownload, 5000); // Retry after 5 seconds
        }
    }

    checkAndDownload(); // Initial check
})();
