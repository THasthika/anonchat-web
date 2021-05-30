/**
 * 
 * Connections database like interface
 * 
 * Requirements:
 *  -> Register new users with their details and their desired partners
 *  -> Remove user when they disconnect
 *  -> Find a matching partner
 * 
 * **/

const emitter = require('events').EventEmitter;

const em = new emitter();

const connections = {}

function addOnAddConnectionListener(listener) {
    em.addListener('onAddConn', listener);
}

function addOnRemoveConnectionListener(listener) {
    em.addListener('onRemoveConn', listener);
}

function addOnUpdateConnectionListener(listener) {
    em.addListener('onUpdateConn', listener);
}

function addConnection(id, conn) {
    conn.pending = false;
    connections[id] = conn;
    em.emit('onAddConn', { id, conn });
}

function removeConnection(id) {
    conn = null;
    if (id in connections) {
        conn = connections[id];
        delete connections[id];
        em.emit('onRemoveConn', { id, conn })
    }
    return conn;
}

function checkExists(id) {
    return (id in connections);
}

function updateConnection(id, update) {
    if (!(id in connections)) {
        return;
    }
    conn = connections[id];
    conn = {
        ...conn,
        ...update
    }
    connections[id] = conn;
    em.emit('onUpdateConn', { id, conn })
}

function getPendingConnectionIDs() {
    const conns = Object.keys(connections).filter((pid) => {
        return connections[pid].pending == true
    });
    return conns;
}

function getConnection(id) {
    return connections[id];
}

function findMatch(id) {

    const myConn = connections[id];

    const partner = Object.entries(connections).find(([pid, _]) => {
        if (pid == id)
            return false;
        if (!connections[pid].pending)
            return false;
        // filter by other stuff

        const partnerConn = connections[pid];

        // check age matching
        if (myConn.matchAgeMin > partnerConn.age || myConn.matchAgeMax < partnerConn.age) return false;
        if (partnerConn.matchAgeMin > myConn.age || partnerConn.matchAgeMax < myConn.age) return false;

        // check gender matching
        if (myConn.matchGender != 0 && myConn.matchGender != partnerConn.gender) return false;
        if (partnerConn.matchGender != 0 && partnerConn.matchGender != myConn.gender) return false;

        // match tags if exists

        return true;
    })

    if (!partner) {
        return null;
    }

    const [pid, _] = partner

    return pid;

}

module.exports = {
    addOnAddConnectionListener,
    addOnRemoveConnectionListener,
    addOnUpdateConnectionListener,
    addConnection,
    checkExists,
    removeConnection,
    updateConnection,
    getConnection,
    findMatch,
    getPendingConnectionIDs
}