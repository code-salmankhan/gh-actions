const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const { GitHub } = require('@actions/github/lib/utils');

const validateBranchName = ({ branchName }) => 
    /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectoryName = ({ dirName }) => 
    /^[a-zA-Z0-9_\-\.\/]+$/.test(dirName);

async function run() {

    /*
   [Done]1. Parse inputs:
       1.1 base-branch from which to check for updates
       1.2 target-branch to use to create the PR
       1.3 Github Token for authentication proposes (to create PR)
       1.4 Working directory for which to check for dependencies
*/
/*
    const baseBranch = core.getInput('base-branch', { required: true });
    const targetBranch = core.getInput('target-branch', { required: true });
    const ghToken = core.getInput('gh-token', { required: true });
    const workingDir = core.getInput('working-directory', { required: true });
    const debug = core.getBooleanInput('debug');
*/

    const baseBranch = core.getInput('base-branch', { required: true });
    const headBranch = core.getInput('head-branch', { required: true });
    const ghToken = core.getInput('gh-token', { required: true });
    const workingDir = core.getInput('working-directory', { required: true });
    const debug = core.getBooleanInput('debug');
    const logger = setupLogger({ debug, prefix: '[js-dependency-update]' });



    const commonExecOpts = {
         cwd: workingDir
    }

    core.setSecret(ghToken);

    if (!validateBranchName({ branchName: baseBranch}))  {

        core.setFailed('Invalid base branch name. Branch names should include only characters, numbers, hyphens, underscores, dots, and forward slashes.');
        return;
    }

    if (!validateBranchName({ branchName: targetBranch}))  {

        core.setFailed('Invalid target branch name. Branch names should include only characters, numbers, hyphens, underscores, dots, and forward slashes.');
        return;
    }

    if (!validateDirectoryName({ dirName: workingDir }))  {

        core.setFailed('Invalid target branch name. Branch names should include only characters, numbers, hyphens, underscores, dots and forward slashes.');
        return;
    }

    core.info('[js-dependency-update] : base branch is ${baseBranch}');
    core.info('[js-dependency-update] : target branch is ${targetBranch}');
    core.info('[js-dependency-update] : working is ${workingDir}');

    /*
     2. Execute the npm update command within the working directory 
     3. Check whether there are modified package*.json files
     */
    
   await exec.exec('npm update', [], {
      ...commonExecOpts,
   });

   const gitStatus = await exec.getExecOutput('git status -s package*.json', [],
    {
        ...commonExecOpts,
    }
   ); 

    /*
     4. If there are modified files:
       4.1 Add and commit files tio the target-branch
       */

   if (gitStatus.stdout.length > 0) {
    core.info('[js-dependency-update] : There are updates avaialble!')  
    await exec.exec('git config  --global user.name "code-salmankhan"');
    await exec.exec('git config  --global user.email "salman11khan@outlook.com');
    await exec.exec('git checkout -b ${targetBranch}', [], {
      ...commonExecOpts,
    });
    await exec.exec('git add package.json package-lock.json', [], {
      ...commonExecOpts,
    });
    await exec.exec('git commit -m "chore: update dependencies', [], {
        ...commonExecOpts,
    });
    await exec.exec('git push -u origin ${targetBranch} --force', [], {
        ...commonExecOpts,
    });

    const octokit = github.getOctokit(ghToken);
    
    try{
    await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: 'Update NPM dependencies',
        body: 'This pull request updates NPM packages',
        base: baseBranch,
        head: targetBranch
    });
   }catch (e) {
    core.error('[js-dependency-update]: something went wrong while creating the PR, check logs below')
    core.setFailed(e.message);
    core.error(e);
   }
   } else{
    core.info('[js-dependency-update] : No update ar this point in time!')
   }

    
   /*
       4.2 Create a PR to the base-branch using the octokit API
     5. Otherwise, conclude the custom action    
    */




    core.info('I am a custom JS action');
}

run();


