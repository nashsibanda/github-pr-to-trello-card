# GitHub-PR-To-Trello-Card
### GitHub Action to attach GitHub pull requests to a Trello card based on branch name

Includes a helper extension for Chrome, to make creating branch names super easy.

![image](action-demo-680.gif)

#### Forked from
[https://github.com/marketplace/actions/github-commit-to-trello-card](https://github.com/marketplace/actions/github-commit-to-trello-card)

#### Action Variables
- **trello-api-key** - Trello API key, visit https://trello.com/app-key for key
- **trello-auth-token** - Trello auth token, visit https://trello.com/app-key then click generate a token
- **trello-card-id-pattern** - Custom JS-compatible regex pattern to extract Trello card shortcode from branch name. Defaults to /tr-{shortcode}/


#### GitHub Action
```
name: GitHub Commit To Trello Comment

on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - uses: nashsibanda/github-pr-to-trello-card@main
        with:
          trello-api-key: ${{ secrets.TRELLO_KEY }}
          trello-auth-token: ${{ secrets.TRELLO_TOKEN }}
          trello-card-id-pattern: "/\/tr-([a-zA-Z0-9]+)\/.*/"
```          

#### Local Build
```
npm run build
```

#### Release Build
```
git tag -a "v2" -m "v2"
git push origin --tags
```