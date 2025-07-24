const axios = require('axios');
const fs = require('fs');

const labels = ['level1', 'level2', 'level3'];
const repo = process.env.GITHUB_REPOSITORY || 'opensource-society/notesvault';
const token = process.env.GITHUB_TOKEN;

async function fetchIssues(label) {
  const res = await axios.get(`https://api.github.com/repos/${repo}/issues?state=closed&labels=${label}&per_page=100`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.data.filter(issue => issue.pull_request === undefined && issue.assignees.length > 0);
}

async function fetchMergedPRs(username) {
  const res = await axios.get(`https://api.github.com/search/issues?q=repo:${repo}+is:pr+is:merged+author:${username}`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.data.total_count;
}

async function generateLeaderboard() {
  const leaderboard = {};
  
  for (const label of labels) {
    const issues = await fetchIssues(label);
    issues.forEach(issue => {
      issue.assignees.forEach(assignee => {
        const login = assignee.login;
        if (!leaderboard[login]) leaderboard[login] = { level1: 0, level2: 0, level3: 0 };
        leaderboard[login][label]++;
      });
    });
  }

  const tableHeader = '| Username | Level 1 | Level 2 | Level 3 | PRs Merged |\n|----------|---------|---------|---------|-------------|';
  const rows = await Promise.all(Object.entries(leaderboard).map(async ([user, levels]) => {
    const prCount = await fetchMergedPRs(user);
    return `| @${user} | ${levels.level1} | ${levels.level2} | ${levels.level3} | ${prCount} |`;
  }));

  const output = `${tableHeader}\n${rows.join('\n')}`;
  fs.writeFileSync('LEADERBOARD.md', output);
  console.log('✅ LEADERBOARD.md generated!');
}

generateLeaderboard().catch(err => {
  console.error('Error generating leaderboard:', err);
  process.exit(1);
});
