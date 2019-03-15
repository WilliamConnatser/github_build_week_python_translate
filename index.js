// import dateutil.parser
// import json
// import requests
// import sys

// TOKEN = 'YOURTOKEN'
// HEADERS = headers = {'Authorization': 'token ' + TOKEN}

// def get_user(username):
//     """
//     Returns JSON information for a given GitHub username
//     Parameters
//     ----------
//     username : str
//         GitHub username
//     Returns
//     -------
//     response : json
//         JSON object containing user information
//     """
//     r = requests.get('https://api.github.com/users/%s' % username,
//                      headers=HEADERS)
//     if r.ok:
//         return r.json()
//     else:
//         raise ValueError('GitHub user %s not found' % username)


// def get_user_summary(username):
//     """
//     Quickly returns a summary of user data.
//     """
//     # get repo url from username
//     user_url = get_user(username)
//     repo_url = user_url['repos_url'] + '?simple=yes&per_page=100&page=1'
//     res = requests.get(repo_url, headers=HEADERS)
//     # make sure we have all repos if count
//     # exceeds 30
//     repos = res.json()
//     while 'next' in res.links.keys():
//         res = requests.get(res.links['next']['url'], headers=HEADERS)
//         repos.extend(res.json())

//     # set up data structure to be returned
//     data = {}
//     data['user'] = username
//     data['avatar'] = user_url['avatar_url']
//     data['repos'] = []
//     data['repo_count'] = 0
//     data['languages'] = {}
//     data['most_popular'] = (None, -1)  # repo name and stargazer count

//     # iterate through repos and update data
//     for r in repos:
//         # append new repo
//         data['repos'].append(r['full_name'])
//         data['repo_count'] += 1
//         # update language count
//         if r['language'] in data['languages'].keys():
//             data['languages'][r['language']] += 1
//         else:
//             data['languages'][r['language']] = 1
//         # update most popular repos
//         if r['stargazers_count'] > data['most_popular'][1]:
//             data['most_popular'] = (r['full_name'], r['stargazers_count'])
//     return json.dumps(data)


// def get_repo_commits(username):
//     """
//     Gets commits made to user repositories
//     """
//     # get repo url from username
//     repo_url = get_user(username)['repos_url'] + '?simple=yes&per_page=100&page=1'
//     res = requests.get(repo_url, headers=HEADERS)
//     # make sure we have all repos if count
//     # exceeds 30
//     repos = res.json()
//     while 'next' in res.links.keys():
//         res = requests.get(res.links['next']['url'], headers=HEADERS)
//         repos.extend(res.json())

//     commit_summary = {}
//     commit_summary['day'], commit_summary['hour'] = {}, {}
//     for i in range(0, 7):
//         commit_summary['day'][i] = 0
//     for i in range(0, 24):
//         commit_summary['hour'][i] = 0

//     # iterate through repos
//     for r in repos:
//         # for each repo, look through the commits
//         commit_url = ('https://api.github.com/repos/%s/commits?author=%s'
//                       % (r['full_name'], username))
//         commits = requests.get(commit_url,
//                                headers=HEADERS).json()
//         # loop through commits to get timestamps
//         for c in commits:
//             date = dateutil.parser.parse(c['commit']['author']['date'])
//             commit_summary['day'][date.weekday()] += 1
//             commit_summary['hour'][date.hour] += 1

//     day_new = {}
//     for k, d in zip(range(0, 7), ['Monday', 'Tuesday', 'Wednesday',
//                                   'Thursday', 'Friday', 'Saturday',
//                                   'Sunday']):
//         day_new[d] = commit_summary['day'][k]

//     commit_summary['day'] = day_new

//     return json.dumps(commit_summary)

// def main():
//     """
//     Executes user summary and returns JSON object
//     """
//     user = sys.argv[1]
//     data = sys.argv[2]

//     if data == 'summary':
//         print (get_user_summary(user))
//     else:
//         print (get_repo_commits(user))
//     sys.stdout.flush()

// if __name__ == '__main__':
//     main()

const axios = require('axios');

const config = {
    headers: {
        'Authorization': 'token YOURTOKEN'
    }
};

const usernameToQuery = 'smashwilson';

async function getUser(username) {
    let apiResponse;
    await axios.get(`https://api.github.com/users/${username}`, config)
        .then(function (response) {
            if (response.status === 404) console.log('User not found');
            else apiResponse = response.data;
        })
        .catch(function (error) {
            console.log(error);
        });
    return apiResponse;
}

async function getUserRepos(username) {
    const user = await getUser(username);
    const repoURL = `${user.repos_url}?simple=yes&per_page=100&page=`;

    await axios.get(repoURL + '1', config)
        .then(async function (response) {
            if (response.status === 404) console.log('User not found');
            else user.repos = response.data;

            const indexAfterLastPage = response.headers.link.indexOf('>; rel="last"');
            const indexBeforeLastPage = response.headers.link.lastIndexOf('=', indexAfterLastPage);
            user.repoPages = Number(response.headers.link.substring(indexBeforeLastPage + 1, indexAfterLastPage));
        })
        .catch(function (error) {
            console.log(error);
        });

    //If Multiple Pages
    if (user.repoPages > 1) {

        //Create an empty array to hold API response promises
        const promiseArray = [];

        //Synchronously get the rest of the pages
        for (let i = 2; i <= user.repoPages; i++) {

            //Push axios promise to array of promises
            promiseArray.push(axios.get(repoURL + i, config));
        }

        //When all promises are resolved
        return Promise.all(promiseArray).then(function (resolvedPromises) {

            //Concat all responses into repo array
            resolvedPromises.forEach(promise => {
                user.repos = user.repos.concat(promise.data);
            });

            console.log('API Response(s) Received');
            console.timeEnd("getUserSummaryResponses");

            //No more pages to request from API
            //Return user object
            return user;
        });

    } else {

        console.log('API Response(s) Received');
        console.timeEnd("getUserSummaryResponses");

        //No more pages to request from API
        //Return user object
        return user;
    }
}

async function getUserSummary(username) {

    //Get user repos
    user = await getUserRepos(username);

    //Setup response
    const dataStructure = {
        user: user.login,
        avatar: user.avatar_url,
        repos: [],
        repo_count: user.repos.length,
        languages: {},
        most_popular: {
            null: -1
        }
    }

    for (let i = 0; i < user.repos.length; i++) {

        //Push repo name to array
        dataStructure.repos.push(user.repos[i].full_name);

        //Add to language count
        if (Object.keys(dataStructure.languages).indexOf(user.repos[i].language) > -1) {
            dataStructure.languages[user.repos[i].language] += 1;
        } else {
            dataStructure.languages[user.repos[i].language] = 1;
        }

        //Check Stargaze Count
        if (user.repos[i].stargazers_count > Object.values(dataStructure.most_popular)[0]) {
            dataStructure.most_popular = {
                [user.repos[i].full_name]: user.repos[i].stargazers_count
            }
        }
    }

    console.log(dataStructure);
    console.timeEnd("getUserSummaryTotal");

    return dataStructure;
}

const weekday = new Array(7);
weekday[0] = "Sunday";
weekday[1] = "Monday";
weekday[2] = "Tuesday";
weekday[3] = "Wednesday";
weekday[4] = "Thursday";
weekday[5] = "Friday";
weekday[6] = "Saturday";

const blankCommitSummary = {
    day: {},
    hour: {}
}

weekday.forEach(day => blankCommitSummary.day[day] = 0);
for (let i = 0; i < 24; i++) {
    blankCommitSummary.hour[i] = 0;
}


async function getRepoCommits(username) {

    //Get user repos and setup variables
    const user = await getUserRepos(username);
    const commitSummary = blankCommitSummary;

    //For each repo
    for (let i = 0; i < user.repos.length; i++) {

        //Get the repos' commits
        await axios.get(`https://api.github.com/repos/${user.repos[i].full_name}/commits?author=${user.login}`, config)
            .then(function (response) {
                if (response.status === 404) console.log('User not found');
                else {

                    //Check if response was and empty array
                    if (response.data[0] !== undefined) {

                        //For each commit
                        response.data.forEach(function (commit) {

                            //Grab the date in String format, make a new Date()
                            const commitDate = new Date(commit.commit.committer.date);

                            //Add to the totals
                            commitSummary.day[weekday[commitDate.getDay()]] += 1;
                            commitSummary.hour[commitDate.getHours()] += 1;
                        });
                    }
                }
            })
            .catch(function (error) {
                //console.log(error); .. don't care
            });
    }

    console.timeEnd("getRepoCommits")
    console.log(commitSummary)
}

console.time("getUserSummaryResponses");
console.time("getUserSummaryTotal");
//getUserSummary(usernameToQuery);

console.time("getRepoCommits");
getRepoCommits(usernameToQuery);