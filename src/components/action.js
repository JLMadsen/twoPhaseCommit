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
    rollback: 302
};