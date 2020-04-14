export let config = {

    // forces client to vote yes
    alwaysTrue: false,

    // sets timeout on vote response
    // only used for demo, otherwise everything happens instantly
    timedAnswer: true,

    // overwrite local changes
    // if false it will vote no if there are changes.
    overwrite: false,

    // for p2p encryption
    key: "",

    // require that the client implements the newBalance method
    requireNewBalance: true,

};