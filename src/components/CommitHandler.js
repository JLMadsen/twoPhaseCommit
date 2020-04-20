/**
 * Implementation of the Two Phase Commit protocol (2PC)
 * Created for TDAT2004 project.
 *
 * @author https://github.com/JLMadsen
 */
export class CommitHandler {
    websocket;

    // overridable methods
    onLog;              // triggers when we receive a new message from socket
    onError;            // triggers on error
    onSetup;            // triggers when a new client connects or client gets designated a role
    onPhaseChange;      // triggers when a commit in initiated and when we receive success or abort
    onVote;             // triggers when a client votes

    log;                // Contains entire network log as string
    clientId;           // For identification in outgoing packets

    globalBalance;      // The shared balance between all clients
    localBalance;       // local balance which is edited
    oldBalance;         // holds the value while voting.
    WriteAheadLog;      // Incoming commit values

    isCoordinator;      // If client is coordinator
    isVoting;           // If client is currently voting
    isSender;           // Sender does not need to compare local changes
    isFresh;            // New client does not need to compare local changes

    votes;              // Array of votes
    amountOfClients;    // Number of clients connected to socket
    acknowledgements;   // Number of clients who has sent ack packets
    startTime;          // for timeout function, sets time when commit started.
    lastWrite;          // If timed out we can retry last message, not currently used.

    config;             // Config values

    /**
     * Initialize all variables with default values.
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
        this.acknowledgements = 0;
        this.lastWrite = "";

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
            host: "ws://localhost:4001",

            // time before coordinator aborts vote
            // in milliseconds
            timeout: 8000,
        };

        // save userConfig in config
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
     * Websocket.onmessage is the main component which translates the data from socket into an opcode and values
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

                case Action.acknowledge:
                    return this._handleAcknowlegde(data);

                default:
                    if(this.onError) this.onError("Unrecognized opcode", "warning");
            }
        }
    }

    /**
     * Reset the localBalance back to the globalBalance.
     * If the config has overwrite: false, the client needs to reset the localBalance or commit to be able to receive new commits.
     * Does not reset balance on "frontend", only in commithandler.
     */
    resetBalance() {

        this.localBalance = this.globalBalance;
    }

    /**
     * Method for client to set the Balance.
     * Requires isVoting to be false.
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
            if(this.onSetup) this.onSetup(this.amountOfClients, this.isCoordinator, this.clientId);
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
     * set startTime and setTimeout on _handleTimeout
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

            this.startTime = Date.now();
            setTimeout(() => {
                this._handleTimeout();
            }, this.config.timeout)
        }
    }

    /**
     * All clients vote on incoming commit data.
     * Checks if there are local changes and if onPhaseChange method has been implemented.
     * If there are local changes vote no and send dataMismatch
     * If the onPhaseChange method has not been implemented vote no and send writeError
     * Else vote yes
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

            // checks if the onPhaseChange method has been implemented
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

                if(!this.votes.some(vote => !vote.yes)) {

                    let success = Action.success +','+ this.clientId;
                    this.lastWrite = success;
                    this.websocket.send(success);

                } else {

                    let rollback = Action.rollback +','+ this.clientId;
                    this.lastWrite = rollback;
                    this.websocket.send(rollback);
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

        let ack =
            Action.acknowledge +","+
            this.clientId;

        this.websocket.send(ack);

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

        let ack =
            Action.acknowledge +","+
            this.clientId;

        this.websocket.send(ack);

        this._resetStates();
    }

    /**
     * Checks if all votes have been received after specified time.
     * If missing votes we abort commit
     * @private
     */
    _handleTimeout() {

        let timedOut = (this.startTime + this.config.timeout) < Date.now();

        if(this.votes.length !== this.amountOfClients && this.isCoordinator) {
            if(timedOut) {

                let abort =
                    Action.rollback +","+
                    this.clientId;

                this.websocket.send(abort)
            }
        }
    }

    /**
     * All clients send acknowledge so we can check if all clients managed to write data.
     * @param data
     * @private
     */
    _handleAcknowlegde(data) {

        if(this.isCoordinator) {
            this.acknowledgements++;

            if(this.acknowledgements === this.amountOfClients) {
                this.acknowledgements = 0;
                this.startTime = Date.now();

            } else if((this.startTime + this.config.timeout) < Date.now()) {
                this.onError("Missing acknowledgement.", "warning");
            }
        }
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