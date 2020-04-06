export let action = {
    // startup
    setup: 100,
    newClient: 101,

    // phases
    commit: 102,
    requestVote: 103,  // send to participants
    vote: 104,         // send to coordinator with answer

    // voting
    voteYes: 201,
    voteNo: 202,

    // commit
    success: 301,
    rollback: 302,
    acknowledge: 302
};

// for logging
export function getDesc(key) {
    let num = parseInt(key)
    switch (num) {
        case action.setup:
            return "setup";
        case action.newClient:
            return "newClient";
        case action.commit:
            return "commit";
        case action.requestVote:
            return "requestVote";
        case action.vote:
            return "vote";
        case action.voteYes:
            return "voteYes";
        case action.voteNo:
            return "voteNo";
        case action.success:
            return "success";
        case action.rollback:
            return "rollback";
        default:
            return key;
    }
}

export class Vote{
    yes;
    id;
    temp = false;
}