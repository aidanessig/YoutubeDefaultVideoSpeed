document.addEventListener("DOMContentLoaded", async () => {
  const speedSelector = document.getElementById("speedSelector");
  const saveButton = document.getElementById("saveButton");
  const removeButton = document.getElementById("removeButton");
  const status = document.getElementById("status");
  const clearStorageButton = document.getElementById("clearStorageButton");

  speedSelector.disabled = true;
  saveButton.disabled = true;
  removeButton.disabled = true;
  status.textContent = "This extension only works on YouTube videos.";

  // get the current video ID
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const videoId = url.searchParams.get("v");

  // ensue on youtube video
  if (videoId) {

    // enable ui elements since it's a valid video page
    speedSelector.disabled = false;
    saveButton.disabled = false;
    removeButton.disabled = false;

    chrome.storage.sync.get([videoId], (result) => {
      if (result[videoId]) {
        speedSelector.value = result[videoId]; // set dropdown to saved speed
        status.textContent = `Saved speed: ${result[videoId]}x for this video.`;
        removeButton.style.display = "inline-block"; // show remove button
      } else {
        status.textContent = "No speed saved for this video.";
      }
    });
  }

  // save the selected speed
  saveButton.addEventListener("click", () => {
    const selectedSpeed = speedSelector.value;
    if (videoId) {
      chrome.storage.sync.set({ [videoId]: selectedSpeed }, () => {
        status.textContent = `Saved speed: ${selectedSpeed}x for this video.`;
        removeButton.style.display = "inline-block";

        // notify content.js to reapply speed immediately
        chrome.tabs.sendMessage(tab.id, { action: "updateSpeed", speed: selectedSpeed });
      });
    }
  });

  // remove the saved speed
  removeButton.addEventListener("click", () => {
    if (videoId) {
      chrome.storage.sync.remove(videoId, () => {
        status.textContent = "This video is no longer saved.";
        removeButton.style.display = "none";

        // notify content.js to reset to default speed
        chrome.tabs.sendMessage(tab.id, { action: "resetSpeed" });
      });
    }
  });

  // clear all stored data
  clearStorageButton.addEventListener("click", () => {
    chrome.storage.sync.clear(() => {
      status.textContent = "All data cleared!";
      removeButton.style.display = "none";
    });
  });
});
