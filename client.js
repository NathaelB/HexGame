const socket = io()

const couleurs = ['red', 'blue', 'green', 'yellow']
let numJoueur = -1

const joueurCo = () => {
  console.log("Je veux les joueurs co")
  socket.emit('joueurCo', "Renvoie moi la liste des joueurs connectés")
}

const chargement = () => {
  socket.emit("demandePion")
}

