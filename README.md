Le principe de passage d'appel entre deux ou plusieurs appareils se fait en plusieurs étapes dont celles qui nous intéressent sont :

1.  ``Envoi d'offres et de réponses`` : Supposons que nous voulons organiser une réunion vidéo avec un ami. Notre appareil (l'appelant) envoie d'abord une "invitation" (l'offre) qui contient toutes les informations nécessaires pour établir la communication. Notre ami (l'appelé) doit alors "accepter l'invitation" en envoyant une réponse. Ces messages utilisent un format standard appelé SDP (Session Description Protocol) qui permet aux appareils de se comprendre.

2.  ``La signalisation`` : Cette étape est comparable à un échange de coordonnées détaillées entre les participants. Les appareils partagent leurs adresses (adresses IP), leurs ports (ports) et leurs codecs supportés(langues parlées par exemple). C'est comme si chaque appareil disait à l'autre la façon dont il peut être joignable et les formats de données qu'il peut échanger. Elle utilise les données formatées en SDP(`S`ession `D`escription `P`rotocol)qui est un format de données et pas un protocole, pour établir la connexion entre les appareils.

3. ``L'établissement des candidats ICE`` : À cette étape, les appareils cherchent tous les chemins possibles pour se connecter, un peu comme si on cherchait différents itinéraires pour se rendre à un même endroit. Si la route directe est bloquée (par exemple par un pare-feu), ils peuvent trouver des chemins alternatifs via des serveurs intermédiaires, comme un pont pour traverser une rivière.

4.  ``La négociation des médias`` : Cette étape consiste à choisir un point commun pour communiquer. Les appareils doivent se mettre d'accord sur le format des données qu'ils vont échanger. 

5.  ``L'établissement du canal de communication`` : Une fois tous les détails concernant la communication réglés, les appareils créent un "tunnel" direct entre eux (connexion P2P)[Peer-To-Peer] si possible. Si une connexion directe n'est pas possible (par exemple à cause de certains pare-feu), ils utiliseront un serveur intermédiaire (un peu comme Google Translate pour se comprendre quant on ne parle pas la même langue).

6.  ``L'échange des flux médias`` : C'est l'étape finale où la véritable communication commence. Les appareils commencent à s'envoyer les données audio et vidéo en temps réel, comme lors d'un partage d'écran ou d'une visioconférence. Ces données sont transmises de manière continue et optimisée pour assurer une communication fluide.

[Partage-d'écran] : Le processus de partage d'écran se passe tout aussi au travers de l'échange de flux médias mais avec des formats spécifiques pour les écrans.

``P2P(Peer-To-Peer)`` : permet la connexion directe entre les appareils pour le partage de données entre eux.

``WebRTC`` : Web Real-Time Comunication est une technologie ouverte de communication en temps réel pour les navigateurs web. Il fonctionne sur la base de P2P , se charge de la signalisation et de la mise en relation entre les utilisateurs(appelant et appelé). Au niveau du WebRTC, la signalisation et le flux média sont gérés de façon distincte 


Image illustrant le processus de communication WebRTC :
![WebRTC](https://wazoio.wpengine.com/wp-content/uploads/WebRTC.png)

``ICE`` : `I`nteractive `C`onnectivity `E`stablishment est un protocole qui permet d'identifier si la connexion directe est possible entre les navigateurs ou pas afin d'améliorer l'efficacité de la communication.Si la connexion directe n'est pas possible, c'est là qu'entre en jeux le protocole `TURN`.

`TURN` : `T`raversal `U`sing `R`elays around `N`AT : est un protocole qui se chargera de prendre en charge les connexions indirectes entre les navigateurs. Il est utilisé lorsque la connexion directe n'est pas possible, c'est un serveur intermédiaire, un serveur de relais.

![TURN](https://miro.medium.com/v2/resize:fit:640/format:webp/0*8iLTTsNFR92zgwP-)

``STUN`` : `S`ession `T`raversal `U`tilities for `N`AT  : est un protocole qui a pour fonction d'identifier les adresse IP, port de connexion de l'appelé se trouvant au sein d'un réseau.


