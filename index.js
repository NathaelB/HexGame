const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)
const io = new require('socket.io')(server)

let joueurs = []
const colors = ['red', 'blue']
let state = 'red'
let code = []
let hex = []
let nb = 2

const Key = {
    'Empty': 1 << 0,
    'Red': 1 << 1,
    'Bleu': 1 << 2,
    'CornerRed': 1 << 3,
    'CornerBlue': 1 << 4,
    'Bridge': 1 << 5,
}

class Pion {
    constructor(type) {
        this.cotes = Array(6)

    }
}

class Player {
    constructor(username, color) {
        this.username = username
        this.color = color
    }

    getUsername() {
        return this.username
    }
}



app.get('/', (request, response) => {
    return response.sendFile('index.html', { root: __dirname })
})

app.get('/game', (request, response) => {
    return response.sendFile('game.html', { root: __dirname })
})

app.get('/player.js', (request, response) => {
    response.set('Content-Type', 'text/javascript')
    response.sendFile(__dirname + '/player.js')
})

server.listen(8888, () => {
    return console.log('\x1b[33m%s\x1b[0m', `Server :: Running @ 'http://localhost:8888'`)
})

io.on('connection', (socket) => {
    socket.on('hello', (data) => {
        console.log(data)
    })

    socket.on('join', (data) => {
        if (joueurs.length >= nb) {
            io.emit('entree', {
                state: false,
                message: "La room est pleine."
            })
            return
        }
        const player = new Player(data.username, colors[joueurs.length])
        joueurs.push(player)
        console.log(joueurs.length);
        if (joueurs.length == 2) {
            console.log("test");
            socket.emit('start', {
                hex,
                state,
                joueurs
            })
        }
    })

    socket.on('pion', (data) => {
        let player
        for (let i = 0; i < joueurs.length; i++) {
            if (joueurs[i].getUsername() === data.player) {
                player = joueurs[i]
            }
        }
        console.log('player:', player, '\ncase:', data.case)
        if (player.color === state) {
            if (data.case >= 0 && data.case < 122) {
                console.log(hex[data.case])
                if (!hex[data.case]) {
                    console.log("test")
                    hex[data.case] = colors.indexOf(player.color)
                    player.color === 'red' ?
                        state = 'blue' :
                        state = 'red'
                }
            }
            socket.emit('pion', hex)

        }
        /*if (jeton === -1) {
          jeton = 0
        } if (data.num === jeton) {
          if (data.case >= 0 && data.case < 121) {
            if (hex[data.case] === -1) {
              hex [data.case] = jeton
              dernierpion = data.case
              jeton ++
              if (jeton == nb) jeton = 0;
            }
          }
        }
        socket.emit('pion', hex)*/
    })

    socket.on('player_join', (data) => {
        io.emit('response', joueurs)
    })

})