// @ts-check

const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = new require('socket.io')(server)


class Player {
  constructor(username, type) {
    this.username = username
    this.type = type
  }

  getUsername() {
    return this.username
  }
}

const BORDERS = {
  INVALID_BORDER: -1,
  RED_A: -2,
  RED_B: -3,
  BLUE_A: -4,
  BLUE_B: -5,
  GREEN_A: -6,
  GREEN_B: -7,
  VIOLET_A: -8,
  VIOLET_B: -9
}

const PIECE_TYPE = {
  EMPTY: 0,
  RED: 1,
  BLUE: 2,
  GREEN: 3,
  VIOLET: 4,
  NW_SE_BRIDGE: 5,
  W_E_BRIDGE: 6,
  NE_SW_BRIDGE: 7
}

const PLAYER_TYPE = {
  NONE: 0,
  RED: 1,
  BLUE: 2,
  GREEN: 3,
  VIOLET: 4
}

const stringToValue = (value) => {
  switch (value) {
    case 'RED':
      return 1
    case 'BLUE':
      return 2
    case 'GREEN':
      return 3
    case 'VIOLET':
      return 4
    default:
      return 0
  }
}

class Piece {
  constructor() {
    this.neighboor = Array(6)
    this.type = PIECE_TYPE.EMPTY
  }
}

function h_find_voisins (v) {
  return (p, id) => {
    for (const n in p.neighboor) {
      if (v.find(element => element===n)) {
        return true
      }
    }
    return false
  }
}

function genererateurHELPER (s) {
  if (!s || s[s.length -1][0] === 0) return BORDERS.INVALID_BORDER
  if (s[s.length - 1][1] === 0) {
    s.pop()
    return genererateurHELPER(s)
  }
  s[s.length-1][1]--
  return s[s.length-1][0]
}

class Board {
  constructor() {
    this.m_actualPlayer = PLAYER_TYPE.NONE
    this.m_winner = PLAYER_TYPE.NONE
    this.m_board = []
    this.m_players = []
    this.m_playedMove = 0
    this.m_admittedBridge = Array(4)
    this.m_nbPlayers = 0
    this.m_size = 0
  }

  addPlayer (username) {
    const player = new Player(username, Object.keys(PLAYER_TYPE).at(this.m_nbPlayers))
    this.m_players.push(player)
  }

  getPlayers () {
    return this.m_players
  }

  getPlayer () {
    console.log()
  }

  genererPlateau (size, nbPlayers, nbPlayerBridge, startingPlayer) {
    if (size === 0) return false
    if (nbPlayers <= 0 || nbPlayers > 4) return false //invalid number of player
    if (nbPlayerBridge*nbPlayers >= size*size) return false
    this.m_nbPlayers = nbPlayers
    this.m_actualPlayer = startingPlayer
    this.m_winner = PLAYER_TYPE.NONE
    this.m_playedMove = 0
    this.m_size = size

    for (let i = 0; i !== nbPlayers ; i++) {
      this.m_admittedBridge[i] = nbPlayerBridge
    }

    this.m_board = []
    for (let i = 0; i < size*size; i++) {
      this.m_board.push(new Piece())
    }

    for (let i = 0; i !== size*size ; i++) {
      const y = i/size
      const x = i % size

      let p = this.m_board[i]

      p.neighboor[0] = i - 1; //(x - 1 >= 0)? i - 1 : BORDERS::INVALID_BORDER;                            // GAUCHE
      p.neighboor[1] = i - size; //(y > 0)? i - size : BORDERS::INVALID_BORDER;                           // HAUT GAUCHE
      p.neighboor[2] = i - size + 1; //(y > 0 && x < size - 1)? i - size + 1 : BORDERS::INVALID_BORDER;   // HAUT DROITE
      p.neighboor[3] = i + 1; //(x + 1 < size)? i + 1 : BORDERS::INVALID_BORDER;                          // DROITE
      p.neighboor[4] = i + size; //(y < size - 1)? i + size : BORDERS::INVALID_BORDER;                    // BAS DROITE
      p.neighboor[5] = i + size - 1; //(y < size - 1 && x > 0)? i + size - 1 : BORDERS::INVALID_BORDER;   // BAS GAUCHE

      p.type = PIECE_TYPE.EMPTY
    }

    const sides = 8*size -2
    const res_sides = sides/(2*nbPlayers)

    const rc_A = []
    const rc_B = []
    rc_A.push([0, sides - res_sides*2*nbPlayers + 1])
    rc_B.push([0, sides - res_sides*2*nbPlayers + 1])

    for (let i = 0; i !== nbPlayers+1; i++) {
      rc_A.push([-i*2, res_sides])
      rc_B.push([-i*2 -1, res_sides])
    }

    //UP
    for (let i = 0; i !== size; ++i) {
      let data = this.m_board[i]

      if (i !== size - 1) {
        data.neighboor[2] = genererateurHELPER(rc_A);
      }
      data.neighboor[1] = genererateurHELPER(rc_A);
    }

    //RIGHT
    for (let i = 0; i !== size; ++i) {
      let data = this.m_board[i*size + size - 1]
      data.neighboor[2] = genererateurHELPER(rc_A);
      data.neighboor[3] = genererateurHELPER(rc_A);
    }/*

    //DOWN
    for (let i = size-1; i !== -1; --i) {
      let data = this.m_board[size*(size - 1) + i]
      data.neighboor[4] = genererateurHELPER(rc_B);
      data.neighboor[5] = genererateurHELPER(rc_B);
    }

    //LEFT
    for (let i = size-1; i !== -1; --i) {
      let data = this.m_board[i*size]
      if (i !== size - 1) {
        data.neighboor[5] = genererateurHELPER(rc_B);
      }
      data.neighboor[0] = genererateurHELPER(rc_B);
    }*/

    return true
  }

  /**
   * @param {number} origin
   * @param arret
   */
  cheminPossible (origin, type, arret) {
    if (origin >= this.m_board.length || origin < 0) return false
    if (type.length === 0) return false

    const visited = Array(this.m_board.length)
    const l_s = []
    l_s.push(origin)

    while (!l_s.length) {
      const c_p = l_s.pop()

      if (!type.find((item) => this.m_board[c_p].type === item)) continue

      if (arret(this.m_board[c_p], c_p)) return true

      for (const n in this.m_board[c_p].neighboor) {
        if (n >= 0 && n < this.m_board.length) {
          if (!visited[n]) {
            l_s.push(n)
            visited[n] = true
          }
        }
      }
    }

    return false
  }


  isBorderConnected (l_b1, l_b2, type) {
    if (this.m_board.length === 0) return false

    return this.cheminPossible(0, [PIECE_TYPE.EMPTY, PIECE_TYPE.RED, PIECE_TYPE.BLUE, PIECE_TYPE.GREEN, PIECE_TYPE.VIOLET, PIECE_TYPE.NW_SE_BRIDGE, PIECE_TYPE.W_E_BRIDGE, PIECE_TYPE.NE_SW_BRIDGE],
      (l_p, id) => {
        let tmp_r = false
        for (const n in l_p.neighboor) {
          if (n === l_b1) {
            tmp_r = true
            break
          }
        }
        return !tmp_r
          ? false
          : this.cheminPossible(id, type, h_find_voisins([l_b2]))
      }
    )
  }

  destroyConnection (l_id1, l_id2) {
    this.m_board[l_id1].neighboor.replace(l_id2, -1)
    this.m_board[l_id2].neighboor.replace(l_id1, -1)
  }

  jouer (player, subject, type) {
    if (this.m_actualPlayer === PLAYER_TYPE.NONE) {
      console.log("actualPlayer type NONE")
      return false
    }
    if (player !== this.m_actualPlayer) {
      console.log("Pas le tour de ce joueur")
      return false
    }
    if (subject >= this.m_board.length) {
      console.log("On déborde là")
      return false
    }
    if (type === PIECE_TYPE.EMPTY) {
      console.log("Le type de piece est empty")
      return false
    }
    if (this.m_board[subject].type !== PIECE_TYPE.EMPTY) {
      console.log("la piece est déjà défini")
      return false
    }


    if (type === PIECE_TYPE.NW_SE_BRIDGE || type === PIECE_TYPE.NE_SW_BRIDGE || type === PIECE_TYPE.W_E_BRIDGE) {
      if (this.m_admittedBridge[player - 1] === 0) return false

      switch (type) {
        case PIECE_TYPE.NW_SE_BRIDGE:
          this.destroyConnection(subject, this.m_board[subject].neighboor[0]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[2]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[3]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[5]);
          break;

        case PIECE_TYPE.NE_SW_BRIDGE:
          this.destroyConnection(subject, this.m_board[subject].neighboor[0]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[2]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[3]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[5]);
          break;

        case PIECE_TYPE.W_E_BRIDGE:
          this.destroyConnection(subject, this.m_board[subject].neighboor[0]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[2]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[3]);
          this.destroyConnection(subject, this.m_board[subject].neighboor[5]);
          break;
      }
    }

    // PLACE PIECE
    this.m_board[subject].type = type
    this.m_playedMove++

    // CHECK IF PLAYER WIN
    for (let p = 0; p !== this.m_nbPlayers; p++) {
      if (this.isBorderConnected(-p*2, -1-p*2[p, PIECE_TYPE.NW_SE_BRIDGE, PIECE_TYPE.NE_SW_BRIDGE, PIECE_TYPE.W_E_BRIDGE] )) {
        if (this.m_admittedBridge[p-1] === 0) {
          this.m_actualPlayer = PLAYER_TYPE.NONE
          this.m_winner = p
          console.log("Le gagnant est: ", this.m_winner)
          return true
        }
      }
    }

    if (this.m_playedMove === this.m_board.length) {
      this.m_actualPlayer = PLAYER_TYPE.NONE
      return true
    }
    this.m_actualPlayer = (player % this.m_nbPlayers) + 1
    return true
  }

  partieTermine () {
    return this.m_actualPlayer === PLAYER_TYPE.NONE
  }

  quiEstLeVainqueur () {
    return this.partieTermine()
      ? this.m_winner
      : PLAYER_TYPE.NONE
  }

  getActualPlayer () {
    return this.m_actualPlayer
  }
}

let joueurs = []
const board = new Board()


class MessageManager {
    constructor() {
        this.messages = []
    }

    /** @param {Message} message */
    addMessage(message) {
        this.messages.push(message)
    }
}

class Message {
    constructor(username, body) {
        this.username = username
        this.body = body
        const date = new Date()
        this.timestamp = date.getTime()
    }
}

const messageManager = new MessageManager()





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

    socket.on('game_destroyed', () => {
      io.emit('clear')
    })
    socket.on('join', (data) => {
      if (board.m_nbPlayers < 4) {
        console.log("Le joueur peut rentrer")
        board.m_nbPlayers ++
        board.addPlayer(data.username)
      }
    })

    socket.on('join_resp', () => {
      console.log("evenement actionné")
      io.emit('notif_join', {
        message: `Il y a ${board.m_nbPlayers} joueurs`,
        players: board.m_players
      })
    })

    socket.on('message', (data) => {
        console.log(data)
    })

    socket.on('start', (data) => {
      console.log(data)

      board.genererPlateau(5, 2, 0, PLAYER_TYPE.RED)

      io.emit('start_game', {
        size: board.m_size,
        state: board.m_actualPlayer,
        players: board.m_players,
        data: board.m_board
      })
    })

    socket.on('pion', (data) => {
      const bridge = [5,6,7]
      const id = parseInt(data.case)
      const iPlayer = board.getPlayers().find((item) => item.username === data.player)
      const key = Object.keys(PLAYER_TYPE).find((item) => {
        if (item === iPlayer.type) return item
      })
      const state = board.jouer(PLAYER_TYPE[key], id, PLAYER_TYPE[key])

      if (state) {
        io.emit('pion', {
          id: id,
          player: iPlayer,
          bridge: bridge.includes(data.type)
        })
      }

    })


    /* socket.on('pion', (data) => {
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
    }) */

    socket.on('player_join', (data) => {
        io.emit('response', joueurs)
    })

    socket.on('send_message', (data) => {
      const message = new Message(data.player, data.message)
      messageManager.addMessage(message)
      console.log(messageManager.messages)
      io.emit('chat', {
        messages: messageManager.messages
      })
    })
})

