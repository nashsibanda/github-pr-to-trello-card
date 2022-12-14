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

const trelloApiAuth = {
  key: trelloApiKey,
  token: trelloAuthToken,
};

function getCardShortcode(branch) {
  console.log(`getCardShortcode(${branch})`);
  const match = branch.match(trelloCardIdPattern);
  if (match == null) {
    throw new Error(
      "PR branch name does not meet the guidelines: must include `tr-[Trello card shortcode]"
    );
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
    .get(boardUrl, trelloApiAuth)
    .then(async (response) => {
      const boardData = response.data;
      let cardUrl = `https://api.trello.com/1/cards/${cardId}`;
      await axios
        .get(cardUrl, trelloApiAuth)
        .then(async (response) => {
          if (response.status == 200) {
            const octokit = github.getOctokit(githubToken);
            const cardData = response.data;
            try {
              await octokit.issues.createComment({
                ...context.repo,
                issue_number: pull_request.number,
                body: `Related to **[${cardData.name}](${cardData.shortUrl})** on ${boardData.name}`,
              });
              return true;
            } catch (error) {
              console.error("OCTOKIT ERROR", {
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pull_request.number,
                body: `Related to **[${cardData.name}](${cardData.shortUrl})** on ${boardData.name}`,
              });
              return null
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

async function handlePullRequest(data) {
  console.log("handlePullRequest", data);
  let url = data.html_url || data.url;
  let branch = data.head.ref;
  let shortcode = getCardShortcode(branch);
  if (shortcode && shortcode.length > 0) {
    await addAttachmentToCard(shortcode, url);
  }
}

async function run() {
  if (pull_request && pull_request.title) {
    handlePullRequest(pull_request);
  }
}

run();
