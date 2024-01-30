import { io } from "https://cdn.socket.io/4.5.1/socket.io.esm.min.js";
let socket = io()
socket.on("window.close", () => {
    window.close()
})
let peer = new Peer(undefined, {
    path: "/peerjs",
    host: "/",
    port: "80",
});
const status = {
    microphone: true,
    mute: false
}

window.addEventListener("load", () => {
    const option = {
        "cam": document.getElementById("option-cam"),
        "mic": document.getElementById("option-mic"),
        "vol": document.getElementById("option-vol")
    }
    const messageList = document.getElementById("messages")
    const messageInput = document.getElementById("message-chat")
    const messageSend = document.getElementById("message-send")
    const videoGrid = document.getElementById("video-grid")
    const userVideo = document.createElement("video")
    const headerUsername = document.getElementById("header-username")
    userVideo.muted = true
    if (navigator.mediaDevices) {
        peer.on("open", (id) => {
            console.log(id);
            let pseudo = prompt("pseudo")
            if (!pseudo) return location.reload()
            navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((stream) => {
                peer.on("call", (call) => {
                    console.log("call");
                    call.answer(stream);
                    // const video = document.createElement("video")
                    // video.id = call.peer
                    let video = new VideoStream(call.peer)
                    call.on("stream", (userStream) => {
                        // addVideoStream(video, userStream)
                        video.init(userStream)
                    })
                })
                socket.emit("user.login", pseudo, id, (chat, user) => {
                    document.title = "simple video chat - " + user.username
                    headerUsername.innerText = user.username
                    status["stream"] = stream
                    status["user"] = user
                    // userVideo.id = id
                    // addVideoStream(userVideo, stream)
                    new VideoStream(id, userVideo).init(stream)
                    socket.on("user.connect", (user) => {
                        connectToUser(user, stream)
                    })
                    chat.forEach(loadMessage);
                    socket.on("chat", loadMessage)
                    socket.on("user.disconnect", (user) => {
                        disconnectToUser(user)
                    })
                });

                document.addEventListener("keypress", (KE) => {
                    if (KE.key === "Enter" && document.activeElement === messageInput) {
                        socket.emit("message", messageInput.value, () => {
                            messageInput.value = ""
                        })
                    } else if (KE.key.length === 1 && document.activeElement !== messageInput) {
                        messageInput.focus()
                    }
                })
                document.addEventListener("click", (ME) => {
                    if (ME.target && ME.target.classList && ME.target.classList.contains("user")) {
                        callback(ME.target)
                    } else if (ME.target && ME.target.parentElement && ME.target.parentElement.classList && ME.target.parentElement.classList.contains("user")) {
                        callback(ME.target.parentElement)
                    }

                    function callback(element) {
                        messageInput.value += (messageInput.value[messageInput.value.length - 1] === " " ? "" : (messageInput.value.length > 0 ? " " : "")) + element.dataset["user"]
                        messageInput.focus()
                    }
                })

                messageSend.addEventListener("click", () => {
                    socket.emit("message", messageInput.value, () => {
                        messageInput.value = ""
                    })
                    messageInput.focus()
                })

                option.cam.addEventListener("click", () => {
                    if (stream.getVideoTracks()[0].enabled) {
                        stream.getVideoTracks()[0].enabled = false
                        option.cam.style.backgroundColor = "var(--red-color)"
                        option.cam.innerHTML = '<span class="material-symbols-outlined" id="video-cut">videocam_off</span>'
                        socket.emit("user.cam.off")
                    } else {
                        stream.getVideoTracks()[0].enabled = true
                        option.cam.style.backgroundColor = "var(--blue-color)"
                        option.cam.innerHTML = '<span class="material-symbols-outlined" id="video-cut">videocam</span>'
                        socket.emit("user.cam.on")
                    }
                })
                option.mic.addEventListener("click", () => {
                    if (stream.getAudioTracks()[0].enabled) {
                        stream.getAudioTracks()[0].enabled = false
                        option.mic.style.backgroundColor = "var(--red-color)"
                        option.mic.innerHTML = '<span class="material-symbols-outlined" id="micro-cut">mic_off</span>'
                        socket.emit("user.mic.off")
                    } else {
                        stream.getAudioTracks()[0].enabled = true
                        option.mic.style.backgroundColor = "var(--blue-color)"
                        option.mic.innerHTML = '<span class="material-symbols-outlined" id="micro-cut">mic</span>'
                        socket.emit("user.mic.on")
                    }
                })
            })
        })
    } else {
        alert("Microphone not detected")
    }
    // socket.on("users.update", (users) => {
    //     usersList.innerHTML = ""
    //     users.forEach(user => {
    //         usersList.innerHTML = usersList.innerHTML + `<div class="users-listed"><div class="users-name">${user.name}</div><div class="users-descriminator">#${user.descriminator}</div></div>`
    //     });
    // })
    function loadMessage(message) {
        if (message.type === "message") {
            let msg = document.createElement("div")
            msg.classList.add("message")
            msg.innerHTML = `<div class="from"><div class="user" data-user="${message.name}#${message.descriminator}"><div class="name">${message.name}</div><div class="descriminator">#${message.descriminator}</div></div><div class="semi-colon">:</div></div><div class="content">${message.content}</div>`
            messageList.appendChild(msg)
        } else if (message.type === "join" || message.type === "leave") {
            let msg = document.createElement("div")
            msg.classList.add(message.type + "-message")
            msg.innerHTML = `<span class="material-symbols-outlined arrow">trending_flat</span><div class="user" data-user="${message.name}#${message.descriminator}"><div class="name">${message.name}</div><div class="descriminator">#${message.descriminator}</div></div>`
            messageList.appendChild(msg)
        }
    }
    class VideoStream {
        constructor(id, video) {
            this.id = id
            this.video = video || document.createElement("video")
            this.videoContainer = document.createElement("div")
            this.videoContainer.classList.add("video-container")
            this.videoContainer.id = id
            this.videoContainer.appendChild(this.video)
            this.userState = document.createElement("div")
            this.userState.classList.add("user-state")
            this.micIcon = document.createElement("div")
            this.micIcon.classList.add("material-symbols-outlined", "state-icon", "mic-icon")
            this.micIcon.innerHTML = "mic_off"
            this.camIcon = document.createElement("div")
            this.camIcon.classList.add("material-symbols-outlined", "state-icon", "cam-icon")
            this.camIcon.innerHTML = "videocam_off"
            this.userState.appendChild(this.micIcon)
            this.userState.appendChild(this.camIcon)
            this.videoContainer.appendChild(this.userState)
            videoGrid.append(this.videoContainer);
            this.video.addEventListener("loadedmetadata", () => {
                this.video.play();
            });
            socket.on("user.mic.on", (userid) => {
                if (userid === id) {
                    this.mic(true)
                }
            })
            socket.on("user.mic.off", (userid) => {
                if (userid === id) {
                    this.mic(false)
                }
            })
            socket.on("user.cam.on", (userid) => {
                if (userid === id) {
                    this.cam(true)
                }
            })
            socket.on("user.cam.off", (userid) => {
                if (userid === id) {
                    this.cam(false)
                }
            })
        }
        init(stream) {
            console.log(this.id);
            this.video.srcObject = stream;
            this.stream = stream
            let videoStream = this
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
            scriptProcessor.onaudioprocess = function () {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                const arraySum = array.reduce((a, value) => a + value, 0);
                const average = Math.round(arraySum / array.length)
                if (average > 1) {
                    videoStream.videoContainer.classList.add("talk")
                } else {
                    videoStream.videoContainer.classList.remove("talk")
                }
            };
            return this
        }
        mic(state) {
            if (state) {
                this.micIcon.classList.remove("active")
            } else {
                this.micIcon.classList.add("active")
            }
        }
        cam(state) {
            if (state) {
                this.camIcon.classList.remove("active")
            } else {
                this.camIcon.classList.add("active")
            }
        }
    }

    function connectToUser(user, stream) {
        let call = peer.call(user.id, stream)
        // const video = document.createElement("video")
        // video.id = user.id
        let video = new VideoStream(user.id)
        call.on("stream", (userStream) => {
            video.init(userStream)
            // addVideoStream(video, userStream)
        })
    }
    function disconnectToUser(user) {
        let video = document.getElementById(user.id)
        if (!video) return;
        video.remove()
    }
})