// function getConnectedDevices(type, callback) {
//     navigator.mediaDevices.enumerateDevices()
//         .then(devices => {
//             const filtered = devices.filter(device => device.kind === type);
//             callback(filtered);
//         });
// }

// // const constraints = {
// //     'video': true,
// //     'audio': true
// // }

// // getConnectedDevices('videoinput', cameras => {
// //     console.log(cameras[0])
// // });

// // Updates the select element with the provided set of cameras
// function updateCameraList(cameras) {
//     const listElement = document.querySelector('select#availableCameras');
//     listElement.innerHTML = '';
//     cameras.map(camera => {
//         const cameraOption = document.createElement('option');
//         cameraOption.label = camera.label;
//         cameraOption.value = camera.deviceId;
//         return cameraOption;
//     }).forEach(cameraOption => {
//         listElement.add(cameraOption)
//     });
// }

// // Fetch an array of devices of a certain type
// async function getConnectedDevices(type) {
//     const devices = await navigator.mediaDevices.enumerateDevices();
//     return devices.filter(device => device.kind === type)
// }

// // Open camera with at least minWidth and minHeight capabilities
// async function openCamera(cameraId, minWidth, minHeight) {
//     const constraints = {
//         'audio': {'echoCancellation': true},
//         'video': {
//             'deviceId': cameraId,
//             'width': {'min': minWidth},
//             'height': {'min': minHeight}
//             }
//         }

//     return await navigator.mediaDevices.getUserMedia(constraints);
// }

// // play it on local stream
// async function playVideoFromCamera(stream) {
//     try {
//         const videoElement = document.querySelector('video#localVideo');
//         vstream = await stream;
//         videoElement.srcObject = vstream;
//     } catch(error) {
//         console.error('Error opening video camera.', error);
//     }
// }

// // Get the initial set of cameras connected
// getConnectedDevices('videoinput').then(cameras => {
//     updateCameraList(cameras);
//     onCameraSelectChange();
// });

// // Listen for changes to media devices and update the list accordingly
// navigator.mediaDevices.addEventListener('devicechange', async event => {
//     const newCameraList = await getConnectedDevices('video');
//     updateCameraList(newCameraList);
// });

// document.querySelector('select#availableCameras').addEventListener("change", onCameraSelectChange);

// document.querySelector('input#localHeight').addEventListener("change", onLocalSizeChange);
// document.querySelector('input#localWidth').addEventListener("change", onLocalSizeChange);

// function onLocalSizeChange() {
//     onCameraSelectChange();
// }

// function onCameraSelectChange() {
//     const height = parseInt(document.querySelector('input#localHeight').value);
//     const width = parseInt(document.querySelector('input#localWidth').value);

//     document.querySelector("video#localVideo").setAttribute('width', width);
//     document.querySelector("video#localVideo").setAttribute('height', height);

//     // console.log(e);
//     const x = document.querySelector('select#availableCameras');
//     cameraId = x.value;
//     if (cameraId) {
//         const stream = openCamera(cameraId, width, height);
//         playVideoFromCamera(stream);
//     }
// }

// // const cameras = getConnectedDevices('videoinput');
// // if (cameras && cameras.length > 0) {
// //     // Open first available video camera with a resolution of 1280x720 pixels
// //     const stream = openCamera(cameras[0].deviceId, 1280, 720);
// // }

// const localOfferTextArea = document.querySelector("textarea#localOffer");
// const remoteOfferTextArea = document.querySelector("textarea#remoteOffer");
// const remoteAnswerTextArea = document.querySelector("textarea#remoteAnswer");
const $inMsg = $('input#inMsg');
const $messages = $('div#messages');
const $connectionStatus = $('#connectionStatus');

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

function addMsg(from, msg) {
    const newMsg = htmlToElement('<p><span><span class="from">'+from+'</span></span> - <span class="msg">'+msg+'</span></p>');
    $messages.append(newMsg);
}

$inMsg.on("keyup", (e) => {
    if(e.key == "Enter") {
        newMsg = $inMsg.val();
        $inMsg.val("");
        addMsg("Me", newMsg);
        sendMsgToRemote(newMsg);
    }
})

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
const pc = new RTCPeerConnection(configuration);
var gPartners = [];
var gPartner = null;
var offer = null;
var searching = false;
var channel = null;
var connected = false;

pc.onicecandidate = e =>  {
    offer = JSON.stringify(pc.localDescription);
    updateUserInfo();
}

pc.ondatachannel = e => {
    channel = e.channel;
    configureChannel(channel);
    pc.channel = channel;
}

// remoteOfferTextArea.addEventListener("change", onRemoteOfferChange);
// function onRemoteOfferChange() {
//     const remoteOffer = JSON.parse(remoteOfferTextArea.value);
//     pc.setRemoteDescription(remoteOffer);
//     pc.createAnswer().then(a => {
//         pc.setLocalDescription(a)
//     })
// }

// remoteAnswerTextArea.addEventListener("change", onRemoteAnswerChange);
// function onRemoteAnswerChange() {
//     const remoteAnswer = JSON.parse(remoteAnswerTextArea.value);
//     pc.setRemoteDescription(remoteAnswer);
// }

function configureChannel(lChannel) {
    lChannel.onmessage =e =>  {
        console.log(e);
        addMsg('Stranger', e.data)
    }
    lChannel.onopen = e => {
        console.log("Connected");
        socket.emit('found');
        connected = true;
    };
    lChannel.onclose =e => {
        console.log("Disconnected");
        if (searching) {
            searchPartners();
        }
        connected = false;
    };
}

channel = pc.createDataChannel("sendChannel");
configureChannel(channel);


pc.createOffer().then(o => pc.setLocalDescription(o))

function sendMsgToRemote(text) {
    if(connected) {
        console.log("Sending Data" + text);
        channel.send(text);
    }
}

var socket = io();

socket.on("connect", () => {
    updateUserInfo();
});

socket.on('partners', async (partners) => {
    gPartners = partners;
    searchPartners();
});

socket.on('answer', async (data) => {
    gPartner = data;
    searching = false;
    const answer = JSON.parse(data.answer);
    pc.setRemoteDescription(answer);
});

async function searchPartners() {
    // if (gPartners.length == 0 && searching && !connected) {
    //     setTimeout(() => {
    //         socket.emit('search', { max: 10 });
    //     }, 1000);
    //     return;
    // }

    if (gPartners.length == 0) {
        return; 
    }

    gPartner = gPartners.pop();
    connectToPartner();
}

async function connectToPartner() {

    const partner = gPartner;
    const offer = JSON.parse(partner.offer);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('sendAnswer', {
        id: partner.id,
        answer: JSON.stringify(answer)
    });
}

// socket.on("partner", (partner) => {
//     onNewPartner(partner);
// });

// socket.on('searchStopped', () => {
//     setConnectionStatus('disconnected');
//     $('#connect').prop('disabled', false);
//     $('#cancel').prop('disabled', true);
// });

// socket.on('searchStarted', () => {
//     setConnectionStatus('pending');
//     $('#connect').prop('disabled', true);
//     $('#cancel').prop('disabled', false);
// });

$('#connect').on('click', function () {
    searching = true;
    socket.emit('search', { max: 10 });
});

$('#cancel').on('click', function () {
    searching = false;
});

// $('#cancel').on('click', function() {
//     socket.emit('stopSearch');
// });

$('#localAge').on('change', updateUserInfo);
$('#localGender').on('change', updateUserInfo);
$('#localTags').on('change', updateUserInfo);
$('#matchAge').on('change', updateUserInfo);
$('#matchGender').on('change', updateUserInfo);

function onNewPartner(partner) {
    console.log(partner);
}

function updateUserInfo() {

    const age = parseInt($('#localAge').val());
    const gender = parseInt($('#localGender').val());
    const tags = $('#localTags').val().split(",").filter((x) => {
        if (!x || x == "")
            return false;
        return true;
    })

    const matchAge = $('#matchAge').val();
    matchAges = matchAge.split(",");
    var minAge = 0, maxAge = 0;
    if (matchAges.length == 1) {
        minAge = matchAges[0];
        maxAge = matchAges[0];
    }
    if (matchAges.length == 2) {
        minAge = matchAges[0];
        maxAge = matchAges[1];
    }

    const matchGender = parseInt($('#matchGender').val());

    const data = {
        age: age,
        gender: gender,
        tags: tags,
        matchAgeMin: parseInt(minAge),
        matchAgeMax: parseInt(maxAge),
        matchGender: matchGender,
        offer: offer
    }

    socket.emit("info", data);
}