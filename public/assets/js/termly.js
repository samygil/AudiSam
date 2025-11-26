const JSON = require('JSON');
const Object = require('Object');

const callInWindow = require('callInWindow');
const copyFromDataLayer = require('copyFromDataLayer');
const copyFromWindow = require('copyFromWindow');
const createQueue = require('createQueue');
const gtagSet = require('gtagSet');
const injectScript = require('injectScript');
const localStorage = require('localStorage');
const logToConsole = require('logToConsole');
const makeNumber = require('makeNumber');
const setDefaultConsentState = require('setDefaultConsentState');
const setInWindow = require('setInWindow');
const updateConsentState = require('updateConsentState');

const DEVELOPER_ID = 'dNzg2MD';
const IS_DEFAULT_STATE = 'is_default_state';
const LOCAL_STORAGE_KEY = 'termly_gtm_template_default_consents';
const UPDATE_COMPLETE_EVENT_NAME = 'Termly.consentSaveDone';

const GTM_TO_TERMLY = Object.freeze({
  ad_personalization: 'advertising',
  ad_storage: 'advertising',
  ad_user_data: 'advertising',
  analytics_storage: 'analytics',
  functionality_storage: 'performance',
  personalization_storage: 'performance',
  security_storage: 'essential',
  social_storage: 'social_networking',
  unclassified_storage: 'unclassified',
});

const EVENT_HANDLERS = Object.freeze({
  'gtm.init_consent': handleInitConsent,
  'userPrefUpdate': handleUserPrefUpdate,
});

// These values come from the template fields. User-selected
// consents will be merged atop these values and passed to the
// setDefaultConsentState functions.
//
const DEFAULT_CONSENT_CONFIG = Object.freeze({
  ad_personalization: data.ad_storage,
  ad_storage: data.ad_storage,
  ad_user_data: data.ad_storage,
  analytics_storage: data.analytics_storage,
  functionality_storage: data.functionality_storage,
  personalization_storage: data.personalization_storage,
  security_storage: data.security_storage,

  wait_for_update: makeNumber(data.wait_for_update),
});


(function main(data) {
  consoleLog('### TEMPLATE START');

  initializeCMP(data);
  installTermlyBlocker(data);

  const event = copyFromDataLayer('event');

  const handler = EVENT_HANDLERS[event] || handleForeignEvent;

  const result = handler(event, data);

  if ( result ) {
    triggerEvent(UPDATE_COMPLETE_EVENT_NAME);

    data.gtmOnSuccess();
  } else {
    data.gtmOnFailure();
  }

  consoleLog('### TEMPLATE END');
})(data);

function initializeCMP(config) {
  gtagSet('developer_id.' + DEVELOPER_ID, true);

  gtagSet({
    ads_data_redaction: config.ads_data_redaction,
    url_passthrough: config.url_passthrough
  });
}

function installTermlyBlocker(config) {
  if ( !config.injectsResourceBlocker ) {
    return;
  }

  consoleLog('Injecting window.TERMLY_CONFIG');

  // The websiteUUID is for legacy URL support (embed.min.js). Even with the new
  // URL (/resource-blocker/{{websiteUUID}}), though, this variables is still
  // useful because it prevents us from double-injecting the script tag. If at
  // some point in the future it's deemed safe to kill the TERMLY_CONFIG object,
  // then I think we should just set a simple boolean value (e.g. TERMLY_INSTALLED)
  // here instead.
  const isConfigSet = setInWindow('TERMLY_CONFIG', {
    websiteUUID: config.websiteUUID,
  });

  if ( !isConfigSet ) {
    const existingConfig = copyFromWindow('TERMLY_CONFIG');

    consoleLog('ERROR: Could not install Termly consent management platform ' +
               'tag because window.TERMLY_CONFIG is already set:',
               existingConfig);
    return;
  }

  consoleLog('Injecting script', config.scriptURL);

  injectScript(config.scriptURL);
}

function handleInitConsent(event, config) {
  consoleLog('-- Handling event "' + event + '"');

  // We can't use saveConsentState() here because that function also
  // saves the values in localStorage, but we are only storing a simple
  // object there, which is incompatible with an array of objects. It's
  // not at all clear from Google's documentation how this array of
  // consents is supposed to be used other than to shuffle it off to
  // setDefaultConsentState() and be about our business.
  getRegionalDefaultConsents(config).forEach(setDefaultConsentState);

  const defaultConsents = getDefaultConsents(config);
  saveConsentState(defaultConsents, IS_DEFAULT_STATE);

  return true;
}

function getRegionalDefaultConsents(config) {
  return config.regionalDefaults.map((settings) => {
    const defaultData = parseCommandData(settings);

    // This is hard-coded in the example documentation, so I'm going to blindly
    // follow suit.
    // See https://developers.google.com/tag-platform/tag-manager/templates/consent-apis#consent-template
    defaultData.wait_for_update = 500;

    return defaultData;
  });
}

function handleUserPrefUpdate(event) {
  consoleLog('-- Handling event "' + event + '"');

  const termlyConsentSettings = callInWindow('Termly.getConsentState');

  if ( !termlyConsentSettings ) {
    consoleLog('window.Termly.getConsentState() was either not found or returned nothing');

    return false;
  }

  consoleLog('Consent settings returned by window.Termly.getConsentState():', termlyConsentSettings);

  const gtmConsentState = convertConsent(termlyConsentSettings);

  saveConsentState(gtmConsentState);

  return true;
}

function handleForeignEvent(event) {
  consoleLog('-- Unhandled event "' + event + '"');

  return true;
}

function getDefaultConsents(config) {
  const defaults = localStorage.getItem(LOCAL_STORAGE_KEY) || '{}';

  return merge(DEFAULT_CONSENT_CONFIG, JSON.parse(defaults));
}

function consoleLog(){
  const stringArgs = arguments.map((argument) => {
    return ( typeof argument === 'string' ) ? argument : JSON.stringify(argument);
  });

  logToConsole('[Termly CMP] ' + stringArgs.join(' '));
}

function convertConsent(termlyConsent) {
  const consents = {};

  forEachEntry(GTM_TO_TERMLY, (gtmKey, termlyKey) => {
    consents[gtmKey] = convertValue(termlyConsent[termlyKey]);
  });

  return consents;
}

function convertValue(isConsented) {
  return ( isConsented ) ? 'granted' : 'denied';
}

function saveConsentState(state, action) {
  const save = ( action === IS_DEFAULT_STATE ) ? setDefaultConsentState : updateConsentState;

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));

  save(state);
}

function triggerEvent(eventName) {
  const dataLayerPush = createQueue('dataLayer');

  dataLayerPush({
    event: eventName,
  });
}

function merge() {
  const obj = {};

  for ( const arg of arguments ) {
    forEachEntry(arg, (key, value) => {
      obj[key] = value;
    });
  }

  return obj;
}

function forEachEntry(object, visitor) {
  // No spread operator, no destructuring. Thanks for bringing me
  // back to 1999, Google.
  Object.entries(object)
    .forEach((entry) => {
      visitor(entry[0], entry[1]);
  });
}

function parseCommandData(settings) {
  const regions = splitInput(settings.region);

  const commandData = {};

  if ( regions.length ) {
    commandData.region = regions;
  }

  splitInput(settings.granted)
    .forEach((entry) => {
      commandData[entry] = 'granted';
    });

  splitInput(settings.denied)
    .forEach((entry) => {
      commandData[entry] = 'denied';
    });

  return commandData;
}

function splitInput(input) {
  return input.split(',')
    .map((item) => item.trim())
    .filter((item) => !!item.length);
}