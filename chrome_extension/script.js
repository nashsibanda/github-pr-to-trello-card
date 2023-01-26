let url = "";
let prefix;
const prefixEntry = document.getElementById("prefix");

async function init() {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  url = tabs[0].url;
  addBranchName();
}

const branchNameDisplay = document.getElementById("branch-name");
const branchCommandDisplay = document.getElementById("branch-command");
const shortcodeDisplay = document.getElementById("shortcode");
const container = document.getElementById("container");

function addBranchName() {
  if (url.includes("trello.com/c/")) {
    container.classList.remove("hide");
    let trimmed = url
      .replace(/\/c\/([\d\w]*)\//, "tr-$1/")
      .replace("http://trello.com", "")
      .replace("https://trello.com", "")
      .replace(/\/\d+-/i, "/");
    let withPrefix = `${prefix ? prefix : "ml"}/${trimmed}`.replace(
      /^(.{60}[^-]*).*/,
      "$1"
    );
    branchNameDisplay.innerText = withPrefix;
    branchCommandDisplay.innerText = "git checkout -b " + withPrefix;
    shortcodeDisplay.innerText = `/tr-${url.match(/\/c\/([\d\w]*)\//)[1]}/`
  } else {
    container.classList.add("hide");
  }
}

getData();

function getData() {
  chrome.storage.sync.get("prefix", function (data) {
    prefix = data.prefix;
    prefixEntry.value = prefix || "";
  });
}

function savePrefix() {
  prefix = prefixEntry.value.replace(/[^-_\da-zA-Z]/g, "");
  chrome.storage.sync.set({
    prefix: prefix,
  });
  addBranchName();
}

const doneBtn = document.getElementById("done-btn");
doneBtn.addEventListener("click", () => {
  savePrefix();
});

prefixEntry.addEventListener("input", () => {
  savePrefix();
});

const copyBtn = document.getElementById("copy-btn");

copyBtn.addEventListener("click", () => {
  copyToClipboard(branchNameDisplay.innerText);
  document.getElementById("branch-name-tooltip").innerText = "Copied!";
  setTimeout(() => document.getElementById("branch-name-tooltip").innerText = "Copy branch name", 2000)
});

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

const copyCmdBtn = document.getElementById("copy-cmd-btn");

copyCmdBtn.addEventListener("click", () => {
  copyToClipboard(branchCommandDisplay.innerText)
  document.getElementById("branch-cmd-tooltip").innerText = "Copied!";
  setTimeout(() => document.getElementById("branch-cmd-tooltip").innerText = "Copy git checkout command", 2000)
});

const copyShortcodeBtn = document.getElementById("copy-shortcode-btn");
copyShortcodeBtn.addEventListener('click', (e) => {
  copyToClipboard(shortcodeDisplay.innerText)
  document.getElementById("shortcode-tooltip").innerText = "Copied!";
  setTimeout(() => document.getElementById("shortcode-tooltip").innerText = "Copy card shortcode", 2000)
});

init();
