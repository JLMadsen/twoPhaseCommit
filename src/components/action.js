// opcodes for communication
export let action = {
    // startup
    setup: "Setup",
    newClient: "NewClient",

    // phases
    commit: "Commit",
    requestVote: "RequestVote",  // send to participants
    vote: "Vote",         // send to coordinator with answer

    // voting
    voteYes: "VoteYes",
    voteNo: "VoteNo",

    // commit
    success: "Success",
    rollback: "Rollback",
    acknowledge: "Acknowledge",

    // abort message
    dataMismatch: "DataMismatch",
    writeError: "WriteError"
};

export class Vote{
    yes;
    id;
    temp = false;
}