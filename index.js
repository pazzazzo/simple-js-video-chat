const express = require("express");
const http = require("http")
const socketio = require("socket.io")
const { EventEmitter } = require("events")

const app = express();
// const server = http.createServer(app)
const server = http.createServer(app);
const io = new socketio.Server(server)

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
    debug: true,
});

app.use("/", express.static("public"))
app.use("/peerjs", peerServer)

const users = []
const chat = []


console.log("server starting");

class User extends EventEmitter {
    constructor(socket = new socketio.Socket()) {
        super()
        this.socket = socket
        this.name = "user"
        this.descriminator = `${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`
        this.username = `${this.name}#${this.descriminator}`
        this.talk = false
        socket.onAny((event, ...args) => {
            this.emit(event, ...args)
        })
    }
    login(pseudo, id, callback) {
        this.name = pseudo.replace(/>/g, "&#62;").replace(/</g, "&#60;")
        this.username = `${this.name}#${this.descriminator}`
        this.id = id
        this.mic = true
        this.cam = true
        users.push(this)
        users.forEach((user) => {
            if (user === this) return;
            user.socket.emit("user.connect", { id: this.id, name: this.name, descriminator: this.descriminator })
            user.socket.emit("users.update", users.map(usr => usr = { "name": usr.name, "descriminator": usr.descriminator }))
            user.socket.emit("chat", { "type": "join", "name": this.name, "descriminator": this.descriminator })
        })
        chat.push({ "type": "join", "name": this.name, "descriminator": this.descriminator })
        this.socket.on("disconnect", (reason) => {
            users.splice(users.indexOf(this), 1)
            users.forEach((user) => {
                user.socket.emit("user.disconnect", { id: this.id, name: this.name, descriminator: this.descriminator })
                user.socket.emit("users.update", users.map(usr => usr = { "name": usr.name, "descriminator": usr.descriminator }))
                user.socket.emit("chat", { "type": "leave", "name": this.name, "descriminator": this.descriminator })
            })
            chat.push({ "type": "leave", "name": this.name, "descriminator": this.descriminator })
        })
        callback()
    }
}

io.on("connection", (socket) => {
    console.log("new user");
    let user = new User(socket)
    user.on("user.login", (pseudo, id, callback) => {
        user.login(pseudo, id, () => {
            callback(chat, { id: user.id, name: user.name, descriminator: user.descriminator, username: user.username })
        })
    })
    user.on("message", (message, callback) => {
        if (message.replace(/ /g, "").length > 0) {
            if (!message.startsWith("/")) {
                let msg = { "type": "message", "name": user.name, "descriminator": user.descriminator, "content": message.replace(/>/g, "&#62;").replace(/</g, "&#60;") }
                chat.push(msg)
                users.forEach((usr) => {
                    usr.socket.emit("chat", msg)
                })
                callback()
            } else {
                let command = message.split(" ")[0].replace("/", "")
                let args = message.replace("/" + command + " ", "").split(" ")
                console.log(command);
                console.log(args);
                if (command === "kick") {
                    let target = users.find(usr => usr.username === args.join(" "))
                    if (target) {
                        target.socket.emit("window.close")
                        target.socket.disconnect()
                    }
                }
                callback()
            }
        }
    })
    user.on("users.update", () => {
        socket.emit("users.update", users.map(usr => usr = { "name": usr.name, "descriminator": usr.descriminator }))
    })
    user.on("user.mic.on", () => {
        user.mic = true
        users.forEach((usr) => {
            usr.socket.emit("user.mic.on", user.id)
        })
    })
    user.on("user.mic.off", () => {
        user.mic = false
        users.forEach((usr) => {
            usr.socket.emit("user.mic.off", user.id)
        })
    })
    user.on("user.cam.on", () => {
        user.cam = true
        users.forEach((usr) => {
            usr.socket.emit("user.cam.on", user.id)
        })
    })
    user.on("user.cam.off", () => {
        user.cam = false
        users.forEach((usr) => {
            usr.socket.emit("user.cam.off", user.id)
        })
    })
})

server.listen(process.env.PORT || 80, () => {
    console.log("server started");
})