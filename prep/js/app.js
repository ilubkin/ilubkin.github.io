'use strict'

/****** Functions to handle the interface with Firebase ******/

/*** Functions to get data from firebase if the local storage data is out of date ***/
//  These functions should be very fast if the data is up to date
let database = firebase.database(); //global variable for root of firebase database

/*  Function Description
    Creation Date: 7/21/2021
    Author: Ian Lubkin
    Purpose: Test access to firebase.
    Last Edit: 7/21/2021
*/
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

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Update local storage for permitted email list from firebase 
    if local storage is out of date.
    Last Edit:8/01/2021
*/
async function readPermittedEmailsFB() {
    await database.ref().child('permitted-emails').once('value', (snapshot) => {
        localStorage.setItem('permittedEmails', JSON.stringify(snapshot.val()));
    });
}

/*  Function Description
    Creation Date: 7/31/2021
    Author: Ian Lubkin
    Purpose: Update local storage object for item list from firebase
    if local storage is out of date.
    Last Edit:7/31/2021
*/
async function updateItemLocal() {

}

/*** Functions to submit data to firebase ***/
/*  Function Description
    Creation Date: 7/31/2021
    Author: Ian Lubkin
    Purpose: Save item data to firebase from the user via the input form.
    Last Edit: 7/31/2021
*/
async function submitItemForm(userLocation = 'settlers-green') { //later perhaps get userLocation from local storage
    let curDTInt = Date.parse(new Date()); //current date-time integer, created by parsing a new Date object
    let item = {}; //a blank base item object
    let prevName = ''; //holds value for unit and ingredient input gathering
    //gather values from form
    item['name'] = document.querySelector('#item-name-input').value;
    item['prepared-bool'] = document.querySelector('#prepared-radio').checked;
    item['ingredient-bool'] = document.querySelector('#ingredient-radio').checked;
    item['in-use-bool'] = document.querySelector('#in-use-radio').checked;
    item['special-catagory'] = document.querySelector('#item-special-catagory-input').value;
    item['use-to-sales-ratio'] = document.querySelector('#item-use-ratio-input').value;
    item['main-unit'] = document.querySelector('#item-main-unit-input').value;
    item['other-units'] = {}; //base for alternative units object
    //the next block gathers alternative units and their ratio to the main unit from the form
    document.querySelectorAll('#item-other-units-input-wrapper .name-input, #item-other-units-input-wrapper .ratio-input').forEach( (input) => {
        
        if(input.classList[0] === 'name-input') {
            item['other-units'][input.value] = {};
            item['other-units'][input.value]['name'] = input.value;
            prevName = input.value;
        }
        if(input.classList[0] === 'ratio-input') {
            item['other-units'][prevName]['ratio-to-main-unit'] = input.value;
        }
    });
    item['ingredients'] = {}; //base for ingredients object
    //the next block gathers ingredients and their ratio to the main item from the form
    document.querySelectorAll('#item-ingredients-input-wrapper .name-input, #item-ingredients-input-wrapper .ratio-input').forEach( (input) => {
        if(input.classList[0] === 'name-input') {
            item['ingredients'][input.value] = {};
            item['ingredients'][input.value]['name'] = input.value;
            prevName = input.value;
        }
        if(input.classList[0] === 'ratio-input') {
            item['ingredients'][prevName]['ratio-to-product'] = input.value;
        }
    });
    console.log(userLocation);
    await database.ref('/item-list/' + userLocation + '/' + item['name']).update(item);
    await database.ref('/item-list/' + userLocation).update({ 'last write': curDTInt, });
}

/*** Functions to handle user authentication with Firebase ***/
/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Handle user sign in with Firebase Authentication.
    Last Edit: 8/01/2021
*/
async function signIn() {
    let userSIEmail = document.getElementById("user-si-email").value;
    let userSIPassword = document.getElementById("user-si-password").value;
    let userSIEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let userSIPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      

    let checkUserEmailValid = userSIEmail.match(userSIEmailFormat);
    let checkUserPasswordValid = userSIPassword.match(userSIPasswordFormat);

    if(checkUserEmailValid === null){
        return checkUserEmail(userSIEmail);
    }else if(checkUserPasswordValid === null){
        return checkUserPassword(userSIPassword);
    }else{
        firebase.auth().signInWithEmailAndPassword(userSIEmail, userSIPassword).then((success) => {
            setTimeout(function() {
                document.getElementById('sign-in-button').style.display = 'none';
            }, 100);
            }).catch((error) => {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            alert(`Sign in error ${errorCode}: ${errorMessage}`)
        });
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Sign user out with Firebase Authentication.
    Last Edit: 8/01/2021
*/
function signOut() {
    firebase.auth().signOut().then(function() {
        // Sign-out successful.
        //alert('Signed Out');
            setTimeout(function(){
                document.querySelector('#sign-in-form').style.display = 'grid';
            }, 100 );
    }).catch(function(error) {
        // An error happened.
        let errorMessage = error.message;
        alert(`error: ${errorMessage}`)
    });
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Handle user sign up with Firebase Authentication.
    Last Edit: 8/01/2021
*/
async function signUp() {
    await readPermittedEmailsFB();
    let permittedEmails = JSON.parse(localStorage.getItem('permittedEmails'));
    let uFirstName = document.getElementById("user-first-name").value;
    let uLastName = document.getElementById("user-last-name").value;
    let uEmail = document.getElementById("user-email").value;
    let uPassword = document.getElementById("user-password").value;
    let flag = false;
    for(let email in permittedEmails) {
        if(permittedEmails[email] === uEmail) {
            flag = true;
        }
    }
    let userNameFormat = /^([A-Za-z.\s_-])/;    
    let userEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let userPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      

    let checkUserFirstNameValid = uFirstName.match(userNameFormat);
    let checkUserLastNameValid = uLastName.match(userNameFormat);
    let checkUserEmailValid = uEmail.match(userEmailFormat);
    let checkUserPasswordValid = uPassword.match(userPasswordFormat);

    if(checkUserFirstNameValid === null){
        return checkUserFirstName(uFirstName);
    }else if(checkUserLastNameValid === null){
        return checkUserLastName(uLastName);
    }else if(checkUserEmailValid === null){
        return checkUserEmail(uEmail);
    }else if(checkUserPasswordValid === null){
        return checkUserPassword(uPassword);
    }else if(flag === false){
        alert("Permissions not granted for this email")
        return false;
    }else{
        firebase.auth().createUserWithEmailAndPassword(uEmail, uPassword).then((success) => {
            let user = firebase.auth().currentUser;
            let uid;
            if (user != null) {
                uid = user.uid;
            }
            let firebaseRef = firebase.database().ref();
            let userData = {
                uFirstName: uFirstName,
                uLastName: uLastName,
                uEmail: uEmail,
            }
            firebaseRef.child('users').child(uid).set(userData);
            alert('Account Created','Your account was created successfully, you are logged in now.',)
            setTimeout(function(){
                document.querySelector('#sign-up-form').style.display = 'none';
            }, 100);
        }).catch((error) => {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            alert(`error ${errorCode}: ${errorMessage}`)
        });
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Check user email format and return a boolean for validity.
    Last Edit: 8/01/2021
*/
function checkUserEmail(userEmail = '') {
    let userEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let flag = false;
    if(userEmail.match(userEmailFormat)){
        return flag = false;
    }else{
        return flag = true;
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Check user password format and return a boolean for validity.
    Last Edit: 8/01/2021
*/
function checkUserPassword(userPassword = '') {
    let userPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      
    let flag = false;
    if(userPassword.match(userPasswordFormat)){
        return flag = false;
    }else{
        return flag = true;
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Check user first name format and return a boolean for validity.
    Currently this function only check that the name is not empty.
    Last Edit: 8/01/2021
*/
function checkUserFirstName(uFirstName){
    // let uFirstName = document.getElementById("userFirstName").value;
    let flag = false;
    if(uFirstName === "") {
        return flag = true;
    }
    else {
        return flag = false;
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Check user last name format and return a boolean for validity.
    Currently this function only check that the name is not empty.
    Last Edit: 8/01/2021
*/
function checkUserLastName(uLastName){
    // let uLastName = document.getElementById("userLastName").value;
    let flag = false;
    if(uLastName === ""){
        return flag = true;
    }
    else {
        return flag = false;
    }
}

/*  Function Call Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Load correct view on user authentication state change.
    Last Edit: 8/01/2021
*/
firebase.auth().onAuthStateChanged( function(user) {
    if (user) {
        // hideAllForms();
        userPageLoader();
        let uid = user.uid;
        let primaryLocation = 'settlers-green';
        const dbRef = firebase.database().ref();
        dbRef.child("users").child(uid).child('primaryLocation').get().then((snapshot) => {
            if (snapshot.exists()) {
                primaryLocation = snapshot.val();
            } else {
                console.log("Error reading from primaryLocation of user: No data available");
            }
        }).catch((error) => {
            console.error(error);
        }).then( () => { return userLocation = primaryLocation; });
        dbRef.child("users").child(uid).child('uFirstName').get().then((snapshot) => {
            if (snapshot.exists()) {
                curUserFirstName = snapshot.val();
            } else {
                console.log("Error reading from uFirstName of user: No data available");
            }
        }).catch((error) => {
            console.error(error);
        });
        
        //gives current user email
        //add logic for user dependent loading
        // User is signed in.
    } else {
        // hideAllForms();
        // No user is signed in.
    }
  });

//Primary goal: make an interface to add and edit items with ingredients and full set of information.
//After this first step, extensive pseudocode and planning should be completed

//DOM functions
window.onload = authStateDomHandler; //when the page loads, authStateDomHandler will be called

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Check if a user is signed in currently and serve 
    the appropiate content.
    Last Edit: 8/01/2021
*/
function authStateDomHandler() {
    if(firebase.auth().currentUser) {
        userPageLoader();
    }
    else {
        document.querySelector('#sign-in-form').style.display = 'grid'
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Check the time of day and user information to serve
    the logged in user the appropriate interfaces.
    Last Edit: 8/01/2021
*/
function userPageLoader() {

}

/*  Function Description
    Creation Date: 7/31/2021
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

/*  Function Description
    Creation Date: 7/31/2021
    Author: Ian Lubkin
    Purpose: Load the item list display for the user from local storage.
    Last Edit:7/31/2021
*/
function loadItemList(userLocation = 'settlers-green') {

}

/****** Add event listeners ******/

/*** Input form ***/
document.querySelectorAll('#item-secondary-unit-add-button, #item-ingredient-add-button').forEach( (button) => { 
    button.addEventListener('click', addTwoInputRow); 
});
document.querySelector('#item-clear-form-button').addEventListener('click', () => {
    document.querySelectorAll('#item-edit-wrapper input').forEach( (input) => { 
        input.value = '';
    });
});
document.querySelector('#item-add-button').addEventListener('click', (event) => {
    submitItemForm();
} ); //if the function submitItemForm is passed as the event handler it will recieve 
     // the event as it's first variable, which will overwrite the userLocation.

/*** Login form ***/
document.getElementById('user-si-email').addEventListener('blur', (event) => {
    if(checkUserEmail(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-si-email-error").style.display = "block";
    }
    else {
        document.getElementById("user-si-email-error").style.display = "none";
    }
});
document.getElementById('user-si-password').addEventListener('blur', (event) => {
    if(checkUserPassword(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-si-password-error").style.display = "block";
    }
    else {
        document.getElementById("user-si-password-error").style.display = "none";
    }
});
document.getElementById('user-si-password').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        signIn().then( () => {
            document.querySelector('#signOutButton').style.display = 'grid';
        });
    }
});
document.getElementById('user-sign-up').addEventListener('click', () => {
    document.getElementById('sign-in-form').style.display = 'none';
    document.getElementById('sign-up-form').style.display = 'grid';
});
document.getElementById('user-sign-up').addEventListener('click', () => {
    signIn().then( () => {
        document.querySelector('#sign-out-button').style.display = 'grid';
    });
});
document.getElementById('sign-out-button').addEventListener('click', () => {
    signOut().then( () => {
        document.querySelector('#signOutButton').style.display = 'none';
    });
});
document.querySelector('#user-first-name').addEventListener('blur', (event) => {
    if(checkUserFirstName(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-first-name-error").style.display = "block";
    }
    else {
        document.getElementById("user-first-name-error").style.display = "none";
    }
});
document.querySelector('#user-last-name').addEventListener('blur', (event) => {
    if(checkUserLastName(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-last-name-error").style.display = "block";
    }
    else {
        document.getElementById("user-last-name-error").style.display = "none";
    }
});
document.getElementById('user-email').addEventListener('blur', (event) => {
    if(checkUserEmail(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-email-error").style.display = "block";
    }
    else {
        document.getElementById("user-email-error").style.display = "none";
    }
});
document.getElementById('user-password').addEventListener('blur', (event) => {
    if(checkUserPassword(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-password-error").style.display = "block";
    }
    else {
        document.getElementById("user-password-error").style.display = "none";
    }
});
document.getElementById('sign-up-button').addEventListener('click', () => {
    signUp();
});
document.getElementById('user-sign-in').addEventListener('click',  () => {
    document.getElementById('sign-up-form').style.display = 'none';
    document.getElementById('sign-in-form').style.display = 'grid';
});

/*  Function Description
    Creation Date: 
    Author: Ian Lubkin
    Purpose: 
    Last Edit: 
*/