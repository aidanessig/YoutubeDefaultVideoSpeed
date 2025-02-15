/* popup.js */

/* javascript for the extension popup. handles adding to v tag to 
   storage, sending messages to content script, and visibility
   to the user for when they can interact with the html/popup */

document.addEventListener("DOMContentLoaded", async () => {
  const speedSelector = document.getElementById("speedSelector");
  const saveButton = document.getElementById("saveButton");
  const removeButton = document.getElementById("removeButton");
  const status = document.getElementById("status");
  const clearStorageButton = document.getElementById("clearStorageButton");

  // elements for top section
  const channelIcon = document.getElementById("channelIcon");
  const videoTitleEl = document.getElementById("videoTitle");
  const channelNameEl = document.getElementById("channelName");
  const savedVideosContainer = document.getElementById("savedVideosContainer");

  speedSelector.disabled = true;
  saveButton.disabled = true;
  removeButton.disabled = true;
  removeButton.style.display = "none";
  status.textContent = "Please visit a Youtube video to use this extension. Thank you and enjoy!";
  speedSelector.value = "Normal";

  // get the current video ID
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const videoId = url.searchParams.get("v");

  // ensure on youtube video
  if (videoId) {

    // enable ui elements since it's a valid video page
    speedSelector.disabled = false;
    saveButton.disabled = false;
    removeButton.disabled = false;

    chrome.storage.sync.get([videoId], (result) => {
      if (result[videoId]) {
        const { speed, title, channel, profileImage } = result[videoId]; 
        speedSelector.value = speed;
        const speedText = (speed === "Normal") ? "Normal" : `${speed}x`;
        status.textContent = `Saved speed: ${speedText}.`;
        removeButton.style.display = "inline-block"; // show remove button

        // display the channel icon and text
        videoTitleEl.textContent = title || "Unknown Title";
        channelNameEl.textContent = channel || "Unknown Channel";
        if (profileImage) {
          channelIcon.innerHTML = `<img src="${profileImage}" alt="Channel Icon" />`;
        }
      } else {
        status.textContent = "No speed saved.";
        chrome.tabs.sendMessage(tab.id, { action: "getVideoDetails" }, (response) => {
          if (response) {
            videoTitleEl.textContent = response.title || "Unknown Title";
            channelNameEl.textContent = response.channel || "Unknown Channel";
            if (response.profileImage) {
              channelIcon.innerHTML = `<img src="${response.profileImage}" alt="Channel Icon" />`;
            }
          }
        });
      }
    });
  } 
  // default for when not on video
  else {
    videoTitleEl.textContent = "Youtube Default Video Speed";
    const defaultIcon = "images/defaultIcon.png"
    channelIcon.innerHTML = `<img src="${defaultIcon}" alt="Channel Icon" />`;
  }

  // show all the saved videos
  displayAllSavedVideos();

  // save the selected speed
  saveButton.addEventListener("click", () => {
    const selectedSpeed = speedSelector.value;
    if (videoId) 
      chrome.tabs.sendMessage(tab.id, { action: "getVideoDetails" }, (response) => {
        if (response) {
          const { title, channel, profileImage } = response;

          // store data
          const data = {
            [videoId]: {
              speed: selectedSpeed,
              title: title || "Unknown Title",
              channel: channel || "Unknown Channel",
              profileImage: profileImage || ""
            }
          };

          // set the data to: extension storage -> sync
          chrome.storage.sync.set(data, () => {
            const speedText = (selectedSpeed === "Normal") ? "Normal" : `${selectedSpeed}x`;
            status.textContent = `Saved speed: ${speedText}.`;

            removeButton.style.display = "inline-block"; // show remove button

            // display the channel icon and text
            videoTitleEl.textContent = title || "Unknown Title";
            channelNameEl.textContent = channel || "Unknown Channel";
            if (profileImage) {
              channelIcon.innerHTML = `<img src="${profileImage}" alt="Channel Icon" />`;
            }

            // notify content.js to reapply speed immediately
            chrome.tabs.sendMessage(tab.id, { action: "updateSpeed", speed: selectedSpeed });

            // refresh the full list of saved videos
            displayAllSavedVideos();
          });
      }
    });
  });

  // remove the saved speed
  removeButton.addEventListener("click", () => {
    if (videoId) {
      chrome.storage.sync.remove(videoId, () => {
        status.textContent = "Video no longer saved.";
        removeButton.style.display = "none";

        // reset the top section for the current video
        speedSelector.value = "Normal";

        // notify content.js to reset to default speed
        chrome.tabs.sendMessage(tab.id, { action: "resetSpeed" });

        // refresh the full list of saved videos
        displayAllSavedVideos();
      });
    }
  });

  // clear all stored data
  clearStorageButton.addEventListener("click", () => {
    chrome.storage.sync.clear(() => {
      status.textContent = "All data cleared!";
      removeButton.style.display = "none";

      // reset to normal
      speedSelector.value = "Normal";

      displayAllSavedVideos();
    });
  });

  function displayAllSavedVideos() {
    chrome.storage.sync.get(null, (items) => {
      savedVideosContainer.innerHTML = ""; // clear old entries

      const allVideoIds = Object.keys(items);
      if (allVideoIds.length === 0) {
        // nothing saved
        savedVideosContainer.innerHTML = "<p style='color:#ccc;font-size:12px;'>Saved videos appear here.</p>";
        return;
      }

      allVideoIds.forEach((id) => {
        const data = items[id];
        const { speed, title } = data;

        // create a row-like div
        const videoItem = document.createElement("div");
        videoItem.classList.add("video-item");

        // title & speed
        const titleSpan = document.createElement("span");
        titleSpan.classList.add("video-title-saved");
        titleSpan.textContent = title || "Unknown Title";
        titleSpan.title = title || "Unknown Title";

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("video-speed-saved");
        speedSpan.innerHTML = `<a href="https://www.youtube.com/watch?v=${id}" target="_blank">
        ${(speed === "Normal") ? "Normal" : speed + "x"} </a>`;

        videoItem.appendChild(titleSpan);
        videoItem.appendChild(speedSpan);

        savedVideosContainer.appendChild(videoItem);
      });
    });
  }
});
