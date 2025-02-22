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
      const channelName = new URL(window.location.href).searchParams.get("ab_channel"); 

      const channelStorageKey = `channel_${channelName}`;

      chrome.storage.sync.get([videoId, channelStorageKey], (result) => {
        let savedSpeed = result[videoId]?.speed; // first, check video speed
        if (!savedSpeed) {
          savedSpeed = result[channelStorageKey]?.speed; // if not found, check channel-wide speed
        }
  
        if (savedSpeed) {
          openSettingsMenu(savedSpeed);
        }
      });
    }
  }
}

let lastExecutionTime = 0;  // store the last execution time
const EXECUTION_DELAY = 1000; // 1 second

// main function to monitor page
function monitorNavigationAPI() {
  function safeDetectAutomaticPlay() {
    // used for the case where a video is visited directly, but it is then, 
    // is refreshed causing the function to be called twice

    const currentTime = Date.now();

    // more than 1 second has passed, change speed
    if (currentTime - lastExecutionTime > EXECUTION_DELAY) {
      lastExecutionTime = currentTime; // update last execution timestamp
      detectAutomaticPlay();
    }
  }

  // called when a video finishes loading, so everytime 
  // a video is visited for the  first time
  safeDetectAutomaticPlay();

  // event listener for youtube's navigation changes with retry logic
  window.addEventListener("yt-navigate-finish", function () {

    // ensure on a YouTube video page, not a channel page
    if (!window.location.href.includes("watch?v=")) {
      return;
    }

    // start an interval that checks every 0.5s
    const intervalId = setInterval(() => {
      const videoElement = document.querySelector("video");
      const settingsButton = document.querySelector(".ytp-settings-button");

      // once the video is ready, clear the interval and proceed, this videoElement.readyState
      // is the part that makes it wait longer and what we are waiting on
      if (videoElement && settingsButton && videoElement.readyState >= 2) {
        // clear interval since we are making changes
        clearInterval(intervalId);

        // delay while page continues to load
        setTimeout(() => {
          safeDetectAutomaticPlay();
        }, 500);
      }
      // NOTE: in theory, this could run infinitely, however, a video should eventually load, 
      // so have not added an end limit. maybe in the future...
    }, 500);
  });
}

// extract video details (title and channel)
function getVideoDetails() {
  const titleElement = document.querySelector("#title h1 yt-formatted-string");
  const videoTitle = titleElement ? titleElement.textContent.trim() : "Unknown Title";
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
