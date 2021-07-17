'use strict';
import firebase from 'firebase';
//declare const firebase: typeof import('firebase');

import "firebase/analytics";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/database";

var config = {
    apiKey: "AIzaSyBkAwjvTfRM-Lf0c6zLic12VKTisfoCEUI",
    authDomain: "makecheeselouise-c3a62.firebaseapp.com",
    databaseURL: "https://makecheeselouise-c3a62-default-rtdb.firebaseio.com",
    projectId: "makecheeselouise-c3a62",
    storageBucket: "makecheeselouise-c3a62.appspot.com",
    messagingSenderId: "491480390084",
    appId: "1:491480390084:web:73b6588808d48384c36c91",
    measurementId: "G-5ET3GJEZ3W"
};
firebase.initializeApp(config);


var database = firebase.database(); //global variable for root of firebase database

async function updateHelloWorldLocal() {
    let helloMessage = 'none-collected';
    const dbRef = database.ref();

    await dbRef.child('hello-world').get().then( (snapshot) => {
        if(snapshot.exists()) {
            helloMessage = String(snapshot);
        }
        else {
            console.log("Error reading from firebase");
        }
    });
    console.log(helloMessage);
}