import * as axios from "axios";
import * as core from "@actions/core";
import * as github from "@actions/github";

const { context = {} } = github;
const { pull_request } = context.payload;

const trelloCardIdPattern =
  core.getInput("trello-card-id-pattern", { required: false }) ||
  /\/tr-([a-zA-Z0-9]+)\/.*/;
const trelloApiKey = core.getInput("trello-api-key", { required: true });
const trelloAuthToken = core.getInput("trello-auth-token", { required: true });
const githubToken = core.getInput("github-token", { required: true });
const commentString =
  core.getInput("pr-comment-format", { required: false }) ||
  "Related to **[CARD_LINK]** on [BOARD_LINK]";

const trelloApiAuth = {
  key: trelloApiKey,
  token: trelloAuthToken,
};

function getCardShortcode(branch) {
  console.log(`getCardShortcode(${branch})`);
  const match = branch.match(trelloCardIdPattern);
  if (match == null) {
    return null;
  }
  return match[1];
}

async function addAttachmentToCard(cardId, link) {
  console.log(`addAttachmentToCard(${cardId}, ${link})`);
  let url = `https://api.trello.com/1/cards/${cardId}/attachments`;
  return await axios
    .post(url, {
      ...trelloApiAuth,
      url: link,
    })
    .then(async (response) => {
      if (response.status == 200) {
        return await addCommentToPR(cardId);
      }
    })
    .catch((error) => {
      console.error(
        url,
        `Error ${error.response.status} ${error.response.statusText}`
      );
      return null;
    });
}

async function addCommentToPR(cardId) {
  console.log(`addCommentToPR(${cardId})`);
  let boardUrl = `https://api.trello.com/1/cards/${cardId}/board`;
  await axios
    .get(boardUrl, { params: trelloApiAuth })
    .then(async (response) => {
      const boardData = response.data;
      let cardUrl = `https://api.trello.com/1/cards/${cardId}`;
      await axios
        .get(cardUrl, { params: trelloApiAuth })
        .then(async (response) => {
          if (response.status == 200) {
            const octokit = github.getOctokit(githubToken);
            const cardData = response.data;
            try {
              await octokit.issues.createComment({
                ...context.repo,
                issue_number: pull_request.number,
                body: makePRCommentString(cardData, boardData),
              });
              return true;
            } catch (error) {
              console.error("OCTOKIT ERROR", {
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pull_request.number,
                body: makePRCommentString(cardData, boardData),
              });
              return null;
            }
          }
        })
        .catch((error) => {
          console.error(
            url,
            `Error ${error.response.status} ${error.response.statusText}`
          );
          return null;
        });
    })
    .catch((error) => {
      console.error(
        url,
        `Error ${error.response.status} ${error.response.statusText}`
      );
      return null;
    });
}

async function addFailedCommentToPR() {
  console.log(`addFailedCommentToPR()`);
  const octokit = github.getOctokit(githubToken);
  try {
    await octokit.issues.createComment({
      ...context.repo,
      issue_number: pull_request.number,
      body: "Could not extract a Trello card shortcode from the PR branch name. Be sure to include `/tr-[shortcode]/` in your branch name.",
    });
    return true;
  } catch (error) {
    console.error("OCTOKIT ERROR", {
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pull_request.number,
      body: "Could not extract a Trello card shortcode from the PR branch name. Be sure to include `/tr-[shortcode]/` in your branch name.",
    });
    return null;
  }
}

function makePRCommentString(cardData, boardData) {
  const cardLink = `[${cardData.name}](${cardData.shortUrl})`;
  const boardLink = `[${boardData.name}](${boardData.shortUrl})`;
  const {
    name: cardName,
    url: cardFullUrl,
    shortUrl: cardUrl,
    id: cardId,
    shortcode: cardShortcode,
  } = cardData;
  const {
    name: boardName,
    url: boardFullUrl,
    shortUrl: boardUrl,
    id: boardId,
    shortcode: boardShortcode,
  } = boardData;
  return commentString
    .replace("[CARD_LINK]", cardLink)
    .replace("[BOARD_LINK]", boardLink)
    .replace("[CARD_NAME]", cardName)
    .replace("[CARD_FULL_URL]", cardFullUrl)
    .replace("[CARD_URL]", cardUrl)
    .replace("[CARD_ID]", cardId)
    .replace("[CARD_SHORTCODE]", cardShortcode)
    .replace("[BOARD_NAME]", boardName)
    .replace("[BOARD_FULL_URL]", boardFullUrl)
    .replace("[BOARD_URL]", boardUrl)
    .replace("[BOARD_ID]", boardId)
    .replace("[BOARD_SHORTCODE]", boardShortcode);
}

async function handlePullRequest(data) {
  console.log("handlePullRequest", data);
  let url = data.html_url || data.url;
  let branch = data.head.ref;
  let shortcode = getCardShortcode(branch);
  if (shortcode && shortcode.length > 0) {
    await addAttachmentToCard(shortcode, url);
  } else {
    await addFailedCommentToPR();
  }
}

async function run() {
  if (pull_request && pull_request.title) {
    handlePullRequest(pull_request);
  }
}

run();
