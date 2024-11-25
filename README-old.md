# *Application d'Appel Vidéo/Audio*

Cette application permet de passer des appels vidéo et audio en utilisant l'API Tencent Cloud. Elle offre les fonctionnalités suivantes :
- Appels vidéo et audio en tête-à-tête
- Appels de groupe
- Partage d'écran


## *Prérequis*

Avant de pouvoir exécuter l'application, vous devez :

1. Avoir installé sur votre machine :
   - Node.js (version 18 ou supérieure)
   - npm
2. Avoir un compte Tencent Cloud et obtenir :
   - SDKAppID
   - SDKSecretKey
3. Lancer la commande `npm install` pour installer les dépendances
4. Dans le fichier `src/App.vue`, remplacez les valeurs suivantes par vos identifiants Tencent Cloud :

````js
const SDKAppID = 0; // Remplacez par votre SDKAppID
const SecretKey = ''; // Remplacez par votre SecretKey
````
5. Démarrer le serveur de l'application en lançant la commande `npm run dev`

## *Utilisation*

1. Entrez/Créez votre identifiant utilisateur pour initialiser l'application
2. Pour un appel en tête-à-tête :
   - Entrez l'identifiant de l'utilisateur que vous souhaitez appeler (en ayant initialisé l'application avec son identifiant)
   - Choisissez entre un appel vidéo ou audio
   
3. Pour un appel de groupe :
   - Cliquez sur "Start Group Call"
   - Entrez les identifiants  des participants que vous souhaitez appeler ,séparés par des virgules
   - Cliquez sur "Start Group Call" pour démarrer l'appel

4. Pendant un appel :
   - Vous pouvez partager votre écran en cliquant sur "Partager l'écran"
   - Pour arrêter le partage, cliquez sur "Arrêter le partage"

## Notes importantes

- Pour les appels vidéo, une caméra et un microphone sont requis , pour les appels audio, un microphone est requis [En cas d'absence de caméra, l'appel se fera en audio uniquement]
- Pour le partage d'écran, le navigateur doit supporter cette fonctionnalité


