const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

app.use(express.static('./public'));

const { Server } = require("socket.io");
const io = new Server(server);

const connectionsManager = require('./connections');

// connections = {};

// function setConnectionInfo(id, info) {
//     connections[id] = info;
// }

// function removeConnection(id) {
//     delete connections[id];
// }

// function assignConnectionPending(id, pending) {
//     console.log(id, id in connections);
//     if (id in connections)
//         connections[id].pending = pending;
// }

// function findPartners(id, max) {
//     const partners = Object.entries(connections).filter(([pid, _]) => {
//         if (pid == id)
//             return false;
//         if (connections[pid].pending)
//             return true;
//         return false;
//     }).map(([id, dict]) => {
//         return {
//             id: id,
//             age: dict.age,
//             gender: dict.gender,
//             tags: dict.tags,
//             matchAgeMin: dict.matchAgeMin,
//             matchAgeMax: dict.matchAgeMax,
//             matchGender: dict.matchGender,
//             offer: dict.offer
//         }
//     });
//     // console.log(partners);
//     // const partners = Object.keys(connections).filter((pid) => {
        
//     // }).map(id => connections[id]);

//     // return partners;

//     return partners;
// }

// // function sendPartnerInfo(id, partnerId) {
// //     // connections[id].emit('partnerInfo', {
// //     //     ''
// //     // })
// // }

function notifyPendingConnections() {
    // match potential connections and send them their partner ids

    const connIds = connectionsManager.getPendingConnectionIDs();

    while (connIds.length > 0) {
        const connId = connIds.pop();
        const partnerId = connectionsManager.findMatch(connId);
        if (!partnerId) continue;

        const partnerIndex = connIds.indexOf(partnerId);
        connIds.splice(partnerIndex, 1);

        // notify the new matches
        const conn = connectionsManager.getConnection(connId);
        const partnerConn = connectionsManager.getConnection(partnerId);

        conn.socket.emit('partner', { id: partnerId, firstContact: true });
        partnerConn.socket.emit('partner', { id: connId, firstContact: false });

        // update these connections as not pending anymore
        connectionsManager.updateConnection(connId, { pending: false });
        connectionsManager.updateConnection(partnerId, { pending: false });
    }

}

setInterval(notifyPendingConnections, 1000);

// setInterval(() => {
//     // console.log("Number of clients: " + Object.keys(connections).length)
//     console.debug("Pending clients clients: " + Object.entries(connections).filter(([_, dict]) => {
//         return dict.pending
//     }).length);
// }, 1000);

connectionsManager.addOnRemoveConnectionListener(({id, conn}) => {
    // add the other party back into user pool
})

connectionsManager.addOnUpdateConnectionListener(({id, conn}) => {
    // console.log('User Updated ' + id + ' pending ' + conn.pending);
})

io.on('connection', (socket) => {

    socket.on('info', function(data) {
        const id = this.id;
        data = {
            ...data,
            pending: false,
            socket: this
        }
        if (connectionsManager.checkExists(id)) {
            connectionsManager.updateConnection(id, data);
        } else {
            connectionsManager.addConnection(id, data);
        }
        console.log('User: Info ' + id);
    })

    socket.on('update', function(data) {
        const id = this.id;
        connectionsManager.updateConnection(id, data);
        console.log('User: Update ' + id);
    });

    socket.on('disconnect', function() {
        const id = this.id;
        connectionsManager.removeConnection(id);
        console.log('User: Removed ' + id);
    });

    socket.on('sendOffer', function({partnerId, offer}) {
        const id = this.id;
        const partner = connectionsManager.getConnection(partnerId);
        partner.socket.emit('onOffer', { id, offer });
        console.log('User: Send Offer ' + id);
    });

    socket.on('sendAnswer', function({partnerId, answer}) {
        const id = this.id;
        const partner = connectionsManager.getConnection(partnerId);
        partner.socket.emit('onAnswer', { id, answer });
        console.log('User: Send Answer ' + id);
    });

    // socket.on('search', function(data) {
    //     const max = data.max;
    //     const id = this.id;
    //     assignConnectionPending(id, true);
    //     const partners = findPartners(id, max);
    //     this.emit('partners', partners);
    // });

    // socket.on('sendAnswer', function({ id, answer }) {
    //     const dict = connections[this.id];
    //     connections[id].socket.emit('answer', {
    //         id: this.id,
    //         age: dict.age,
    //         gender: dict.gender,
    //         tags: dict.tags,
    //         matchAgeMin: dict.matchAgeMin,
    //         matchAgeMax: dict.matchAgeMax,
    //         matchGender: dict.matchGender,
    //         offer: dict.offer,
    //         answer
    //     })
    // })

    // socket.on('found', function() {
    //     const id = this.id;
    //     assignConnectionPending(id, false);
    // });

});

server.listen(3000, () => {
    console.log('listening on *:3000');
});