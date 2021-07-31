'use strict'

//The below functions handle the interface with Firebase
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

//DOM functions
/*  Creation Date: 7/31/2021
    Author: Ian Lubkin
    Description: Add a row with a text and number input field to a div 
    that contains the button that called this function. The row is added
    before the button. This function will only add row's to a div using 
    css grid with two collumns; otherwise, two unformatted input cells
    will be added.
    Last Edit: 7/31/2021
*/
function addTwoInputRow() {
    let parentDiv = this.parentElement;
    let button = this;
    let newInputName = document.createElement('input');
    let newInputRatio = document.createElement('input');
    newInputName.type = 'text';
    newInputRatio.type = 'number';
    newInputName.classList.add('name-input');
    newInputRatio.classList.add('ratio-input');

    parentDiv.insertBefore(newInputName, button);
    parentDiv.insertBefore(newInputRatio, button);
}

//Event listener adding
document.querySelectorAll('#item-secondary-unit-add-button, #item-ingredient-add-button').forEach( (button) => { 
    button.addEventListener('click', addTwoInputRow); 
});

/*  Creation Date: 
    Author: Ian Lubkin
    Purpose:

    Last Edit:
*/