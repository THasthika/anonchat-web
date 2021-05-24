const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

app.use(express.static('./public'));

const { Server } = require("socket.io");
const io = new Server(server);

connections = {};

function setConnectionInfo(id, info) {
    connections[id] = info;
}

function removeConnection(id) {
    delete connections[id];
}

function assignConnectionPending(id, pending) {
    console.log(id, id in connections);
    if (id in connections)
        connections[id].pending = pending;
}

function findPartners(id, max) {
    const partners = Object.entries(connections).filter(([pid, _]) => {
        if (pid == id)
            return false;
        if (connections[pid].pending)
            return true;
        return false;
    }).map(([id, dict]) => {
        return {
            id: id,
            age: dict.age,
            gender: dict.gender,
            tags: dict.tags,
            matchAgeMin: dict.matchAgeMin,
            matchAgeMax: dict.matchAgeMax,
            matchGender: dict.matchGender,
            offer: dict.offer
        }
    });
    // console.log(partners);
    // const partners = Object.keys(connections).filter((pid) => {
        
    // }).map(id => connections[id]);

    // return partners;

    return partners;
}

// function sendPartnerInfo(id, partnerId) {
//     // connections[id].emit('partnerInfo', {
//     //     ''
//     // })
// }

setInterval(() => {
    // console.log("Number of clients: " + Object.keys(connections).length)
    console.debug("Pending clients clients: " + Object.entries(connections).filter(([_, dict]) => {
        return dict.pending
    }).length);
}, 1000);

io.on('connection', (socket) => {

    socket.on('info', function(data) {
        const id = this.id;
        data = {
            ...data,
            pending: false,
            socket: this
        }
        setConnectionInfo(id, data);
    });

    socket.on('disconnect', function() {
        const id = this.id;
        removeConnection(id);
    });

    socket.on('search', function(data) {
        const max = data.max;
        const id = this.id;
        assignConnectionPending(id, true);
        const partners = findPartners(id, max);
        this.emit('partners', partners);
    });

    socket.on('sendAnswer', function({ id, answer }) {
        const dict = connections[this.id];
        connections[id].socket.emit('answer', {
            id: this.id,
            age: dict.age,
            gender: dict.gender,
            tags: dict.tags,
            matchAgeMin: dict.matchAgeMin,
            matchAgeMax: dict.matchAgeMax,
            matchGender: dict.matchGender,
            offer: dict.offer,
            answer
        })
    })

    socket.on('found', function() {
        const id = this.id;
        assignConnectionPending(id, false);
    });

});

server.listen(3000, () => {
    console.log('listening on *:3000');
});