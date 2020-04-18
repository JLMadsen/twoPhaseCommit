/**
 * Implementation of the Two Phase Commit protocol (2PC)
 * Created for TDAT2004 project.
 *
 * @author https://github.com/JLMadsen
 */
export class CommitHandler {
    websocket;

    // overridable methods
    onLog;
    onError;
    onSetup;
    onPhaseChange;
    onVote;

    // log with all network packets
    log;
    clientId;

    globalBalance;
    localBalance;
    oldBalance; // holds the value while voting.
    WriteAheadLog;

    isCoordinator;
    isVoting;
    isSender; // sender does not need to compare local changes
    isFresh;  // fresh client does not need to compare local changes
    votes;
    amountOfClients;

    config;

    /**
     * Initialize all variables.
     */
    constructor(userConfig) {
        this.log = "";
        this.clientId = 0;

        this.globalBalance = 0;
        this.localBalance = 0;
        this.oldBalance = 0;
        this.WriteAheadLog = [];

        this.isCoordinator = false;
        this.isVoting = false;
        this.isSender = false;
        this.isFresh = true;
        this.votes = [];
        this.amountOfClients = 0;

        // config contains variables set by user before usage.
        // these variables are default but can be changed by user in constructor
        this.config = {

            // forces client to vote yes
            alwaysVoteYes: false,

            // sets timeout on vote response
            // only used for demo, otherwise everything happens instantly
            timedAnswer: true,

            // overwrite local changes
            // if false it will vote no if there are changes.
            overwrite: false,

            // for p2p encryption
            // Not yet implemented
            key: "",

            // require that the client implements the phaseChange method
            requireWrite: true,

            // socket host
            host: "ws://localhost:4001"
        };

        if(userConfig) {
            let key;
            for (key in this.config) {
                if (userConfig.hasOwnProperty(key)) {
                    this.config[key] = userConfig[key];
                }
            }
        }
    }

    /**
     * Connects the CommitHandler to the socket server.
     * Default host is "ws://localhost:4001".
     * This method defines the socket behaviour.
     *
     * @return void
     */
    connect() {

        this.websocket = new WebSocket(this.config.host);

        this.websocket.onopen = () => {
            this._appendLog("Connected to socket");
        };

        this.websocket.onerror = (err) => {
            this._appendLog("Socket error!");
            console.log(err);
        };

        this.websocket.onmessage = (event) => {
            let data = event.data.split(',');
            let opcode = data[0];
            this._appendLog(data);

            switch (opcode) {
                case Action.setup:
                    return this._handleSetup(data);

                case Action.commit:
                    return this._handleCommit(data);

                case Action.requestVote:
                    return this._handleRequestVote(data);

                case Action.vote:
                    return this._handleVote(data);

                case Action.success:
                    return this._handleSuccess(data);

                case Action.rollback:
                    return this._handleRollback(data);

                default:
                    if(this.onError) this.onError("Unrecognized opcode", "warning");
            }
        }
    }

    /**
     * Reset the localBalance back to the globalBalance.
     * If the config has overwrite: false, the client needs to reset the localBalance or commit to be able to recieve new commits.
     */
    resetBalance() {

        this.localBalance = this.globalBalance;
    }

    /**
     * Method for client to set the Balance.
     * @param balance
     */
    setBalance(balance){
        if(this.isVoting) {
            if(this.onError) this.onError("Vote in progress", "warning");
            return
        }

        this.localBalance = balance;
    }

    /**
     * Starts the commit phase.
     * Requires isVoting to be false.
     */
    execCommit() {
        if(this.isVoting) {
            if(this.onError) this.onError("Vote in progress", "warning");
            return
        }

        this.isSender = true;
        this.isVoting = true;
        this.votes = [];

        // reset visual error, could move this out
        if(this.onError) this.onError('', 'primary');

        let commit =
            Action.commit +','+
            this.clientId +','+
            this.localBalance;

        this.websocket.send(commit);
    }

    /**
     * Handles data related to number of clients and isCoordinator status.
     * @param data
     * @private
     */
    _handleSetup(data) {

        if(data[1] === Action.newClient) {
            this.amountOfClients = parseInt(data[2]);
            if(this.onSetup) this.onSetup(this.amountOfClients, this.isCoordinator);
            return;
        }

        if(data[2].includes("coordinator")) {
            this.isCoordinator = true;
        }

        this.clientId = parseInt(data[1]);
    }

    /**
     * Inform client of new phase.
     * If coordinator send requestVote message.
     * @param data
     * @private
     */
    _handleCommit(data) {

        if(this.onPhaseChange) this.onPhaseChange(Action.commit, parseInt(data[2]));

        if(this.isCoordinator) {

            let request =
                Action.requestVote +','+
                this.clientId  +','+
                data[2];

            this.websocket.send(request);
        }
    }

    /**
     * All clients vote on incoming commit data.
     * Checks if there are local changes and if onNewPhase method has been implemented.
     * @param data
     * @private
     */
    _handleRequestVote(data) {

        this.isVoting = true;
        let commitBalance = parseInt(data[2]);

        this.WriteAheadLog.push(commitBalance);
        this.oldBalance = this.localBalance;
        this.localBalance = commitBalance;

        let ok = true;
        let desc;

        if(!this.config.alwaysVoteYes && !this.isSender) {
            // if client has local changes
            // this can be disabled in config
            if(!this.config.overwrite) {
                if(!this.isFresh) {
                    if(this.oldBalance !== this.globalBalance) {
                        ok = false;
                        desc = Action.dataMismatch;
                    }
                }
            }

            // this checks if the onPhaseChange method has been implemented
            if(this.config.requireWrite) {
                if (!this.onPhaseChange) {
                    ok = false;
                    desc = Action.writeError;
                }
            }
        }

        let vote =
            Action.vote +','+
            this.clientId +',';

        vote += ok? Action.voteYes : Action.voteNo;

        // if voted no we have error message
        if(desc) vote += ","+ desc;

        // slow down system to see communication
        if(this.config.timedAnswer) {

            let timeout = Math.random() * (5000 - 2500) + 2500;
            setTimeout(() => {this.websocket.send(vote);}, timeout);

        } else {

            this.websocket.send(vote);
        }
    }

    /**
     * Inform client of new votes.
     * If coordinator count votes and send result when all votes are counted.
     * @param data
     * @private
     */
    _handleVote(data) {
        let res = new Vote();
        res.id = parseInt(data[1]);
        res.yes = (data[2] === Action.voteYes);

        this.votes.push(res);
        if(this.onVote) this.onVote(this.votes);

        if(this.isCoordinator) {
            if(this.votes.length === this.amountOfClients) {


                let successes = 0;
                for(let i=0; i<this.votes.length; i++){
                    if(this.votes[i].yes){
                        successes++;
                    }
                }

                if(successes === this.amountOfClients) {
                    this.websocket.send(Action.success +','+ this.clientId);
                } else {
                    this.websocket.send(Action.rollback +','+ this.clientId);
                }
            }
        }
    }

    /**
     * Sends client new balance and state change.
     * @param data
     * @private
     */
    _handleSuccess(data) {

        this.localBalance = this.WriteAheadLog[this.WriteAheadLog.length -1];
        this.globalBalance = this.localBalance;

        if(this.onPhaseChange) this.onPhaseChange(Action.success, this.localBalance);
        if(this.onError) this.onError("Commit successful!", "success");

        this._resetStates();
    }

    /**
     * Sends client old balance and state change.
     * @param data
     * @private
     */
    _handleRollback(data) {

        this.localBalance = this.oldBalance;

        if(this.onPhaseChange) this.onPhaseChange(Action.rollback, this.oldBalance);
        if(this.onError) this.onError("Commit failed.", "danger");

        this._resetStates();
    }

    /**
     * CommitHandler state resets and is ready for new commit.
     * @private
     */
    _resetStates() {
        this.isVoting = false;
        this.isFresh = false;
        this.isSender = false;
        this.votes = [];
    }

    /**
     * Updates network log and sends it to client if onLog method has been implemented.
     * @param content
     * @private
     */
    _appendLog(content){
        this.log += content + "\n";
        if(this.onLog) this.onLog(this.log);
    }
}

/**
 * JSON object for easy Action identification.
 * @type {{newClient: string, rollback: string, acknowledge: string, requestVote: string, voteNo: string, voteYes: string, success: string, commit: string, setup: string, vote: string, dataMismatch: string, writeError: string}}
 */
export let Action = {
    // startup
    setup: "Setup",
    newClient: "NewClient",

    // phases
    commit: "Commit",
    requestVote: "RequestVote",  // send to participants
    vote: "Vote",                // send to coordinator with answer

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

/**
 * Simple vote class.
 * Contains whether client voted yes and their id.
 */
export class Vote{
    yes;
    id;
    voted = false;
}