// @ts-check

const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const io = new require('socket.io')(server)

class Player {
  constructor(username, type, id) {
    this.id = id
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
    for (const n of p.neighboor) {
      if (v.includes(n)) {
        return true
      }
    }
    return false
  }
}

function genererateurHELPER (s) {
  if (!s.length || s[s.length -1][0] === 0) return BORDERS.INVALID_BORDER
  if (s[s.length - 1][1] === 0) {
    s.pop()
    return genererateurHELPER(s)
  }
  s[s.length-1][1]--
  return s[s.length-1][0]
}

function generateBorder (size, nbPlayers, board) {
  let sides = 8*size -2
  let res_sides = Math.ceil(sides/(2*nbPlayers))

  let rc_A = []
  let rc_B = []

  for (let i = 0; i !== nbPlayers+1 ; i++) {
    rc_A.push([-i*2, res_sides])
    rc_B.push([-i*2 -1, res_sides])
  }

  //UP
  for (let i = 0; i !== size; ++i) {
    let data = board[i]
    data.neighboor[1] = genererateurHELPER(rc_A);
    if (i !== size - 1) {
      data.neighboor[2] = genererateurHELPER(rc_A);
    }
  }

  //RIGHT
  for (let i = 0; i !== size; ++i) {
    let data = board[i*size + size - 1]
    data.neighboor[2] = genererateurHELPER(rc_A);
    data.neighboor[3] = genererateurHELPER(rc_A);
  }

  //DOWN
  for (let i = 0; i !== size; ++i) {
    let data = board[size*size - 1 - i]
    data.neighboor[4] = genererateurHELPER(rc_B);
    data.neighboor[5] = genererateurHELPER(rc_B);
  }

  //LEFT
  for (let i = size-1; i !== -1; --i) {
    let data = board[i*size]
    if (i !== size - 1) {
      data.neighboor[5] = genererateurHELPER(rc_B);
    }
    data.neighboor[0] = genererateurHELPER(rc_B);
  }
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
    const existKey = this.m_players.map((player) => {
      return player.id
    })

    let key = 1
    for (let i = 1; i < 4; i++) {
      if (!existKey.includes(i)) {
        key = i
        break
      }
    }
    const player = new Player(username, Object.keys(PLAYER_TYPE).at(key), key)
    this.m_players.push(player)
  }

  getPlayers () {
    return this.m_players
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
      let y = i/size
      let x = i % size

      let p = this.m_board[i]

      p.neighboor[0] = i - 1; //(x - 1 >= 0)? i - 1 : BORDERS::INVALID_BORDER;                            // GAUCHE
      p.neighboor[1] = i - size; //(y > 0)? i - size : BORDERS::INVALID_BORDER;                           // HAUT GAUCHE
      p.neighboor[2] = i - size + 1; //(y > 0 && x < size - 1)? i - size + 1 : BORDERS::INVALID_BORDER;   // HAUT DROITE
      p.neighboor[3] = i + 1; //(x + 1 < size)? i + 1 : BORDERS::INVALID_BORDER;                          // DROITE
      p.neighboor[4] = i + size; //(y < size - 1)? i + size : BORDERS::INVALID_BORDER;                    // BAS DROITE
      p.neighboor[5] = i + size - 1; //(y < size - 1 && x > 0)? i + size - 1 : BORDERS::INVALID_BORDER;   // BAS GAUCHE

      p.type = PIECE_TYPE.EMPTY
    }
    generateBorder(size, nbPlayers, this.m_board)
    /*let sides = 8*size -2
    let res_sides = Math.ceil(sides/(2*nbPlayers))

    let rc_A = []
    let rc_B = []


    for (let i = 0; i !== nbPlayers+1; i++) {
      rc_A.push([-i*2, res_sides])
      rc_B.push([-i*2 -1, res_sides])
    }

    //UP
    for (let i = 0; i !== size; ++i) {
      let data = this.m_board[i]
      data.neighboor[1] = genererateurHELPER(rc_A);
      if (i !== size - 1) {
        data.neighboor[2] = genererateurHELPER(rc_A);
      }
    }

    //RIGHT
    for (let i = 0; i !== size; ++i) {
      let data = this.m_board[i*size + size - 1]
      data.neighboor[2] = genererateurHELPER(rc_A);
      data.neighboor[3] = genererateurHELPER(rc_A);
    }

    //DOWN
    for (let i = 0; i !== size; ++i) {
      let data = this.m_board[size*size - 1 - i]
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

    let visited = [] //Array.from(this.m_board.length)
    for (let i = 0; i < this.m_board.length; i++) {
      visited.push(false)
    }

    let l_s = []
    l_s.push(origin)

    while (l_s.length !== 0) {
      let c_p = l_s.pop()
      if (!type.includes(+this.m_board[c_p].type)) continue

      if (arret(this.m_board[c_p], c_p)) return true

      for (const n of this.m_board[c_p].neighboor) {
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
    for (let i = 0; i < this.m_board.length; i++) {
      for (const n of this.m_board[i].neighboor) {
        if (n === l_b1) {
          if (this.cheminPossible(i, type, h_find_voisins([l_b2]))) return true
        }
      }
    }
    return false
  }

  destroyConnection (l_id1, l_id2) {
    if (l_id1 >= 0 && l_id1 < this.m_board.length) {
      this.m_board[l_id1].neighboor.splice(l_id2, 1, -1)
    }
    if (l_id2 >= 0 && l_id2 < this.m_board.length) {
      this.m_board[l_id2].neighboor.splice(l_id1, 1,-1)
    }
  }

  jouer (player, subject, type) {
    if (this.m_actualPlayer === PLAYER_TYPE.NONE) {
      return false
    }
    if (player !== this.m_actualPlayer) {
      return false
    }
    if (subject >= this.m_board.length) {
      return false
    }
    if (type === PIECE_TYPE.EMPTY) {
      return false
    }
    if (this.m_board[subject].type !== PIECE_TYPE.EMPTY) {
      return false
    }

    if (+type === PIECE_TYPE.NW_SE_BRIDGE || +type === PIECE_TYPE.NE_SW_BRIDGE || +type === PIECE_TYPE.W_E_BRIDGE) {
      if (this.m_admittedBridge[player - 1] === 0) return false
      this.m_admittedBridge[player - 1]--
      switch (+type) {
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
    for (let p = 1; p !== this.m_nbPlayers+1; p++) {
      if (this.isBorderConnected(-p*2, -1*p*2-1,[p, PIECE_TYPE.NW_SE_BRIDGE, PIECE_TYPE.NE_SW_BRIDGE, PIECE_TYPE.W_E_BRIDGE])) {
        if (this.m_admittedBridge[p-1] === 0) {
          this.m_actualPlayer = PLAYER_TYPE.NONE
          this.m_winner = p
          const player = this.m_players[this.m_winner-1]
          io.emit('victoire', {
            player: player
          })
          this.resetGame()

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

  resetGame () {
    this.m_actualPlayer = PLAYER_TYPE.NONE
    this.m_winner = PLAYER_TYPE.NONE
    this.m_board = []
    this.m_players = []
    this.m_playedMove = 0
    this.m_admittedBridge = Array(4)
    this.m_nbPlayers = 0
    this.m_size = 0
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

    clear () {
      this.messages = []
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
    socket.on('game_destroyed', () => {
      board.resetGame()
      messageManager.clear()
      io.emit('clear')
    })
    socket.on('join', (data) => {
      if (board.m_nbPlayers === 0) {
        messageManager.clear()
      }
      if (board.m_nbPlayers < 4) {
        board.m_nbPlayers++
        board.addPlayer(data.username)
      }
    })


    socket.on('leave', (data) => {
      /*const newList = []
      console.log(data)
      const joueur = board.m_players.find((player) => player.username === data.username)
      const type = joueur.type

      board.m_players.forEach((player) => {
        if (player.username !== data.username) newList.push(player)
      })
      board.m_players = newList

      if (board.m_board.length) {
        for (let i = 0; i < board.m_board.length; i++) {
          if (board.m_board[i].type === type) {
            console.log("test ", board.m_board[i])
            board.m_board[i].type = PIECE_TYPE.EMPTY
          }
        }
      }

      console.log(board.m_actualPlayer)
      const key = board.m_actualPlayer

      io.emit('leave_player', {
        size: board.m_size,
        state: board.m_actualPlayer,
        players: board.m_players,
        board: board.m_board,
        next: board.m_actualPlayer === 0
          ? {username: "Le jeu n'a pas commencé"}
          : board.m_players[board.m_actualPlayer - 1],
      })*/
    })

    socket.on('join_resp', () => {
      io.emit('notif_join', {
        message: `Il y a ${board.m_nbPlayers} joueurs`,
        players: board.m_players
      })
    })

    socket.on('start', (data) => {
      board.genererPlateau(+data.size, board.m_nbPlayers, +data.bridge, PLAYER_TYPE.RED)

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

      const players = board.getPlayers()
      const player = board.getPlayers().find((item) => item.username === data.player)
      const key = PLAYER_TYPE[player.type]
      const state = board.jouer(key, id, +data.type)

      if (state) {
        io.emit('pion', {
          id: id,
          type: parseInt(data.type),
          player: player,
          players: board.m_players,
          next: board.m_actualPlayer === 0
            ? {username: "Le jeu est finit"}
            : players[board.m_actualPlayer - 1],
          bridge: bridge.includes(data.type),
          board: board.m_board
        })
      }

    })

    socket.on('player_join', (data) => {
        io.emit('response', joueurs)
    })

    socket.on('send_message', (data) => {
      const message = new Message(data.player, data.message)
      messageManager.addMessage(message)
      io.emit('chat', {
        messages: messageManager.messages
      })
    })
})

