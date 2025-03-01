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
  const channelSaveCheckbox = document.getElementById("channelSaveCheckbox");

  // elements for top section
  const channelIcon = document.getElementById("channelIcon");
  const videoTitleEl = document.getElementById("videoTitle");
  const channelNameEl = document.getElementById("channelName");
  const savedVideosContainer = document.getElementById("savedVideosContainer");

  // default ui values
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
  const channelElement = document.querySelector("#owner #channel-name a"); // get the channel name
  const channelName = channelElement ? channelElement.textContent.trim() : null;
  const channelStorageKey = channelName ? `channel_${channelName}` : null;

  function updateSavedElementUI(speed, title, channel, profileImage, isChannel = false) {
    // used to update the popup based on video elements

    speedSelector.value = speed;
    const speedText = (speed === "Normal") ? "Normal" : `${speed}x`;

    status.textContent = isChannel
    ? `Saved speed: ${speedText}`
    : `Saved speed: ${speedText}`;

    removeButton.style.display = "inline-block";

    // display the channel icon and text
    videoTitleEl.textContent = title || "Unknown Title";
    channelNameEl.textContent = channel || "Unknown Channel";
    if (profileImage) {
      channelIcon.innerHTML = `<img src="${profileImage}" alt="Channel Icon" />`;
    }

    channelSaveCheckbox.checked = isChannel;
  }

  // ensure on youtube video
  if (videoId || channelStorageKey) {

    // enable ui elements since it's a valid video page
    speedSelector.disabled = false;
    saveButton.disabled = false;
    removeButton.disabled = false;

    // get the details of the current video
    chrome.tabs.sendMessage(tab.id, { action: "getVideoDetails" }, (response) => {

      if (!response || response.isAd) {
        // if ad is playing or response is invalid
        status.textContent = "Ad playing. Please wait.";
        speedSelector.disabled = true;
        saveButton.disabled = true;
        removeButton.disabled = true;
        return;
      }

      // save the actual video info on the current page
      const videoTitle = response.title;
      const videoChannelName = response.channel;
      const videoProfileImage = response.profileImage;

      const channelStorageKey = videoChannelName ? `channel_${videoChannelName.replace(/\s/g, '')}` : null;

      // check storage for the saved channel or video
      chrome.storage.sync.get([videoId, channelStorageKey], (result) => {
        let videoSaved = result[videoId] ? true : false;
        let channelSaved = result[channelStorageKey] ? true : false;
        
        // determine if we are on a saved video or channel
        if (videoSaved || channelSaved) {
          if (channelSaved) {
            const { speed, channel, profileImage } = result[channelStorageKey]; 
            const title = videoTitle;  
            updateSavedElementUI(speed, title, channel, profileImage, true);
          } 
          if (videoSaved) {
            const { speed, title, channel, profileImage } = result[videoId]; 
            updateSavedElementUI(speed, title, channel, profileImage, false); 
          }
        } else {
          // default when not on a saved video/channel
          status.textContent = "No speed saved.";
          videoTitleEl.textContent = videoTitle || "Unknown Title";
          channelNameEl.textContent = videoChannelName || "Unknown Channel";
          if (videoProfileImage) {
            channelIcon.innerHTML = `<img src="${videoProfileImage}" alt="Channel Icon" />`;
          }
        }
      });
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
          let data = {};

          if (channelSaveCheckbox.checked) {
            // save speed for the entire channel
            data = {
              [`channel_${channel.replace(/\s/g, '')}`]: {
                speed: selectedSpeed,
                channel: channel || "Unknown Channel",
                profileImage: profileImage || ""
              }
            };
          } else {
            // save speed for the specific video
            data = {
              [videoId]: {
                speed: selectedSpeed,
                title: title || "Unknown Title",
                channel: channel || "Unknown Channel",
                profileImage: profileImage || ""
              }
            };
          }

          // set the data to: extension storage -> sync
          chrome.storage.sync.set(data, () => {
            const speedText = selectedSpeed === "Normal" ? "Normal" : `${selectedSpeed}x`;
            status.textContent = channelSaveCheckbox.checked
              ? `Saved speed: ${speedText}`
              : `Saved speed: ${speedText}`;

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
    chrome.tabs.sendMessage(tab.id, { action: "getVideoDetails" }, (response) => {
      if (!response || response.isAd) {
        // prevent removing speed if an ad is playing or no valid video details are found
        status.textContent = "Ad playing or no valid video detected. Cannot remove speed.";
        return;
      }
  
      const videoId = new URL(tab.url).searchParams.get("v");
      const videoChannelName = response.channel;
      const channelStorageKey = videoChannelName ? `channel_${videoChannelName.replace(/\s/g, '')}` : null;

      chrome.storage.sync.get([videoId, channelStorageKey], (result) => {
        const hasVideoSaved = result[videoId] !== undefined;
        const hasChannelSaved = result[channelStorageKey] !== undefined;
  
        if (hasVideoSaved) {
          // remove only the video speed
          chrome.storage.sync.remove(videoId, () => {
            status.textContent = "Video speed removed.";
            removeButton.style.display = hasChannelSaved ? "inline-block" : "none"; // hide only if channel speed isn't saved
            speedSelector.value = "Normal";
            chrome.tabs.sendMessage(tab.id, { action: "resetSpeed" });
  
            // refresh saved list
            displayAllSavedVideos();
          });
        } else if (hasChannelSaved) {
          // remove only the channel speed
          chrome.storage.sync.remove(channelStorageKey, () => {
            status.textContent = "Channel speed removed.";
            removeButton.style.display = "none";
            speedSelector.value = "Normal";

            chrome.tabs.sendMessage(tab.id, { action: "resetSpeed" });
  
            // refresh saved list
            displayAllSavedVideos();
          });
        }
      });
   });
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

      const allVideoIdsAndChannels = Object.keys(items);
      if (allVideoIdsAndChannels.length === 0) {
        // nothing saved
        savedVideosContainer.innerHTML = "<p style='color:#ccc;font-size:12px;'>Saved videos appear here.</p>";
        return;
      }

      allVideoIdsAndChannels.forEach((key) => {
        const data = items[key];
        const { speed, title, channel } = data;

        // determine if this is a video-specific entry or a channel-wide entry
        const isChannelWide = key.startsWith("channel_");
        const displayName = isChannelWide ? channel : title;
        const linkId = isChannelWide ? `https://www.youtube.com/${channel}` : `https://www.youtube.com/watch?v=${key}`;

        // create a row-like div
        const videoItem = document.createElement("div");
        videoItem.classList.add("video-item");

        // title & speed
        const titleSpan = document.createElement("span");
        titleSpan.classList.add("video-title-saved");

        // if a channel-wide speed, italicize the title
        if (isChannelWide) {
          titleSpan.innerHTML = `<em>${displayName || "Unknown Channel"}</em>`;
        } else {
          titleSpan.textContent = displayName || "Unknown Title";
        }

        titleSpan.title = displayName || "Unknown Title";

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("video-speed-saved");
        speedSpan.innerHTML = `<a href="${linkId}" target="_blank">
        ${(speed === "Normal") ? "Normal" : speed + "x"} </a>`;

        videoItem.appendChild(titleSpan);
        videoItem.appendChild(speedSpan);

        savedVideosContainer.appendChild(videoItem);
      });
    });
  }
});
