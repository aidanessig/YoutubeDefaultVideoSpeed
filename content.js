/* content.js */

/* the main controlling script. interacts with the
  youtube page and changes the speed */

// check if the settings menu is open
function isSettingsMenuOpen() {
  const settingsMenu = document.querySelector(".ytp-settings-menu");
  return settingsMenu && settingsMenu.style.display !== "none"; // ensure it is open, i.e. not none for displaying
}

// open the settings menu or proceed if already open
function openSettingsMenu(speed) {

  // case if settings menu is already open
  if (isSettingsMenuOpen()) {
    openPlaybackSpeedMenu(speed);
  } else {

    // settings not open, click the button and go to through process
    const settingsButton = document.querySelector(".ytp-settings-button");

    if (settingsButton) {
      settingsButton.click();
      setTimeout(() => openPlaybackSpeedMenu(speed), 500);
    }
  }
}

// open the playback speed menu
function openPlaybackSpeedMenu(speed) {
  setTimeout(() => {

    // find the button for the playback speed
    const playbackSpeedMenu = Array.from(document.querySelectorAll(".ytp-menuitem")).find((item) =>
      item.querySelector(".ytp-menuitem-label")?.textContent.includes("Playback speed")
    );

    if (playbackSpeedMenu) {
      playbackSpeedMenu.click();

      // it is open, now change the playback speed
      setTimeout(() => selectPlaybackSpeed(speed), 250);
    } else {
    }
  }, 500);
}

// select the saved playback speed
function selectPlaybackSpeed(speed) {
  setTimeout(() => {
    
    // find the options that matches input
    const speedOption = Array.from(document.querySelectorAll(".ytp-menuitem")).find((item) =>
      item.querySelector(".ytp-menuitem-label")?.textContent.trim() === speed
    );

    if (speedOption) {
      speedOption.click();
    }
  }, 500);
}

// detect automatic play on the current video
function detectAutomaticPlay() {
  const videoElement = document.querySelector("video");

  // video element and an active
  if (videoElement && videoElement.src) {

    // is actively playing
    if (!videoElement.paused) {
      const videoId = new URL(window.location.href).searchParams.get("v");

      chrome.storage.sync.get([videoId], (result) => {
        if (result[videoId]) {
          const savedSpeed = result[videoId].speed; 
          if (savedSpeed) {
            openSettingsMenu(savedSpeed);
          }
        }
      });
    }
  }
}

// main function to monitor page
function monitorNavigationAPI() {

  // if video visited directly, this is what is used, called only once
  // otherwise, all logic is handled by the listener
  detectAutomaticPlay()

  // called when a video finishes loading, so everytime 
  // a video is visited for the  first time
  window.addEventListener("yt-navigate-finish", function () {

    const url = new URL(window.location.href);
    const videoId = url.searchParams.get("v");

    if (videoId) {

      // check if this video ID exists in storage, i.e. the user wants it's speed changed
      chrome.storage.sync.get([videoId], (result) => {
        if (result[videoId]) {
          const savedSpeed = result[videoId].speed;
          if (savedSpeed) {

            // matched video, start the sequence
            detectAutomaticPlay();
          }
        }
    });
    }
  });
}

// extract video details (title and channel)
function getVideoDetails() {
  const videoTitle = document.title.replace(" - YouTube", ""); // remove "- YouTube" that is appended
  const channelElement = document.querySelector("#owner #channel-name a"); // get the channel name
  const channelName = channelElement ? channelElement.textContent.trim() : "Unknown Channel";
  const profileImage = document.querySelector('#owner yt-img-shadow img')?.src || "";

  return { title: videoTitle, channel: channelName, profileImage: profileImage };
}

// handle messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getVideoDetails") {
    sendResponse(getVideoDetails());
  }
  if (message.action === "updateSpeed") {
    openSettingsMenu(message.speed);
  } 
  else if (message.action === "resetSpeed") {
    openSettingsMenu("Normal");
  }
});

// initialize the functionality
monitorNavigationAPI();
