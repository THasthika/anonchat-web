var gPending = false;
var gConnected = false;

const $inMsg = $('input#inMsg');
const $messages = $('div#messages');
const $connectionStatus = $('#connectionStatus .status');

const $connect = $('#connect');
const $cancel = $('#cancel');
const $localAge = $('#localAge');
const $localGender = $('#localGender');
const $localTags = $('#localTags');
const $matchAgeMin = $('#matchAgeMin');
const $matchAgeMax = $('#matchAgeMax');
const $matchGender = $('#matchGender');

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
let gPC = null;
let gOffer = null;

createNewPeerConnection(configuration);

const socket = io();

socket.on('partner', handleOnNewPartner);

function setConnectionStatus(status) {
    if (status == "disconnected") {
        $connectionStatus.text("Disconnected");
    } else if (status == "connected") {
        $connectionStatus.text("Connected");
    } else if (status == "pending") {
        $connectionStatus.text("Pending");
    }
}

function htmlToElement(html) {
    return $.parseHTML(html);
}

function addMsg(from, msg, side) {
    if (!side) {
        side = 'left';
    }
    console.log(side);
    const content = `
    <div class="flex-initial flex ${(side == 'right') ? 'flex-row-reverse' : 'flex-row'}">
        <span class="flex-initial p-2 m-1 shadow">
            <span class="from text-xs block">${from}</span>
            <span class="content">${msg}</span>
        </span>
    </div>
    `

    const newMsg = htmlToElement(content);
    $messages.append(newMsg);
}

$inMsg.on("keyup", (e) => {
    if(e.key == "Enter") {
        newMsg = $inMsg.val();
        $inMsg.val("");
        addMsg("Me", newMsg, 'right');
        sendMsgToRemote(newMsg);
    }
})

$localAge.on('change', updateUserInfo);
$localGender.on('change', updateUserInfo);
$localTags.on('change', updateUserInfo);
$matchAgeMin.on('change', updateUserInfo);
$matchAgeMax.on('change', updateUserInfo);
$matchGender.on('change', updateUserInfo);
updateUserInfo();


function handleOnNewPartner({id, firstContact}) {
    const partnerId = id;
    if (firstContact) {
        console.log('Waiting on Answer...');
        socket.on('onAnswer', async ({ id, answer }) => {
            if (partnerId != id) return;
            console.log('Answer ' + answer);
            await gPC.setRemoteDescription(JSON.parse(answer));

            socket.off('onAnswer');
        });

        // send local offer to remort
        socket.emit('sendOffer', { partnerId, offer: gOffer });
        console.log('sent offer ' + gOffer);
    } else {
        // create a peer connection and wait for offer
        console.log('Waiting on Offer...');
        socket.on('onOffer', async ({ id, offer }) => {
            if (partnerId != id) return;
            console.log('Offer ' + offer);
            const answer = await createAnswer(gPC, offer);
            const strAnswer = JSON.stringify(answer);
            socket.emit('sendAnswer', { partnerId, answer: strAnswer });
            console.log('sent answer ' + strAnswer);

            socket.off('onOffer');
        });
    }
}

function updateUserInfo() {

    const age = parseInt($localAge.val());
    const gender = parseInt($localGender.val());
    const tags = $localTags.val().split(",").filter((x) => {
        if (!x || x == "")
            return false;
        return true;
    })

    const minAge = parseInt($matchAgeMin.val()) || 0;
    const maxAge = parseInt($matchAgeMax.val()) || 0;

    if (minAge > maxAge) {
        $matchAgeMin.val(maxAge);
        return;
    }

    const matchGender = parseInt($matchGender.val()) || 0;

    const data = {
        age: age,
        gender: gender,
        tags: tags,
        matchAgeMin: minAge,
        matchAgeMax: maxAge,
        matchGender: matchGender
    }

    socket.emit('info', data);
}

// on connect change the status of the user to pending
$connect.on('click', () => {
    if (!gConnected && !gPending) {
        gPending = true;
        $cancel.removeAttr('disabled');
        $connect.attr('value', 'Pending');
        $connect.attr('disabled', '');

        // notify backend
        socket.emit('update', { pending: true })

    }
});

// on cancel before connected
$cancel.on('click', () => {
    gPending = false;
    if (!gConnected && gPending) {
        // notify backend
        socket.emit('update', { pending: false })

    } else if (gConnected) {
        // clear chat
        gPC.channel.close();
    }
    $connect.removeAttr('disabled');
    $connect.attr('value', 'Connect');
    $cancel.attr('disabled', '');
});

function configureChannel(channel) {
    channel.onmessage =e =>  {
        console.log(e);
        addMsg('Stranger', e.data, 'left')
    }
    channel.onopen = e => {
        console.log("Connected");
        $connect.attr('value', 'Connected');
        gConnected = true;
        setConnectionStatus('connected');
    };
    channel.onclose = async e => {
        console.log("Disconnected");
        setConnectionStatus('disconnected');
        $messages.html('');
        gConnected = false;
        gPending = false;
        $connect.removeAttr('disabled');
        $connect.attr('value', 'Connect');
        $cancel.attr('disabled', '');
        console.log("Closed Connection")
        gPC.close();
        delete gPC;
        socket.off('onOffer');
        socket.off('onAnswer');
        gPC = null;
        socket.remove
        createNewPeerConnection();
    };
}

function createNewPeerConnection(configuration) {

    gPC = new RTCPeerConnection(configuration);
    gConnected = false;

    gPC.onicecandidate = (e) => {
        gOffer = JSON.stringify(gPC.localDescription);
    }
    
    gPC.ondatachannel = e => {
        channel = e.channel;
        configureChannel(channel);
        gPC.channel = channel;
    }
    
    channel = gPC.createDataChannel("sendChannel");
    configureChannel(channel);
    
    gPC.createOffer().then(o => gPC.setLocalDescription(o));
}

function createOffer(pc) {
    const offer = JSON.stringify(pc.localDescription);
    return offer;
}

async function createAnswer(pc, offer) {
    const offerJson = JSON.parse(offer);
    await pc.setRemoteDescription(offerJson);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
}

function sendMsgToRemote(text) {
    if(gConnected) {
        console.log("Sending Data" + text);
        gPC.channel.send(text);
    }
}