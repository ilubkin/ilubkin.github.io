'use strict'

/*big potential bug discovery 8/7: because localStorage persists
    and exists throughout a device, a user could have the same object
    name stored on their device from another application, causing
    errors. Initial fix idea: have a set of keys, one as the name
    and one as the value in the JSON object stored, and check that
    the correct key resides as at the given name. */

/*Idea 8/10: exchange JSON.parse(localstorage.getItem(...)) calls for functions that are more descriptive */

/*Idea 8/13: reduce fetching from firebase by the following steps: 
                1) on initial load, set session start time as a local variable
                2) add event listeners for each locally stored object which update
                    those objects whenever a value is changed
                3) change local storage update functions to first check whether the
                    local storage last update is before or after the sesion start time.
                    If it is after the session start time then there is no need to query 
                    firebase.
                    Alternatively, when the session is first started each local storage
                    variable could be updated once, gauranteeing that the rest of the session
                    is much faster.
*/

/* Potential problem discovered 8/13: Date.parse() is not recomended as the implimentation of string parsing
    is variable accross platforms. To resolve this problem, I should create my own date parsing functions at
    some point and replace all Date.parse calls with them. */

/* Idea 8/14: The syntax of itterating over an object's members is confusing 
                (i.e., for(let x in xs) { if(xs[x]...)} seems is correct while for(let x in xs) { if(x...)} feels more natural).
                to resolve this, it would be helpful to put together a function that conducted these operations somehow...
*/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// function sortArr(obj, childStr) {
//     return Object.keys(obj).sort((a,b) => (obj[a][childStr] >= obj[b][childStr] ? 0 : 1));
// }

/****** String editing functions ******/
/*  Function Description
    Creation Date: 8/06/2021
    Author: Ian Lubkin
    Purpose: Capitalize the first letter of a string.
    Last Edit:8/06/2021
*/
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/*  Function Description
    Creation Date: 8/07/2021
    Author: Ian Lubkin
    Purpose: Remove spaces from a string and return it with spaces in place of dashes.
    Last Edit:8/07/2021
*/
function spaceToDash(instr) {
    return instr.replace(/\s+/g, '-');
}

/*  Function Description
    Creation Date: 8/07/2021
    Author: Ian Lubkin
    Purpose: Remove dashes from a string and return it with dashes in place of spaces.
    Last Edit:8/07/2021
*/
function dashToSpace(instr) {
    return instr.replace(/-/g, ' ');
}

/*  Function Description
    Creation Date: 8/10/2021
    Author: Ian Lubkin
    Purpose: Return the date as a mm-dd-yyyy string, a mm-dd string, or a yyyy-mm-dd string
    Last Edit:8/10/2021
*/
function getDateString(offset = 0, option = 0) {
    let today = new Date();
    let ddnum = today.getDate() + offset;
    let mmnum = today.getMonth() + 1;
    let yyyynum = today.getFullYear();
    if(ddnum > daysInMonth(mmnum, yyyynum)) {
        ddnum -= daysInMonth(mmnum, yyyynum);
        mmnum++;
    }
    if(ddnum < 1) {
        mmnum--;
        ddnum = daysInMonth(mmnum, yyyynum) + ddnum;
    }
    let dd = String(ddnum).padStart(2, '0');
    let mm = String(mmnum).padStart(2, '0'); //January is 0!
    let yyyy = today.getFullYear();
    if(option === 0) {
        return mm + '-' + dd + '-' + yyyy;
    }
    if(option === 1) {
        return mm + '-' + dd;
    }
    if(option === 2) {
        return yyyy + '-' + mm + '-' + dd;
    }
    else {
        throw new Error("Incorrect parameters passed to getDateString");
    }
}


/*  Function Description
    Creation Date: 8/10/2021
    Author: Ian Lubkin
    Purpose: Return the number of days in a given month
    Last Edit:8/10/2021
*/
function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

/****** Functions to handle the interface with Firebase ******/

//  These functions should be very fast if the data is up to date
let database = firebase.database(); //global variable for root of firebase database

/*** Functions to get data from firebase if the local storage data is out of date ***/
/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Update local storage for permitted email list from firebase 
    if local storage is out of date.
    Last Edit:8/01/2021
*/
async function updatePermittedEmailsLocal() {
    await database.ref().child('permitted emails').once('value', (snapshot) => {
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
    let lastRead = 0;
    let lastWrite = 0;
    if(JSON.parse(localStorage.getItem('itemLists')) !== null) {
        if(JSON.parse(localStorage.getItem('itemLists'))['D8H9NmFStHEksFQZ'] === null) {
            localStorage.removeItem('itemLists');
        }
        else {
            lastRead = Number(JSON.parse(localStorage.getItem('itemLists'))['last write']);
        }
    }
    const dbRef = firebase.database().ref();
    await dbRef.child("item list").child('last write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            console.log("Error reading from item list: No data available");
        }
    }).catch((error) => {
        console.error(error);
    });
    if(lastRead !== lastWrite) {
        await dbRef.child("item list").get().then((snapshot) => {
            if (snapshot.exists()) {
                localStorage.setItem('itemLists', JSON.stringify(snapshot.val()));
            } else {
                console.log("Error reading from item list: No data available");
            }
        }).catch((error) => {
            console.error(error);
        });
    }
}

/*  Function Description
    Creation Date: 8/03/2021
    Author: Ian Lubkin
    Purpose: Update local storage object for user info.
    Last Edit:8/03/2021
*/
async function updateUserInfoLocal(uid) {
    let primaryLocation = 'settlers-green';
    const dbRef = firebase.database().ref();
    await dbRef.child("users").child(uid).child('primaryLocation').get().then((snapshot) => {
        if (snapshot.exists()) {
            primaryLocation = snapshot.val();
        } else {
            console.log("Error reading from primaryLocation of user: No data available");
        }
    }).then( () => { 
        return localStorage.setItem('userLocation', JSON.stringify(primaryLocation));
    }).catch((error) => {
        console.error(error);
    });
    await dbRef.child("users").child(uid).get().then((snapshot) => {
        if (snapshot.exists()) {
            localStorage.setItem('users', JSON.stringify({uid: snapshot.val(),}));
            localStorage.setItem('currentUID', JSON.stringify(uid));
        } else {
            console.log("Error reading from user: No data available");
        }
    }).catch((error) => {
        console.error(error);
    });
}

/*  Function Description
    Creation Date: 8/10/2021
    Author: Ian Lubkin
    Purpose: Update local storage object "locations" to reflect firebase data.
    Last Edit:8/10/2021
*/
async function updateLocationsLocal() {
    let lastRead = 0;
    let lastWrite = 0;
    if(JSON.parse(localStorage.getItem('locationList')) !== null) {
        if(JSON.parse(localStorage.getItem('locationList'))['D8H9NmFStHEksFQZ'] === null) {
            localStorage.removeItem('locationList');
        }
        else {
            lastRead = Number(JSON.parse(localStorage.getItem('locationList'))['last write']);
        }
    }
    const dbRef = firebase.database().ref();
    await dbRef.child('locations').child('last write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            console.log("Error reading from locations: No data available");
        }
    }).catch((error) => {
        console.error(error);
    });
    if(lastRead !== lastWrite) {
        await dbRef.child("locations").get().then((snapshot) => {
            if (snapshot.exists()) {
                localStorage.setItem('locationList', JSON.stringify(snapshot.val()));
            } else {
                console.log("Error reading from locations: No data available");
            }
        }).catch((error) => {
            console.error(error);
        });
    }
}

/*  Function Description
    Creation Date: 8/10/2021
    Author: Ian Lubkin
    Purpose: Update local storage object revenuePredictions to reflect firebase data.
    Last Edit:8/11/2021
*/
async function updateRevenuePredictionsLocal(offset = 0) {
    await updateLocationsLocal();
    let locations = JSON.parse(localStorage.getItem('locationList'));
    let lastRead = 0;
    let lastWrite = 0;
    let dateString = getDateString(offset);
    let dateNumber = Date.parse(new Date(dateString));
    if(JSON.parse(localStorage.getItem('revenuePredictions')) !== null) {
        if(JSON.parse(localStorage.getItem('revenuePredictions'))[dateString] !== null) {
            if(JSON.parse(localStorage.getItem('revenuePredictions'))['D8H9NmFStHEksFQZ'] === null) {
                localStorage.removeItem('revenuePredictions');
            }
            else {
                lastRead = Number(JSON.parse(localStorage.getItem('revenuePredictions'))['last write']);
            }
        }
    }
    const dbRef = firebase.database().ref();
    await dbRef.child('revenue predictions').child(dateString).child('last write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            lastWrite = 0;
            let revenuePredictions = {};
            if(JSON.parse(localStorage.getItem('revenuePredictions')) !== null) {
                revenuePredictions = JSON.parse(localStorage.getItem('revenuePredictions'));
            }
            revenuePredictions[dateString] = {
                "last write": dateNumber,
            };
            for(let loc in locations) {
                if(typeof(locations[loc]) === 'object') {
                    revenuePredictions[dateString][loc] = 0;
                }
            }

            database.ref('/revenue predictions/' + dateString).set(revenuePredictions[dateString]);
            localStorage.setItem('revenuePredictions', JSON.stringify(revenuePredictions));
            console.log("Error reading from revenue predictions: No data available. New data written.");
        }
    }).catch((error) => {
        console.error(error);
    });
    if(lastRead !== lastWrite) {
        await dbRef.child('revenue predictions').child(dateString).get().then((snapshot) => {
            if (snapshot.exists()) {
                let revenuePredictions = {};
                if(JSON.parse(localStorage.getItem('revenuePredictions')) !== null) {
                    revenuePredictions = JSON.parse(localStorage.getItem('revenuePredictions'));
                }
                revenuePredictions[dateString] = snapshot.val();
                localStorage.setItem('revenuePredictions', JSON.stringify(revenuePredictions));
            } else {
                console.log("Error reading from revenue predictions: No data available");
            }
        }).catch((error) => {
            console.error(error);
        });
    }
}

/*  Function Description
    Creation Date: 8/15/2021
    Author: Ian Lubkin
    Purpose: Update local storage object inventoryRecord to reflect firebase data.
    This function updates inventories one at a time which makes it slow when reading many inventories.
    Last Edit:8/21/2021
*/
async function updateSingleInventoryRecordLocal(offset = 0, iLoc = JSON.parse(localStorage.getItem('userLocation'))) {
    await updateItemLocal();
    let items = JSON.parse(localStorage.getItem('itemLists'))[iLoc];
    let lastRead = 0;
    let lastWrite = 0;
    console.log(iLoc);
    
    let lastItemWrite = Number(items['last write']);
    let dateString = getDateString(offset);
    let dateNumber = Date.parse(new Date());
    if(JSON.parse(localStorage.getItem('inventoryRecord')) !== null) {
        if(JSON.parse(localStorage.getItem('inventoryRecord'))[dateString] !== null) {
            if(JSON.parse(localStorage.getItem('inventoryRecord'))['D8H9NmFStHEksFQZ'] === null) {
                localStorage.removeItem('inventoryRecord');
            }
            else {
                lastRead = Number(JSON.parse(localStorage.getItem('inventoryRecord'))['last write']);
            }
        }
    }
    const dbRef = firebase.database().ref();
    await dbRef.child('eod inventory record').child(dateString).child(iLoc).child('last write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            lastWrite = 0;
            let inventoryRecord = {};
            if(JSON.parse(localStorage.getItem('inventoryRecord')) !== null) {
                inventoryRecord = JSON.parse(localStorage.getItem('inventoryRecord'));
            }
            inventoryRecord[dateString] = {
                "last write": dateNumber,
            };
            inventoryRecord[dateString][iLoc] = {
                "last write": dateNumber,
                'user written': false,
            };
            inventoryRecord[dateString][iLoc][dateNumber] = {};
            for(let item in items) {
                if(typeof(items[item]) === 'object'){
                    inventoryRecord[dateString][iLoc][dateNumber][item] = 0;
                }
            }

            database.ref('/eod inventory record/' + dateString + '/' + iLoc).set(inventoryRecord[dateString][iLoc]);
            localStorage.setItem('inventoryRecord', JSON.stringify(inventoryRecord));
            console.log("Error reading from eod inventory record: No data available. New data written.");
        }
    }).catch((error) => {
        console.error(error);
    });
    if(lastRead !== lastWrite || lastRead <= lastItemWrite) {
        await dbRef.child('eod inventory record').child(dateString).get().then((snapshot) => {
            if (snapshot.exists()) {
                let inventoryRecord = {};
                if(JSON.parse(localStorage.getItem('inventoryRecord')) !== null) {
                    inventoryRecord = JSON.parse(localStorage.getItem('inventoryRecord'));
                }
                inventoryRecord[dateString] = snapshot.val();
                inventoryRecord['last-write'] = dateNumber;
                localStorage.setItem('inventoryRecord', JSON.stringify(inventoryRecord));
            } else {
                console.log("Error reading from eod inventory record: No data available");
            }
        }).catch((error) => {
            console.error(error);
        });
    }
}

/*  Function Description
    Creation Date: 8/21/2021
    Author: Ian Lubkin
    Purpose: Update local storage object inventoryRecord to reflect firebase data.
    This function updates all eod inventory records to reduce the time required to query firebase.
    Last Edit:8/21/2021
*/
async function updateAllInventoryRecordsLocal(offset = 0) {
    await updateItemLocal();
    let itemLists = JSON.parse(localStorage.getItem('itemLists'));
    await updateLocationsLocal();
    let locations = JSON.parse(localStorage.getItem('locationList'));
    let lastRead = 0;
    let lastWrite = 0;
    
    let lastItemWrite = Number(itemLists['last write']);
    let dateString = getDateString(offset);
    let dateNumber = Date.parse(new Date());
    if(JSON.parse(localStorage.getItem('inventoryRecord')) !== null) {
        if(JSON.parse(localStorage.getItem('inventoryRecord'))[dateString] !== null) {
            if(JSON.parse(localStorage.getItem('inventoryRecord'))['D8H9NmFStHEksFQZ'] === null) {
                localStorage.removeItem('inventoryRecord');
            }
            else {
                lastRead = Number(JSON.parse(localStorage.getItem('inventoryRecord'))['last write']);
            }
        }
    }
    const dbRef = firebase.database().ref();
    await dbRef.child('eod inventory record').child(dateString).child('last write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            lastWrite = 0;
            let inventoryRecord = {};
            if(JSON.parse(localStorage.getItem('inventoryRecord')) !== null) {
                inventoryRecord = JSON.parse(localStorage.getItem('inventoryRecord'));
            }
            inventoryRecord[dateString] = {
                "last write": dateNumber,
            };
            for(let loc in locations) {
                if(typeof(locations[loc]) !== 'object') {
                    continue;
                }
                inventoryRecord[dateString][loc] = {
                    "last write": dateNumber,
                    'user written': false,
                };
                inventoryRecord[dateString][loc][dateNumber] = {};
                for(let item in itemLists[loc]) {
                    if(typeof(itemLists[loc][item]) === 'object'){
                        inventoryRecord[dateString][loc][dateNumber][item] = 0;
                    }
                }
            }
            

            database.ref('/eod inventory record/' + dateString).set(inventoryRecord[dateString]);
            localStorage.setItem('inventoryRecord', JSON.stringify(inventoryRecord));
            console.log("Error reading from eod inventory record: No data available. New data written.");
        }
    }).catch((error) => {
        console.error(error);
    });
    if(lastRead !== lastWrite || lastRead <= lastItemWrite) {
        await dbRef.child('eod inventory record').child(dateString).get().then((snapshot) => {
            if (snapshot.exists()) {
                let inventoryRecord = {};
                if(JSON.parse(localStorage.getItem('inventoryRecord')) !== null) {
                    inventoryRecord = JSON.parse(localStorage.getItem('inventoryRecord'));
                }
                inventoryRecord[dateString] = snapshot.val();
                inventoryRecord['last-write'] = dateNumber;
                localStorage.setItem('inventoryRecord', JSON.stringify(inventoryRecord));
            } else {
                console.log("Error reading from eod inventory record: No data available");
            }
        }).catch((error) => {
            console.error(error);
        });
    }
}

/*** Functions to submit data to firebase ***/
/*  Function Description
    Creation Date: 7/31/2021
    Author: Ian Lubkin
    Purpose: Save item data to firebase from the user via the input form.
    Last Edit: 8/06/2021
*/
async function submitItemForm() { //later perhaps get userLocation from local storage
    let userLocation = JSON.parse(localStorage.getItem('userLocation'));
    let curDTInt = Date.parse(new Date()); //current date-time integer, created by parsing a new Date object
    let item = {}; //a blank base item object
    let prevName = ''; //holds value for unit and ingredient input gathering
    //gather values from form
    item['name'] = document.querySelector('#item-name-input').value;
    item['prepared-bool'] = document.querySelector('#prepared-radio').checked;
    item['ingredient-bool'] = document.querySelector('#ingredient-radio').checked;
    item['in-use-bool'] = document.querySelector('#in-use-radio').checked;
    item['special-category'] = document.querySelector('#item-special-category-input').value;
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
    item['prep-info'] = {};
    item['prep-info']['prep-time'] = document.querySelector('#item-prep-time-input').value;
    item['prep-info']['batch-size'] = document.querySelector('#item-batch-size-input').value;
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
    loadingMessageOn('Submitting item');
    await database.ref('/item list/' + userLocation + '/' + item['name']).update(item);
    await database.ref('/item list/' + userLocation).update({ 'last write': curDTInt, });
    await database.ref('/item list').update({ 'last write': curDTInt, });
    loadingMessageOff();
    showSuccessMessage(`${item['name']} submitted successfuly`)
    document.querySelectorAll('#item-edit-wrapper input').forEach( (input) => { 
        input.value = '';
    });
    document.querySelector('#secondary-unit-name-input-1').value = 'none';
    document.querySelector('#ingredient-name-input-1').value = 'none';
    document.querySelectorAll('#item-other-units-input-wrapper > input, #item-ingredients-input-wrapper > input').forEach( (input) => {
        input.remove();
    });
}

/*  Function Description
    Creation Date: 8/11/2021
    Author: Ian Lubkin
    Purpose: Handle user sign in with Firebase Authentication.
    Last Edit: 8/11/2021
*/
async function submitRevenueInterface() {
    let dateTmp = '';
    let locTmp = '';
    let curDTInt = Date.parse(new Date());
    let updateObj = { 'last write': curDTInt};

    document.querySelectorAll('.revenue-interface-location-row input').forEach( (input) => {
        dateTmp = input.dataset.date;
        locTmp = input.dataset.location;
        if(updateObj[dateTmp] === undefined) {
            updateObj[dateTmp] = {};
        }
        updateObj[dateTmp][locTmp] = Number(input.value);
    });
    loadingMessageOn('Updating revenue predictions');
    for(let day in updateObj) {
        if(typeof(updateObj[day]) === 'object') {
            await database.ref('/revenue predictions').update({ 'last write': curDTInt, });
            await database.ref('/revenue predictions/' + day).update(updateObj[day]);
        }
    }
    loadingMessageOff();
    showSuccessMessage('Revenue updated sucessfully');
}

async function submitPrepChecklist() {
    //it is safe to assume that the location list, item list, and revenue predictions are up to date, as this 
    //  function will only be called after loadPrepChecklist has run successfully
    let userLocation = JSON.parse(localStorage.getItem('userLocation'));
    let curDTstr = getDateString();
    let curDTInt = Date.parse(new Date()); //current date-time integer, created by parsing a new Date object
    let locations = JSON.parse(localStorage.getItem('locationList'));
    let region = locations[userLocation]['region'];
    let itemName;
    let prepObj = {};
    document.querySelectorAll('.prep-checklist-item-row').forEach((row) => {
        itemName = row.dataset.item;
        prepObj[itemName] = row.querySelector('.prep-checklist-item-number-input').value;
    });
    loadingMessageOn('Submitting completed prep list');
    await database.ref('prep record/' + curDTstr + '/' + region + '/' + curDTInt).update(prepObj);
    loadingMessageOff();
    showSuccessMessage('Prep record submitted sucessfully');
}

async function submitInventoryForm(offset = 0, uLoc = JSON.parse(localStorage.getItem('userLocation'))) {
    let curDTInt = Date.parse(new Date());
    let invObj = {};
    let uName = '';
    let uUnit = '';
    document.querySelectorAll('#inventory-form-wrapper > .inventory-item-row > input').forEach( (input) => {
        uName = input.parentElement.dataset.name;
        uUnit = input.parentElement.dataset.unit;
        invObj[uName] = Number(input.value);
    });
    loadingMessageOn('Submitting inventory');
    await database.ref('eod inventory record/' + getDateString(offset) + '/' + uLoc + '/' + curDTInt).set(invObj);
    await database.ref('eod inventory record/' + getDateString(offset) + '/' + uLoc + '/last write').set(curDTInt);
    await database.ref('eod inventory record/' + getDateString(offset) + '/last write').set(curDTInt);
    await database.ref('eod inventory record/' + getDateString(offset) + '/' + uLoc + '/user wrirten').set(true);
    loadingMessageOff();
    showSuccessMessage('Inventory submitted sucessfully');
    console.log(invObj);
}

/*** Blocks to listen to data in firebase and update local data accordingly ***/
const itemListsRef = firebase.database().ref('item list');
itemListsRef.on('value', (snapshot) => {
    updateItemLocal();
});

/*** Functions to handle user authentication with Firebase ***/
/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Handle user sign in with Firebase Authentication.
    Last Edit: 8/03/2021
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
        loadingMessageOn('Signing you in');
        await firebase.auth().signInWithEmailAndPassword(userSIEmail, userSIPassword).then((success) => {
            setTimeout(function() {
                document.getElementById('sign-in-form').style.display = 'none';
            }, 100);
            }).catch((error) => {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            alert(`Sign in error ${errorCode}: ${errorMessage}`)
        });
        loadingMessageOff();
        //sign-in-loader will turn off when the authstate changes
    }
}

/*  Function Description
    Creation Date: 8/01/2021
    Author: Ian Lubkin
    Purpose: Sign user out with Firebase Authentication.
    Last Edit: 8/01/2021
*/
function signOut() {
    return firebase.auth().signOut().then(function() {
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
    Last Edit: 8/03/2021
*/
async function signUp() {
    await updatePermittedEmailsLocal();
    let permittedEmails = JSON.parse(localStorage.getItem('permittedEmails'));
    let uFirstName = document.getElementById("user-first-name").value;
    let uLastName = document.getElementById("user-last-name").value;
    let uEmail = document.getElementById("user-email").value;
    let uPassword = document.getElementById("user-password").value;
    let uLocation = document.getElementById("user-location").value;
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
    uLocation = uLocation.toLowerCase();

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
        loadingMessageOn('Creating your account');
        await firebase.auth().createUserWithEmailAndPassword(uEmail, uPassword).then((success) => {
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
                primaryLocation: uLocation,
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
        loadingMessageOff();
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
    Leans on userPageLoader.
    Last Edit: 8/03/2021
*/
firebase.auth().onAuthStateChanged( function(user) {
    if (user) {
        console.log('bello');
        //here is where to call all the update functions.
        hideAllElements();
        document.querySelector('#sign-out-button').style.display = '';
        let uid = user.uid;
        userPageLoader();
        
        //gives current user email
        //add logic for user dependent loading
        // User is signed in.
    } else {
        hideAllElements();
        document.querySelector('#sign-in-form').style.display = 'grid';
        document.querySelector('#sign-out-button').style.display = 'none';
        // No user is signed in.
    }
  });

//Primary goal: make an interface to add and edit items with ingredients and full set of information.
//After this first step, extensive pseudocode and planning should be completed

/****** DOM functions ******/
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
        //it appears that we never get here... login logic is called from authstatechange
        document.querySelector('#sign-out-button').style.display = '';
        console.log('yello');
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
    Edit page info such as title according to user information.
    Last Edit: 8/03/2021
*/
async function userPageLoader() {
    //add logic to serve the correct page based on TOD and user prefferences/location
    //set all titles to include location
    //update all titles to have user location included
    let uid = firebase.auth().currentUser.uid;
    await updateUserInfoLocal(uid);
    let userLocation = localStorage.getItem('userLocation');
    document.querySelector('#item-form-title').innerHTML = `Add Item - ${dashToSpace(JSON.parse(userLocation))}`; //should remove hyphens and capitalize
    
    loadItemList();
    document.querySelector('#item-display-wrapper').style.display = 'grid';
}

/*  Function Description
    Creation Date: 8/06/2021
    Author: Ian Lubkin
    Description: Change navigation to hambuger for mobile use
    Last Edit: 8/06/2021
*/
function expandMobileNav() {
    var x = document.getElementById("top-nav");
    if (x.className === "top-nav") {
      x.className += " responsive";
    } else {
      x.className = "top-nav";
    }
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
    Add event listeners to edit buttons for the editing of items.
    Last Edit:8/07/2021
*/
async function loadItemList() {
    loadingMessageOn('Loading item interface');
    document.querySelectorAll('.item-display-row').forEach( (row) => { /*Clear all the old rows*/
        row.remove();
    });
    let userLocation = JSON.parse(localStorage.getItem('userLocation'));
    await updateItemLocal();
    let itemList = JSON.parse(localStorage.getItem('itemLists'))[userLocation];

    let itemDisplay = document.querySelector('#item-display-wrapper');
    let itemAddBtn = document.querySelector('#item-add-form-button');
    document.querySelector('#item-display-title').innerHTML = `Items - ${spaceToDash(userLocation)}`;
    for(let item in itemList) {
        if(typeof(itemList[item]) !== 'object') {
            continue;
        }
        let name = document.createElement('p');
        name.classList.add('item-display-name');
        name.innerHTML = itemList[item]['name'];
        let unit = document.createElement('p');
        unit.classList.add('item-display-unit');
        unit.innerHTML = itemList[item]['main-unit'];
        let ratio = document.createElement('p');
        ratio.classList.add('item-display-use-ratio');
        ratio.innerHTML = Number(itemList[item]['use-to-sales-ratio']).toFixed(5);
        let source = document.createElement('p');
        source.classList.add('item-display-source');
        source.innerHTML = (itemList[item]['prepared-bool'] === true ? 'prepared' : 'ordered');
        let category = document.createElement('p');
        category.classList.add('item-display-category');
        category.innerHTML = itemList[item]['special-category'];
        //make dropdown for options
        let optionsWrap = document.createElement('div');
        optionsWrap.classList.add('dropdown');
        let options = document.createElement('p');
        options.classList.add('item-display-options');
        options.innerHTML = '&#183; &#183; &#183;'
        optionsWrap.appendChild(options);
        let dropWrap = document.createElement('div');
        dropWrap.classList.add('dropdown-content');
        let edit = document.createElement('p');
        edit.classList.add('item-display-options-edit');
        edit.innerHTML = 'edit';
        let active = document.createElement('p');
        active.classList.add('item-display-options-toggle');
        active.innerHTML = 'deactivate';
        dropWrap.appendChild(edit);
        dropWrap.appendChild(active);
        optionsWrap.appendChild(dropWrap);

        let row = document.createElement('div');
        row.classList.add('item-display-row');
        row.appendChild(name);
        row.appendChild(unit);
        row.appendChild(ratio);
        row.appendChild(source);
        row.appendChild(category);
        // row.appendChild(options);
        row.appendChild(optionsWrap);
        itemDisplay.insertBefore(row, itemAddBtn);
    }
    //Logic for editing an item. May be worth moving to a seperate function.
    document.querySelectorAll('.item-display-options-edit').forEach( (p) => {
        p.addEventListener('click', (e) => {
            let item = itemList[e.target.parentElement.parentElement.parentElement.children[0].innerHTML];
            document.querySelector('#item-name-input').value = item['name'];
            document.querySelector('#prepared-radio').checked = item['prepared-bool'];
            document.querySelector('#ingredient-radio').checked = item['ingredient-bool'];
            document.querySelector('#in-use-radio').checked = item['in-use-bool'];
            document.querySelector('#item-special-category-input').value = item['special-category'];
            document.querySelector('#item-use-ratio-input').value = item['use-to-sales-ratio'];
            document.querySelector('#item-main-unit-input').value = item['main-unit'];
            for(let unit in item['other-units']) {
                let parentDiv = document.querySelector('#item-other-units-input-wrapper');
                let button = document.querySelector('#item-secondary-unit-add-button');

                let newInputName;
                if(document.querySelector('#secondary-unit-name-input-1').value === 'none') {
                    newInputName = document.querySelector('#secondary-unit-name-input-1');
                }
                else {
                    newInputName = document.createElement('input');
                    newInputName.type = 'text';
                    newInputName.classList.add('name-input');
                    parentDiv.insertBefore(newInputName, button);
                } 
                newInputName.value = item['other-units'][unit]['name'];

                let newInputRatio; 
                if(document.querySelector('#secondary-unit-ratio-input-1').value === '') {
                    newInputRatio = document.querySelector('#secondary-unit-ratio-input-1');
                }
                else {
                    newInputRatio = document.createElement('input');
                    newInputRatio.type = 'number';
                    newInputRatio.classList.add('ratio-input');
                    parentDiv.insertBefore(newInputRatio, button);
                }
                newInputRatio.value = item['other-units'][unit]['ratio-to-main-unit'];

            }
            if(item['prep-info'] === undefined) {
                item['prep-info'] = {
                    'prep-time': 0,
                    'batch-size': 0,
                };
            }
            document.querySelector('#item-prep-time-input').value = item['prep-info']['prep-time'];
            document.querySelector('#item-batch-size-input').value = item['prep-info']['batch-size'];
            for(let ing in item['ingredients']) {
                let parentDiv = document.querySelector('#item-ingredients-input-wrapper');
                let button = document.querySelector('#item-ingredient-add-button');

                let newInputName;
                if(document.querySelector('#ingredient-name-input-1').value === 'none') {
                    newInputName = document.querySelector('#ingredient-name-input-1');
                }
                else {
                    newInputName = document.createElement('input');
                    newInputName.type = 'text';
                    newInputName.classList.add('name-input');
                    parentDiv.insertBefore(newInputName, button);
                } 
                newInputName.value = item['ingredients'][ing]['name'];

                let newInputRatio; 
                if(document.querySelector('#ingredient-ratio-input-1').value === '') {
                    newInputRatio = document.querySelector('#ingredient-ratio-input-1');
                }
                else {
                    newInputRatio = document.createElement('input');
                    newInputRatio.type = 'number';
                    newInputRatio.classList.add('ratio-input');
                    parentDiv.insertBefore(newInputRatio, button);
                }
                newInputRatio.value = item['ingredients'][ing]['ratio-to-product'];
            }
            document.querySelector('#item-edit-overlay-wrapper').style.display = 'flex';
        }); 
    });
    
    loadingMessageOff();
}

/*  Function Description
    Creation Date: 8/03/2021
    Author: Ian Lubkin
    Purpose: Hide all elements on the single page
    Last Edit: 8/03/2021
*/
function hideAllElements() {
    document.querySelectorAll('.spa-element').forEach( (element) => {
        element.style.display = 'none';
    });
}

/*  Function Description
    Creation Date: 8/10/2021
    Author: Ian Lubkin
    Purpose: Generate and populate the revenue input/display page.
    Last Edit: 8/11/2021
*/
async function loadRevenueInterface(offset = 0) {
    document.querySelectorAll('.revenue-interface-location-row').forEach( (p) => {
        p.remove();
    });
    await updateLocationsLocal();
    const locations = JSON.parse(localStorage.getItem('locationList'));
    let todayString = getDateString();
    let dateString;
    let pOffset;
    let updateBtn = document.querySelector('#update-revenue-interface-button');
    let revenueIntWrapper = document.querySelector('#revenue-interface-wrapper');
    //create location rows
    //update all header HTML
    document.querySelectorAll('#revenue-interface-header > p').forEach( (p) => {
        pOffset = Number(p.dataset.offset);
        dateString = getDateString(pOffset + offset);
        if(dateString === todayString) {
            p.innerHTML = 'Today';
        }
        else {
            p.innerHTML = getDateString(pOffset + offset, 1);
        }
        updateRevenuePredictionsLocal(pOffset + offset); 
    });
    await sleep(200);
    let revenues = JSON.parse(localStorage.getItem('revenuePredictions'));
    let region = locations[JSON.parse(localStorage.getItem('userLocation'))]['region'];
    for(let loc in locations) {
        if(typeof(locations[loc]) !== 'object' || locations[loc]['type'] === 'kitchen') {
            continue;
        }
        if(locations[loc]['region'] === region) {
            let row = document.createElement('div');
            row.classList.add('revenue-interface-location-row');
            row.dataset.location = loc;
            let label = document.createElement('p');
            label.innerHTML = loc;
            row.appendChild(label);
            for(let i = 0; i < 8; i++) {
                let input = document.createElement('input');
                input.classList.add('revenue-interface-' + i);
                input.type = 'number';
                input.dataset.location = loc;
                input.dataset.date = getDateString(-1 + i + offset);
                input.value = revenues[getDateString(-1 + i + offset)][loc];
                input.step = 100;
                row.appendChild(input);
            }
            revenueIntWrapper.insertBefore(row, updateBtn);
        }
    }
    //Add sum row
    let row = document.createElement('div');
    row.classList.add('revenue-interface-sum-row');
    row.classList.add('revenue-interface-location-row');
    let label = document.createElement('p');
    label.innerHTML = "Sum: ";
    row.appendChild(label);
    for(let i = 0; i < 8; i++) {
        let sum = document.createElement('p');
        sum.classList.add('revenue-interface-' + i);
        sum.dataset.date = getDateString(-1 + 1 + offset);
        sum.innerHTML = getRevenueDaySum(i);
        row.appendChild(sum);
    }
    revenueIntWrapper.insertBefore(row, updateBtn);

    //add event listeners
    document.querySelectorAll('.revenue-interface-location-row input').forEach( (input) => {
        input.addEventListener('blur', () => {
            let col = Number(input.classList[0].charAt((input.classList[0]).length-1));
            document.querySelector('.revenue-interface-sum-row .revenue-interface-' + col).innerHTML = getRevenueDaySum(col);
        });
    });
}

/*  Function Description
    Creation Date: 8/11/2021
    Author: Ian Lubkin
    Purpose: Calculate and return the sum of a revenue prediction column.
    Last Edit: 8/11/2021
*/
function getRevenueDaySum(rowNum) {
    let locations = JSON.parse(localStorage.getItem('locationList'));
    let sum = 0;

    document.querySelectorAll('.revenue-interface-location-row .revenue-interface-' + rowNum).forEach( (row) => {
        if(locations[row.dataset.location]['type'] === 'kitchen') {
            return; //skip
        }
        sum += Number(row.value);
    });
    
    return sum;
}

/*  Function Description
    Creation Date: 8/12/2021
    Author: Ian Lubkin
    Purpose: Generate a prep checklist using the current location inventories and
    the projected revenues for the next <7 days and 7 days.
    Last Edit: 8/20/2021
*/
async function loadPrepChecklist(daysOut = 1) {
    //8/20 idea: it would be nice to add the ability to load a completed prep checklist, although this is a backburner feature
    loadingMessageOn('Fetching data for calculations');
    /* Remove all old rows to avoid creating duplicates. This is done instead of skipping duplicate
        creation or updating duplicates because replacing all the rows has a similar speed to updating them
        and is the simplest implimentation*/
    document.querySelectorAll('.prep-checklist-item-row').forEach( (row) => {
        row.remove();
    })
    await updateLocationsLocal();
    let locations = JSON.parse(localStorage.getItem('locationList'));
    await updateItemLocal();
    let items = JSON.parse(localStorage.getItem('itemLists'));
    let uLoc = JSON.parse(localStorage.getItem('userLocation'));
    let region = locations[uLoc]['region'];
    let kitchen = '';
    /* Get the region's kitchen name (as a master list) */
    for(let loc in locations) {
        if(locations[loc]['region'] === region && locations[loc]['type'] === 'kitchen') {
            kitchen = loc;
        }
    }
    await updateAllInventoryRecordsLocal(-1);
    let inventoryRecord = JSON.parse(localStorage.getItem('inventoryRecord'));
    /* Get revenue for each location for the next 7 days */
    for(let i = 0; i < 8; i++) { 
        await updateRevenuePredictionsLocal(i);
    }
    let revenuePredictions = JSON.parse(localStorage.getItem('revenuePredictions'));
    loadingMessageOff();

    loadingMessageOn('Generating prep checklist');
    // set the date field 
    document.querySelector('#minimum-prep-date-input').value = getDateString(daysOut, 2);
    
    //Calculate the needed amount of each item for each location in the user's region, both for tomorrow and a week out
    //Use the above calculation to generate a checklist 
    let minPrepObj = {};
    let weekPrepObj = {};
    let minRevenue = 0;
    let weekRevenue = 0;
    for(let i = 0; i < 8; i++) {
        for(let loc in items) {
            if(typeof(locations[loc]) !== 'object' || locations[loc]['region'] !== region) {
                continue;
            }
            if(i <= daysOut) {
                minRevenue += Number(revenuePredictions[getDateString(i)][loc]);
            }
            weekRevenue += Number(revenuePredictions[getDateString(i)][loc]);
            for(let item in items[loc]) {
                if(typeof(items[loc][item]) !== 'object' || items[loc][item]['prepared-bool'] === false) {
                    continue;
                }
                if(minPrepObj[item] === undefined) {
                    minPrepObj[item] = {};
                    weekPrepObj[item] = {};
                    minPrepObj[item]['number'] = 0;
                    weekPrepObj[item]['number'] = 0;
                    minPrepObj[item]['unit'] = 'error';
                    weekPrepObj[item]['unit'] = 'error';
                    minPrepObj[item]['prep-time'] = NaN;
                    weekPrepObj[item]['prep-time'] = NaN;
                    minPrepObj[item]['batch-size'] = 1;
                    weekPrepObj[item]['batch-size'] = 1;
                    minPrepObj[item]['category'] = '';
                    weekPrepObj[item]['category'] = '';
                }
                if(locations[loc]['type'] === 'kitchen') {
                    minPrepObj[item]['unit'] = items[loc][item]['main-unit'];
                    weekPrepObj[item]['unit'] = items[loc][item]['main-unit'];
                    minPrepObj[item]['prep-time'] = items[loc][item]['prep-info']['prep-time'];
                    weekPrepObj[item]['prep-time'] = items[loc][item]['prep-info']['prep-time'];
                    minPrepObj[item]['batch-size'] = (Number(items[loc][item]['prep-info']['batch-size']) === 0 ? 1 : items[loc][item]['prep-info']['batch-size']); //ensure batch size is non-zero
                    weekPrepObj[item]['batch-size'] = (Number(items[loc][item]['prep-info']['batch-size']) === 0 ? 1 : items[loc][item]['prep-info']['batch-size']);
                    minPrepObj[item]['category'] = items[loc][item]['special-category'];
                    weekPrepObj[item]['category'] = items[loc][item]['special-category'];
                }
                if(i === 0) {
                    minPrepObj[item]['number'] -= Number(inventoryRecord[getDateString(-1)][loc][inventoryRecord[getDateString(-1)][loc]['last write']][item]); //get latest write index as a key in the eod inventory record
                    weekPrepObj[item]['number'] -= Number(inventoryRecord[getDateString(-1)][loc][inventoryRecord[getDateString(-1)][loc]['last write']][item]);
                }
                if(typeof(items[loc][item]) !== 'object' || items[loc][item]['prepared-bool'] === false) {
                    continue;
                }
                if(i <= daysOut && items[loc][item]['special-category'] !== 'sandwich') {
                    minPrepObj[item]['number'] += Math.ceil((Number(items[loc][item]['use-to-sales-ratio']) * Number(revenuePredictions[getDateString(i)][loc])));
                }
                weekPrepObj[item]['number'] += (Number(items[loc][item]['use-to-sales-ratio']) * Number(revenuePredictions[getDateString(i)][loc]));
                //check if the ingredient is in the current list. If it is not, use the master list (kitchen) to generate it's need from this location.
                for(let ing in items[loc][item]['ingredients']) {
                    if(ing === 'none') {
                        continue;
                    }
                    if(items[loc][ing] === undefined) {
                        if(items[kitchen][ing] === undefined) {
                            console.log("Ingredient not recorded in master item list");
                            continue;
                        }
                        if(minPrepObj[ing] === undefined) {
                            minPrepObj[ing] = {};
                            weekPrepObj[ing] = {};
                            minPrepObj[ing]['number'] = 0;
                            weekPrepObj[ing]['number'] = 0;
                            minPrepObj[ing]['unit'] = 'error';
                            weekPrepObj[ing]['unit'] = 'error';
                            minPrepObj[ing]['prep-time'] = NaN;
                            weekPrepObj[ing]['prep-time'] = NaN;
                            minPrepObj[ing]['batch-size'] = 1;
                            weekPrepObj[ing]['batch-size'] = 1;
                            minPrepObj[ing]['category'] = '';
                            weekPrepObj[ing]['category'] = '';
                        }
                        if(items[kitchen][ing]['prepared-bool'] === false) {
                            continue;
                        }
                        console.log(Number(items[kitchen][item]['ingredients'][ing]['ratio-to-product']));
                        minPrepObj[ing] += Number(minPrepObj[item]['number']) * Number(items[kitchen][item]['ingredients'][ing]['ratio-to-product']);
                        weekPrepObj[ing] += Number(weekPrepObj[item]['number']) * Number(items[kitchen][item]['ingredients'][ing]['ratio-to-product']);
                    }
                }
            }
        }
    }
    
    document.querySelector('#prep-checklist-day-revenue').innerHTML = `($${minRevenue})`;
    document.querySelector('#prep-checklist-week-revenue').innerHTML = `($${weekRevenue})`;

    //edit DOM to reflect prep list
    for(let item in minPrepObj) {
        let wrapper = document.querySelector('#prep-checklist-wrapper');
        let button = document.querySelector('#submit-prep-checklist-button');
        let sandwichDiv = document.querySelector('#prep-checklist-sandwich-label');
        let otherDiv = document.querySelector('#prep-checklist-other-label');
        let row = document.createElement('div');
        row.classList.add('prep-checklist-item-row');
        row.dataset.item = item;
        let check = document.createElement('input');
        check.type = 'checkbox';
        row.appendChild(check);
        let number = document.createElement('input');
        number.type = 'number';
        number.value = minPrepObj[item]['number'];
        number.classList.add('prep-checklist-item-number-input');
        row.appendChild(number);
        let unit = document.createElement('p');
        unit.innerHTML = minPrepObj[item]['unit'];
        row.appendChild(unit);
        let name = document.createElement('p');
        name.innerHTML = item;
        row.appendChild(name);
        let hours = document.createElement('p');
        hours.innerHTML = String(Math.ceil((minPrepObj[item]['number']*Number(minPrepObj[item]['prep-time']))/Number(minPrepObj[item]['batch-size']))) + ' min';
        row.appendChild(hours);
        let weekNumber = document.createElement('p');
        weekNumber.classList.add('prep-checklist-week-info');
        weekNumber.innerHTML = Math.ceil(weekPrepObj[item]['number']);
        row.appendChild(weekNumber);
        let weekHours = document.createElement('p');
        weekHours.classList.add('prep-checklist-week-info');
        weekHours.innerHTML = String(Math.ceil(weekPrepObj[item]['number'])*Math.ceil(Number(weekPrepObj[item]['prep-time'])/Number(minPrepObj[item]['batch-size']))) + ' min';
        row.appendChild(weekHours);
        if(minPrepObj[item]['category'] === 'sandwich') {
            wrapper.insertBefore(row, sandwichDiv.nextSibling);
        }
        else {
            wrapper.insertBefore(row, otherDiv.nextSibling);
        }
    }
    addEventListenersPrepChecklist('prep-checklist-wrapper', 'prep-checklist-item-row');
    loadingMessageOff();
}

/*  Function Description
    Creation Date: 8/23/2021
    Author: Ian Lubkin
    Purpose: Load a food/goods order checklist.
    Last Edit: 8/23/2021
*/
async function loadOrderForm(startDay = null, endDay = null) {
    loadingMessageOn('Fetching data for calculations');
    /* Remove all old rows to avoid creating duplicates. This is done instead of skipping duplicate
        creation or updating duplicates because replacing all the rows has a similar speed to updating them
        and is the simplest implimentation*/
    document.querySelectorAll('.prep-checklist-item-row').forEach( (row) => {
        row.remove();
    })
    await updateLocationsLocal();
    let locations = JSON.parse(localStorage.getItem('locationList'));
    await updateItemLocal();
    let itemLists = JSON.parse(localStorage.getItem('itemLists'));
    let uLoc = JSON.parse(localStorage.getItem('userLocation'));
    let region = locations[uLoc]['region'];
    let kitchen = '';
    /* Get the region's kitchen name (as a master list) */
    for(let loc in locations) {
        if(typeof(locations[loc]) !== 'object') {
            continue;
        }
        if(locations[loc]['region'] === region && locations[loc]['type'] === 'kitchen') {
            kitchen = loc;
        }
    }
    await updateAllInventoryRecordsLocal(-1);
    let inventoryRecord = JSON.parse(localStorage.getItem('inventoryRecord'));
    /* Get revenue for each location for the next 7 days */
    for(let i = 0; i < 8; i++) { 
        await updateRevenuePredictionsLocal(i);
    }
    let revenuePredictions = JSON.parse(localStorage.getItem('revenuePredictions'));
    loadingMessageOff();

    loadingMessageOn('Generating order checklist');
    // set the date field according to next order day
    if(startDay === null && endDay === null) {
        let today = new Date();
        switch (today.getDay()) {
            case 0: //Sunday
                startDay = 1; //Order used for Monday through
                endDay = 3; //Wednesday
                break;
            case 1: //Monday
                startDay = 2; //Order used for Wednesday through
                endDay = 4; //Friday
                break;
            case 2: //Tuesday
                startDay = 1; //Order used for Wednesday through
                endDay = 3; //Friday
                break;
            case 3: //Wednesday
                startDay = 2; //Order used for Friday through
                endDay = 5; //Monday
                break;
            case 4: //Thursday
                startDay = 1; //Order used for Friday through
                endDay = 4; //Monday
                break;
            case 5: //Friday
                startDay = 3; //Order used for Monday through
                endDay = 5; //Wednesday
                break;
            case 6: //Saturday
                startDay = 2; //Order used for Monday through
                endDay = 4; //Wednesday
                break;
        }
    }
    document.querySelector('#start-order-date-input').value = getDateString(startDay, 2);
    document.querySelector('#end-order-date-input').value = getDateString(endDay, 2);
    
    //Calculate the needed amount of each item for each location in the user's region, both for tomorrow and a week out
    //Use the above calculation to generate a checklist 
    //*Currently does not remove inventories stored at sattelites, i.e., chip boxes at settlers, which will give some overage
    let orderObj = {};
    let orderRevenue = 0;
    for(let i = startDay; i < endDay; i++) {
        for(let loc in itemLists) {
            if(typeof(locations[loc]) !== 'object' || locations[loc]['region'] !== region) {
                continue;
            }
            orderRevenue += Number(revenuePredictions[getDateString(i)][loc]);
        }
        for(let item in itemLists[kitchen]) {
            if(typeof(itemLists[kitchen][item]) !== 'object' || itemLists[kitchen][item]['prepared-bool'] === true) {
                continue;
            }
            if(orderObj[item] === undefined) {
                orderObj[item] = {};
                orderObj[item]['number'] = 0;
                orderObj[item]['unit'] = itemLists[kitchen][item]['main-unit'];
                orderObj[item]['category'] = itemLists[kitchen][item]['special-category'];
            }
            if(i === 0) { //this is the only inventory adjustment, resulting in some overage (as e.g., settlers will not be accounted for)
                orderObj[item]['number'] -= Number(inventoryRecord[getDateString(-1)][kitchen][inventoryRecord[getDateString(-1)][kitchen]['last write']][item]); //get latest write index as a key in the eod inventory record
            }
            orderObj[item]['number'] += Math.ceil((Number(itemLists[kitchen][item]['use-to-sales-ratio']) * Number(orderRevenue)));
            
        }
        
    }
    
    document.querySelector('#order-checklist-period-revenue').innerHTML = `($${orderRevenue})`;

    //edit DOM to reflect prep list
    for(let item in orderObj) {
        let wrapper = document.querySelector('#order-checklist-wrapper');
        let USFoodsDiv = document.querySelector('#order-checklist-US-Foods-label');
        let otherDiv = document.querySelector('#order-checklist-other-label');
        let row = document.createElement('div');
        row.classList.add('order-checklist-item-row');
        row.dataset.item = item;
        let check = document.createElement('input');
        check.type = 'checkbox';
        row.appendChild(check);
        let number = document.createElement('input');
        number.type = 'number';
        number.value = orderObj[item]['number'];
        number.classList.add('order-checklist-item-number-input');
        row.appendChild(number);
        let unit = document.createElement('p');
        unit.innerHTML = orderObj[item]['unit'];
        row.appendChild(unit);
        let name = document.createElement('p');
        name.innerHTML = item;
        row.appendChild(name);
        if(orderObj[item]['category'] === 'US Foods') {
            wrapper.insertBefore(row, USFoodsDiv.nextSibling);
        }
        else {
            wrapper.insertBefore(row, otherDiv.nextSibling);
        }
    }
    addEventListenersOrderChecklist('order-checklist-wrapper', 'order-checklist-item-row');
    loadingMessageOff();
}

/*  Function Description
    Creation Date: 8/21/2021
    Author: Ian Lubkin
    Purpose: Load the interface for inventory submission.
    Last Edit: 8/23/2021
*/
async function loadInventoryForm(uLoc = JSON.parse(localStorage.getItem('userLocation'))) {
    document.querySelector('#inventory-form-title').innerHTML = `${uLoc} Inventory`;
    loadingMessageOn('Fetching data for form');
    await updateSingleInventoryRecordLocal(0, uLoc);
    let lastInv = JSON.parse(localStorage.getItem('inventoryRecord'))[getDateString(0)][uLoc][JSON.parse(localStorage.getItem('inventoryRecord'))[getDateString(0)][uLoc]['last write']];
    console.log(lastInv);
    // await updateLocationsLocal();
    // let locationList = JSON.parse(localStorage.getItem('locationList'));
    await updateItemLocal();
    let itemLists = JSON.parse(localStorage.getItem('itemLists'));
    let wrapper = document.querySelector('#inventory-form-wrapper');
    let button = document.querySelector('#submit-inventory-form-button');
    let sandwichNode = document.querySelector('#inventory-form-sandwich-label');
    let otherNode = document.querySelector('#inventory-form-other-label');
    loadingMessageOff();
    for(let item in itemLists[uLoc]) {
        if(typeof(itemLists[uLoc][item]) !== 'object') {
            continue;
        } 
        let row = document.createElement('div');
        row.dataset.name = itemLists[uLoc][item]['name'];
        row.dataset.unit = itemLists[uLoc][item]['main-unit'];
        row.classList.add('inventory-item-row');
        let name  = document.createElement('p');
        name.innerHTML = itemLists[uLoc][item]['name'];
        row.appendChild(name);
        let unit  = document.createElement('p');
        unit.innerHTML = itemLists[uLoc][item]['main-unit'] + ':';
        row.appendChild(unit);
        let number = document.createElement('input');
        number.type = 'number';
        number.step = 0.1;
        number.min = 0;
        number.max = 999;
        number.value = lastInv[itemLists[uLoc][item]['name']];
        row.appendChild(number);
        if(itemLists[uLoc][item]['special-category'] === 'sandwich') {
            wrapper.insertBefore(row, sandwichNode.nextSibling);
        }
        else {
            wrapper.insertBefore(row, otherNode.nextSibling);
        }
    }
}



/*** Loading display handlers ***/
/*  Function Description
    Creation Date: 8/06/2021
    Author: Ian Lubkin
    Purpose: Display the passed loading message.
    Last Edit: 8/06/2021
*/
function loadingMessageOn(msgText = 'Please wait') {
    msgText = capitalizeFirstLetter(msgText);
    document.querySelector('#loading-message-text').innerHTML = msgText;
    document.querySelector('#loading-message').style.display = 'grid';

}

/*  Function Description
    Creation Date: 8/06/2021
    Author: Ian Lubkin
    Purpose: Hide the passed loading message.
    Last Edit: 8/06/2021
*/
function loadingMessageOff() {
    document.querySelector('#loading-message-text').innerHTML = 'Loading stuff';
    document.querySelector('#loading-message').style.display = 'none';
}

/*  Function Description
    Creation Date: 8/06/2021
    Author: Ian Lubkin
    Purpose: Display the passed loading message.
    Last Edit: 8/06/2021
*/
function showSuccessMessage(msgText = 'Success') {
    msgText = capitalizeFirstLetter(msgText) + '&#10003;';
    document.querySelector('#success-message-text').innerHTML = msgText;
    document.querySelector('#success-message').style.display = 'grid';
    window.setTimeout( () => { document.querySelector('#success-message').style.display = 'none'; }, 1200);
}



/****** Add event listeners ******/

/*** Input form ***/
document.querySelectorAll('#item-secondary-unit-add-button, #item-ingredient-add-button').forEach( (button) => { 
    button.addEventListener('click', addTwoInputRow); 
});
document.querySelector('#item-cancel-add-button').addEventListener('click', () => {
    document.querySelector('#item-edit-overlay-wrapper').style.display = 'none';
    document.querySelectorAll('#item-edit-wrapper input').forEach( (input) => { 
        input.value = '';
    });
    document.querySelector('#secondary-unit-name-input-1').value = 'none';
    document.querySelector('#ingredient-name-input-1').value = 'none';
    document.querySelectorAll('#item-other-units-input-wrapper > input, #item-ingredients-input-wrapper > input').forEach( (input) => {
        input.remove();
    });
});
document.querySelector('#item-clear-form-button').addEventListener('click', () => {
    document.querySelectorAll('#item-edit-wrapper input').forEach( (input) => { 
        input.value = '';
    });
    document.querySelector('#secondary-unit-name-input-1').value = 'none';
    document.querySelector('#ingredient-name-input-1').value = 'none';
    document.querySelectorAll('#item-other-units-input-wrapper > input, #item-ingredients-input-wrapper > input').forEach( (input) => {
        input.remove();
    });
});
document.querySelector('#item-add-button').addEventListener('click', (event) => {
    if(document.querySelector('#item-name-input').value !== "") { //later add more complex logic
        submitItemForm().then(loadItemList);
    }
} ); //if the function submitItemForm is passed as the event handler it will recieve 
     // the event as it's first variable, which will overwrite the userLocation.

/*** Login form ***/
document.getElementById('user-si-email').addEventListener('input', (event) => {
    if(checkUserEmail(event.target.value)) { //event.target.value gives the value of the input which the blur happened on
        document.getElementById("user-si-email-error").style.display = "block";
    }
    else {
        document.getElementById("user-si-email-error").style.display = "none";
    }
});
document.getElementById('user-si-password').addEventListener('input', (event) => {
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
            document.querySelector('#sign-out-button').style.display = '';
        });
    }
});
document.getElementById('user-sign-up').addEventListener('click', () => {
    document.getElementById('sign-in-form').style.display = 'none';
    document.getElementById('sign-up-form').style.display = 'grid';
});
document.getElementById('sign-in-button').addEventListener('click', () => {
    signIn().then( () => {
        document.querySelector('#sign-out-button').style.display = '';
    });
});
document.getElementById('sign-out-button').addEventListener('click', () => {
    signOut().then( () => {
        document.querySelector('#sign-out-button').style.display = 'none';
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

/*** Navigation Bar ***/ 
// document.querySelectorAll('.dropdown-content > p').forEach( (nav) => {
//     nav.addEventListener('click', (e) => {
//         console.log(e.target);
//         if(e.target.parentElement.style.display === 'none') {
//             e.target.parentElement.style.display = 'block';
//         }
//         else {
//             e.target.parentElement.style.display = 'none';
//         }
//     });
// });
//next block is to be moved to item view/edit page when it is created, and replaced by nav to that page
document.querySelector('#item-display-loader-button').addEventListener('click', () => {
    hideAllElements();
    document.querySelector('#item-display-wrapper').style.display = 'grid';
    loadItemList();
});
document.querySelector('#revenue-predictions-nav').addEventListener('click', () => {
    hideAllElements();
    loadRevenueInterface();
    document.querySelector('#revenue-interface-wrapper').style.display = 'grid';
});
document.querySelector('#prep-checklist-nav').addEventListener('click', () => {
    hideAllElements();
    loadPrepChecklist();
    document.querySelector('#prep-checklist-wrapper').style.display = 'grid';
});
document.querySelector('#inventory-form-nav').addEventListener('click', () => {
    hideAllElements();
    loadInventoryForm();
    document.querySelector('#inventory-form-wrapper').style.display = 'grid';
});

/*** Item display ***/
document.querySelector('#item-add-form-button').addEventListener('click', () => {
    document.querySelector('#item-edit-overlay-wrapper').style.display = 'flex';
});
document.querySelectorAll('.item-display-row > .item-display-options').forEach( (p) => { 
    console.log(p); 
});

/*** Revenue interface ***/
document.querySelector('#update-revenue-interface-button').addEventListener('click', submitRevenueInterface);

/*** Prep checklist ***/
function addEventListenersPrepChecklist(wrapperId, rowClass) {
    document.querySelectorAll('#' + wrapperId + ' div.' + rowClass).forEach( (elt) => {
        elt.addEventListener('click', (e) => {
            let row;
            if(e.target.classList.contains(rowClass)) {
                row = e.target;
            }
            else {
                row = e.target.parentElement;
            }
            if(e.target.type === 'checkbox' && !row.classList.contains('checked')) {
                row.classList.add('checked');
                row.children[0].checked = true;
            }
            else if(e.target.type === 'checkbox') {
                row.classList.remove('checked');
                row.children[0].checked = false;
            }
            else if(e.target.type !== 'checkbox' && e.target.type !== 'number' && !row.classList.contains('checked')) {
                row.classList.add('checked');
                row.children[0].checked = true;
            }
            else if(e.target.type !== 'number') {
                row.classList.remove('checked');
                row.children[0].checked = false;
            }
        });
    });
}
document.querySelector('#minimum-prep-date-input').addEventListener('change', (e) => {
    let todayNum = new Date();
    todayNum.setHours(0,0,0,0);
    let prepNum = new Date(e.target.value);
    prepNum.setHours(0,0,0,0);
    let offset = Math.floor((prepNum.getTime() - todayNum.getTime())/ (1000 * 3600 * 24)*1)/1;
    
    loadPrepChecklist(offset);
});
document.querySelector('#submit-prep-checklist-button').addEventListener('click', () => {
    submitPrepChecklist();
});
/*Order form*/
function addEventListenersOrderChecklist(wrapperId, rowClass) {
    document.querySelectorAll('#' + wrapperId + ' div.' + rowClass).forEach( (elt) => {
        elt.addEventListener('click', (e) => {
            let row;
            if(e.target.classList.contains(rowClass)) {
                row = e.target;
            }
            else {
                row = e.target.parentElement;
            }
            if(e.target.type === 'checkbox' && !row.classList.contains('checked')) {
                row.classList.add('checked');
                row.children[0].checked = true;
            }
            else if(e.target.type === 'checkbox') {
                row.classList.remove('checked');
                row.children[0].checked = false;
            }
            else if(e.target.type !== 'checkbox' && e.target.type !== 'number' && !row.classList.contains('checked')) {
                row.classList.add('checked');
                row.children[0].checked = true;
            }
            else if(e.target.type !== 'number') {
                row.classList.remove('checked');
                row.children[0].checked = false;
            }
        });
    });
}

/* Inventory form */
document.querySelector('#submit-inventory-form-button').addEventListener('click', () => {
    submitInventoryForm();
});

/*  Function Description
    Creation Date: 
    Author: Ian Lubkin
    Purpose: 
    Last Edit: 
*/