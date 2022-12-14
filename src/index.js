import * as axios from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';

const { context = {} } = github;
const { pull_request } = context.payload;

const trelloCardIdPattern = core.getInput('trello-card-id-pattern', { required: false }) || /\/tr-([a-zA-Z0-9]+)\/.*/;
const trelloApiKey = core.getInput('trello-api-key', { required: true });
const trelloAuthToken = core.getInput('trello-auth-token', { required: true });

function getCardShortcode(branch) {
  console.log(`getCardShortcode(${branch})`);
  const match = branch.match(trelloCardIdPattern)
  if (match == null) {
    throw new Error("PR branch name does not meet the guidelines: must include `tr-[Trello card shortcode]");
  }
  return match[1];
}

async function getCardId(cardShortcode) {
  console.log(`getCardId(${cardShortcode})`);
  if (card && card.length > 0) {
    let url = `https://trello.com/c/${cardShortcode}.json`;
    console.log("Url is ", url);
    return await axios.get(url, { 
      params: { 
        key: trelloApiKey, 
        token: trelloAuthToken 
      }
    }).then(response => {
      return response.data.id;
    }).catch(error => {
      console.error(url, `Error ${error.response.status} ${error.response.statusText}`);
      return null;
    });
  }

  return null;
}

async function addAttachmentToCard(cardId, link) {
  console.log(`addAttachmentToCard(${cardId}, ${link})`);
  let url = `https://api.trello.com/1/cards/${cardId}/attachments`;
  return await axios.post(url, {
    key: trelloApiKey,
    token: trelloAuthToken, 
    url: link
  }).then(response => {
    return response.status == 200;
  }).catch(error => {
    console.error(url, `Error ${error.response.status} ${error.response.statusText}`);
    return null;
  });
}

async function handlePullRequest(data) {
  console.log("handlePullRequest", data);
  let url = data.html_url || data.url;
  let branch = data.head.ref;
  let cardsNumbers = getCardShortcode(branch);
  cardsNumbers.forEach(async cardNumber => {

  let cardId = await getCardId(cardNumber);
    if (cardId && cardId.length > 0) {
      await addAttachmentToCard(cardId, url);
    }
  });
}

async function run() {
  if (pull_request && pull_request.title) {
    handlePullRequest(pull_request)
  }
};

run()