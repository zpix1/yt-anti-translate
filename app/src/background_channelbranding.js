// Constants
const LOG_PREFIX = "[YoutubeAntiTranslate]";
const CHANNEL_HEADER_SELECTOR = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNEL_ABOUT_SELECTOR = "#about-container";
const PLAYER_CHANNEL_NAME_SELECTOR = 'ytd-video-owner-renderer ytd-channel-name .ytd-channel-name a.yt-simple-endpoint'
const ATTRIBUTED_STRING_SELECTOR = "yt-attributed-string";
const MUTATION_UPDATE_FREQUENCY = 2;

/**
 * Processes the branding header and restores it to its original form
 */
function mutationBrandingHeaderCounter() { }

/**
 * Processes the about and restores it to its original form
 */
function restoreOriginalAbout() { }

/**
 * Processes the player channel name and restores it to its original form
 */
function restoreOriginalPlayerChannelName() { }

/**
 * Handles channel branding header updates when mutations are detected
 */
let mutationBrandingHeaderCounter = 0;

async function handleBrandingHeaderMutation() {
  if (mutationBrandingHeaderCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const brandingHeaderElement = document.querySelector(CHANNEL_HEADER_SELECTOR);
    if (brandingHeaderElement) {
      restoreOriginalBrandingHeader();
    }
  }
  mutationBrandingHeaderCounter++;
}

/**
 * Handles channel about updates when mutations are detected
 */
let mutationAboutCounter = 0;

async function handleAboutMutation() {
  if (mutationAboutCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const aboutElement = document.querySelector(CHANNEL_ABOUT_SELECTOR);
    if (aboutElement) {
      restoreOriginalAbout();
    }
  }
  mutationAboutCounter++;
}



/**
 * Handles channel about updates when mutations are detected
 */
let mutationPlayerChannelNameCounter = 0;

async function handlePlayerChannelNameMutation() {
  if (mutationPlayerChannelNameCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const PlayerChannelNameElement = document.querySelector(PLAYER_CHANNEL_NAME_SELECTOR);
    if (PlayerChannelNameElement) {
      restoreOriginalPlayerChannelName();
    }
  }
  mutationPlayerChannelNameCounter++;
}

// Initialize the mutation observer for branding header and about
const targetNode = document.body;
const observerConfig = { childList: true, subtree: true };
const brandingHeaderObserver = new MutationObserver(handleBrandingHeaderMutation);
brandingHeaderObserver.observe(targetNode, observerConfig);
const aboutObserver = new MutationObserver(handleAboutMutation);
aboutObserver.observe(targetNode, observerConfig);
const playerChannelNameObserver = new MutationObserver(handlePlayerChannelNameMutation);
playerChannelNameObserver.observe(targetNode, observerConfig);
