import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const settings = {merge: true};

const config = {
    apiKey: "AIzaSyA5RFaRCdSsM17XNBjH-5ObFYZv57Mm1OE",
    authDomain: "notificacoes-833f4.firebaseio.com",
    databaseURL: "https://notificacoes-833f4.firebaseio.com",
    projectId: "notificacoes-833f4",
    storageBucket: "notificacoes-833f4.appspot.com",
}

const app = firebase.initializeApp(config);

firebase.firestore().settings(settings);

export default firebase;