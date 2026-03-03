console.log("[Nawaetu Extension] Popup script loaded. Target:", document.getElementById('nawaetu-frame').src);

document.getElementById('nawaetu-frame').onload = function () {
    console.log("[Nawaetu Extension] Iframe loaded successfully.");
    const loader = document.querySelector('.loader-container');
    if (loader) {
        loader.style.display = 'none';
    }
};

// Fail-safe timer to detect if iframe hasn't loaded in 5 seconds
setTimeout(() => {
    const loaderVisible = document.querySelector('.loader-container')?.style.display !== 'none';
    if (loaderVisible) {
        console.warn("[Nawaetu Extension] Iframe load timed out or is taking too long.");
    }
}, 5000);
