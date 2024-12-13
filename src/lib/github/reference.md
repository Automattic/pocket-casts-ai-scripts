# GitHub Search Cheat Sheet

## Repository Search

`repo:owner/name` - Search specific repo
`user:username` - User's repos
`org:orgname` - Org's repos
`stars:>100` - Filter by stars
`forks:<200` - Filter by forks
`language:name` - Filter by language
`is:public/private` - Filter by visibility

## Code Search

`extension:ext` - File extension
`filename:name` - Search filenames
`path:dir/subdir` - Search in directory
`size:n` - Filter by file size

## Issues & PRs

`type:issue/pr` - Issues or PRs
`state:open/closed` - Filter by status
`author:username` - Filter by author
`label:name` - Filter by label
`milestone:name` - Filter by milestone
`is:merged/unmerged` - PR merge status
`draft:true/false` - PR draft status

## Time Filters

`created:YYYY-MM-DD` - Filter by creation on a specific date
`updated:YYYY-MM-DD` - Filter by last update on a specific date
`pushed:YYYY-MM-DD` - Filter by last push on a specific date
`closed:YYYY-MM-DD` - Filter by closing date
`merged:YYYY-MM-DD` - Filter PRs by merge date
`merged:>YYYY-MM-DD` - Filter PRs by merge date after a specific date
`merged:<YYYY-MM-DD` - Filter PRs by merge date before a specific date

## General Operators

`NOT` - Exclude results
`OR` - Match either term
`in:name/description/readme` - Specify search scope
Use quotes for exact phrases: `"exact match"`

## Common Combinations

Recent Python repos: `language:python stars:>100`
Popular open issues: `is:issue is:open stars:>100`
User's merged PRs: `is:pr is:merged author:username`
