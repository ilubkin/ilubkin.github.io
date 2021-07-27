'use strict'

let database = firebase.database(); //global variable for root of firebase database

async function updateHelloWorldLocal() {
    let helloMessage = 'none-collected';
    const dbRef = database.ref();

    await dbRef.child('hello-world').get().then( (snapshot) => {
        if(snapshot.exists()) {
            helloMessage = String(snapshot.val());
        }
        else {
            console.log("Error reading from firebase");
        }
    });
    console.log(helloMessage);
}

//Primary goal: make an interface to add and edit items with ingredients and full set of information.
//After this first step, extensive pseudocode and planning should be completed