//Data handling functions
class item {
    constructor(name, quantNeeded = 0, quantPresent = 0, unit = 'none', location = 'unknown', dollarToQuant = '0', inUse = false) {
        this.name = name;
        this.quantNeeded = quantNeeded;
        this.quantPresent = quantPresent;
        this.unit = unit;
        this.taken = false;
        this.location = location;
        this.dollarToQuant = dollarToQuant;
        this.inUse = inUse;
    }
}

var database = firebase.database();
var itemSearch = database.ref().child('items').orderByChild('name');
var preppedItemListSearch = database.ref().child('item-list').orderByChild('type').startAt('prepared item').endAt('purchased item');
var locationSearch = database.ref().child('locations');
var sandwichSearch = database.ref().child('sandwiches');
var revenueSearch = database.ref().child('revenue-predictions');
var cashRecordSearch = database.ref().child('cash-record');
var items = null;
var preppedItemList = null;
var locations = null;
var itemChecklist = null;
var yesterdayItemChecklist = null;
var sandwichChecklist = null;
var sandwiches = null;
var revenues = {};
var cashRecord = {};
var notesRecord = {};
var curUserFirstName = 'null';
var permittedEmails = null;
var altrevenuePredictions = {};
var userLocation = 'settlers-green'; //later pull from user info for default
var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

function spaceToDash(instr) {
    return instr.replace(/\s+/g, '-');
}

function dashToSpace(instr) {
    return instr.replace(/-/g, ' ');
}

function getDateString(offset = 0) {
    var today = new Date();
    var ddnum = today.getDate() + offset;
    var mmnum = today.getMonth() + 1;
    var yyyynum = today.getFullYear();
    if(ddnum > daysInMonth(mmnum, yyyynum)) {
        ddnum -= daysInMonth(mmnum, yyyynum);
        mmnum++;
    }
    if(ddnum < 1) {
        mmnum--;
        ddnum = daysInMonth(mmnum, yyyynum) + ddnum;
    }
    var dd = String(ddnum).padStart(2, '0');
    var mm = String(mmnum).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    today = mm + '-' + dd + '-' + yyyy;

    return today;
}

function getWeekStringHTMLInputWeek(d) { //Can remove (?check for uses) from: https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    // Return array of year and week number
    return String(d.getUTCFullYear()) + '-W' + String(weekNo);
}

async function readItemsFB() {
    await itemSearch.once('value', (snapshot) => {
        //ADD a function to display 'loading' while loading data
        items = snapshot.val();
    }); //Now ASYNC!
}

async function readItemListFB() {
    await preppedItemListSearch.once('value', (snapshot) => {
        preppedItemList = snapshot.val();
    });
}

async function readLocationsFB() {
    await locationSearch.once('value', (snapshot) => {
        locations = snapshot.val();
    });
    for(loc in locations){
        if(locations[loc] !== 'active') {
            delete locations[loc];
        }
    }
}

async function readItemChecklistFB() {
    var today = new Date();
    today = getDateString();
    await database.ref().child('inventory-record/' + today).once('value', (snapshot) => {
        itemChecklist = snapshot.val();
    });
}

async function readYesterdayItemChecklistFB() {
    var yesterday = new Date();
    yesterday = getDateString(-1);
    await database.ref().child('inventory-record/' + yesterday).once('value', (snapshot) => {
        yesterdayItemChecklist = snapshot.val();
    });
}

async function readSandwichChecklistFB(dayOffset = 0, locSelector = userLocation) {
    var today = new Date();
    today = getDateString(dayOffset);
    await database.ref().child('inventory-record/' + today + '/' + locSelector + '/sandwiches').once('value', (snapshot) => {
        sandwichChecklist = snapshot.val();
    });
}

async function readSandwichesFB() {
    await sandwichSearch.once('value', (snapshot) => {
        sandwiches = snapshot.val();
    });
}

async function readRevenuesFB() {
    await revenueSearch.once('value', (snapshot) => {
        revenues = snapshot.val();
    });
}

// async function readCashRecordFB(dayOffset = 0) {
//     var today = new Date();
//     today = getDateString(dayOffset);
//     await database.ref().child('inventory-record/' + today).once('value', (snapshot) => {
//         cashRecord = snapshot.val();
//     });
// } Do I need this? I should instead: have the updater check if it exists, if it doesn't then write zeros
// and if it does check it's status, if it's newer then pull. Always update the global variable (or local?) from local storage

async function readPermittedEmailsFB() {
    await database.ref().child('permitted-emails').once('value', (snapshot) => {
        permittedEmails = snapshot.val();
    });
}

async function writeItemChecklistFB(dayOffset = 0) { //need to fix to check if already written
    await readItemListFB().then( () => { 
        return readLocationsFB();
    }).then( () => { 
        return readSandwichesFB();
    }).then( () => { //removed: .then( () => { return readRevenuesFB(); }) because the next function fills it's place
        return updateRevenuePredictionsLocal();
    });
    await updateItemChecklistLocal();
    var today = new Date();
    var weekday = today.getDay() + dayOffset;
    today = getDateString(dayOffset);
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1) + dayOffset);
    var revenue = 0;
    // var EODset = 0;
    const dbRef = firebase.database().ref();
    var revenueWrite = null;
    var checklistWrite = null;
    // var locSelector = 'settlers-green';//later, itterate through all locations, or pass as arg
    await dbRef.child('revenue-predictions').child(thisMon).child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            revenueWrite = Number(snapshot.val());
        } else {
            updateRevenuePredictionsLocal().then( () => {
                console.log("Error reading from last-write of revenue-predictions: No data available, zeros written, try again");
            });
        }
    }).catch((error) => {
        console.error(error);
    });
    await dbRef.child('inventory-record').child(today).child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            checklistWrite = Number(snapshot.val());
        } else {
            console.log("Error reading from last-write of inventory-record: No data available");
        }
    }).catch((error) => {
        console.error(error);
    });
    for(locSelector in locations) {
        // the following 10 lines update outdated revenue predictions
        revenue = revenues[thisMon][locSelector][weekdays[weekday]];
        if(checklistWrite < revenueWrite) {
            for(var i in preppedItemList) {
                        if(typeof(preppedItemList[i]) !== 'object') {
                            continue;
                        }
                        itemChecklist[locSelector][i]['SODinventory'] = preppedItemList[i].dollarToQuant*revenue;
                    }
        }
        await database.ref('/inventory-record/'+today).set(itemChecklist);       
    }
}

function writeItemLocal(i) {

}

async function updateItemListLocal() {
    //Date.parse(string) will turn a date string from Date.toString() into an integer value
    var today = new Date();
    today = Date.parse(today.toString());
    var lastRead = 0;
    var lastWrite = new Date();
    const dbRef = firebase.database().ref();

    await dbRef.child("item-list").child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            console.log("Error reading from last-write of item-list: No data available");
        }
        }).catch((error) => {
            console.error(error);
    });
    if(localStorage.getItem('preppedItemList') !== null) {
        lastRead = Number(JSON.parse(localStorage.getItem('preppedItemList'))['last-write']);
    }
    if(lastRead < lastWrite) /*local object is outdated*/ {
        await localStorage.setItem('preppedItemList', JSON.stringify(preppedItemList));
    }
}

async function altupdateRevenuePredictionLocal(offset = 0) {
    var lastRead = 0;
    var lastWrite = Date.parse(new Date());
    var dayString = getDateString(offset);
    var dayNumber = Date.parse(new Date());
    const dbRef = firebase.database().ref();

    if(JSON.parse(localStorage.getItem('altrevenuePredictions'))[dayString] !== undefined) {
        lastRead = Number(JSON.parse(localStorage.getItem('altrevenuePredictions'))[dayString]['last-write']);
    }
    await readLocationsFB(); //should swap with a local update function
    await dbRef.child('altrevenue-predictions').child(dayString).child('last-write').get().then((snapshot) => {
        if(snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        }
        else { //no data has been written anywhere
            lastWrite = 0;
            altrevenuePredictions[dayString] = {
                "last-write": dayNumber,
            };
            for(loc in locations) {
                altrevenuePredictions[dayString][loc] = 0;
            }

            database.ref('/altrevenue-predictions/'+dayString).set(altrevenuePredictions[dayString]);
            console.log("Error reading from last-write of altrevenue-predictions: No data available, zeros written");
        }
    });
    if(lastRead < lastWrite) { //local storage is outdated
        await dbRef.child("altrevenue-predictions").child(dayString).get().then( (snapshot) => {
            if (snapshot.exists()) {
                altrevenuePredictions[dayString] = snapshot.val();
            } else {
                console.log("Error reading from last-write of item-list: No data available.");
            }
            }).catch((error) => {
                console.error(error);
        });
        localStorage.setItem('altrevenuePredictions', JSON.stringify(altrevenuePredictions));
        altrevenuePredictions = JSON.parse(localStorage.getItem('altrevenuePredictions'));
    }
    else {
        altrevenuePredictions = JSON.parse(localStorage.getItem('altrevenuePredictions'));
    }
}

async function updateRevenuePredictionsLocal() {
    var today = new Date();
    var weekday = today.getDay();
    today = Date.parse(today.toString());
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1));
    var lastRead = 0;
    var lastWrite = Date.parse(new Date());
    const dbRef = firebase.database().ref();

    if(localStorage.getItem('revenuePredictions') !== null && JSON.parse(localStorage.getItem('revenuePredictions'))[thisMon] !== undefined) {
        lastRead = Number(JSON.parse(localStorage.getItem('revenuePredictions'))[thisMon]['last-write']);
    }
    await readLocationsFB();
    await dbRef.child("revenue-predictions").child(thisMon).child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            lastWrite = 0;
            revenues[thisMon] = {};
            for(l in locations) {
                console.log(l);
                revenues[thisMon][l] = {};
                if(locations[l] == 'active') {
                    for(day in weekdays) {
                        revenues[thisMon][l][weekdays[day]] = 0;
                    }
                }
            }
            revenues[thisMon]['last-write'] = Date.parse(new Date(today));
            console.log("Error reading from last-write of revenue-predictions: No data available");
        }
        }).catch((error) => {
            console.error(error);
    });
    await readRevenuesFB();
    await database.ref('/revenue-predictions/'+thisMon).set(revenues[thisMon]);

    console.log("Last read: " + lastRead + " Last write: " + lastWrite);
    if(lastRead < lastWrite) {
        await readRevenuesFB().then( () => {
             localStorage.setItem('revenuePredictions', JSON.stringify(revenues));
        });
    }
}

async function updateItemChecklistLocal(date = 0) { //need to add feature to update if revenue changed
    if(date === 0) {
        var today = new Date();
        today.setHours(0,0,0,0);
    }
    else {
        var today = new Date(date);
        today.setHours(0,0,0,0);
    }
    //
    //here 'today' represents the passed date, while 'curDay' represents the current day 
    var weekday = today.getDay();
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1));
    var curDay = new Date();
    curDay.setHours(0,0,0,0);
    var offset = Math.floor((today.getTime() - curDay.getTime())/ (1000 * 3600 * 24)*1)/1;
    today = getDateString(offset);
    var lastRead = 0;
    var lastWrite = new Date();
    const dbRef = firebase.database().ref();

    if(localStorage.getItem('itemChecklist') !== null && JSON.parse(localStorage.getItem('itemChecklist'))[today] !== undefined) {
        lastRead = Number(JSON.parse(localStorage.getItem('itemChecklist'))[today]['last-write']);
    }
    await readLocationsFB();
    await dbRef.child("inventory-record").child(today).child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            lastWrite = 0;
            console.log("Error reading from last-write of revenue-predictions: No data available");
        }
        }).catch((error) => {
            console.error(error);
    });
    await readItemListFB();
    await readLocationsFB();
    var revenue = 0;
    if(lastWrite == 0) {
        itemChecklist = {};
        for(locSelector in locations) {
            revenue = revenues[thisMon][locSelector][weekdays[weekday]];
            itemChecklist[locSelector] = {};    
            for(var i in preppedItemList) {
                if(typeof(preppedItemList[i]) !== 'object') {
                    continue;
                }
                
                itemChecklist[locSelector][i] = {
                    name: preppedItemList[i].name,
                    unit: preppedItemList[i].unit,
                    dollarToQuant: preppedItemList[i].dollarToQuant,
                    SODinventory: (preppedItemList[i].dollarToQuant*revenue),
                    EODinventory: 0, //add at eod
                    location: preppedItemList[i].location,
                    taken: false,
                    offset: 0,
                };
            }
            await readSandwichesFB();
            await readSandwichChecklistFB();
            if(sandwichChecklist == null) {
                itemChecklist[locSelector]['sandwiches'] = {};
                for(var sandwich in sandwiches) {
                    sandwiches[sandwich].EODinventory = 0;
                    sandwiches[sandwich].SODinventory = 0;
                    if(sandwiches[sandwich].bringing == null) {
                        sandwiches[sandwich].bringing = 0;
                    }
                    //add logic to pull from yesterday
                    itemChecklist[locSelector]['sandwiches'][sandwich] = sandwiches[sandwich];
                }
            }
        }
        itemChecklist['last-write'] = Date.parse(new Date());
        await database.ref('/inventory-record/'+today).set(itemChecklist);
        localStorage.setItem('itemChecklist', JSON.stringify(itemChecklist));
    }
    if(lastRead < lastWrite) {
        await readItemChecklistFB().then( () => {
             localStorage.setItem('itemChecklist', JSON.stringify(itemChecklist));
        });
    }
}

async function updateCashRecordLocal() {
    var today = new Date();
    today = Date.parse(today.toString());
    var todayString = getDateString();
    var lastRead = 0;
    var lastWrite = Date.parse(new Date());
    const dbRef = firebase.database().ref();

    await readLocationsFB();

    await dbRef.child("cash-record").child(todayString).child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } else {
            //add logic to set to zero
            lastWrite = 0;
            cashRecord = {
                'last-write': today,
            };
            for(locSelector in locations) {
                cashRecord[locSelector] = {
                    'cash-collected': 0,
                    'cash-revenue': 0,
                    'cash-tips': 0,
                    'difference': 0,
                };
            }
            dbRef.child("cash-record").child(todayString).set(cashRecord);
            console.log("Error reading from last-write of item-list: No data available. Zeros written.");
        }
        }).catch((error) => {
            console.error(error);
    });
    if(JSON.parse(localStorage.getItem('cashRecord')) !== null) {
        lastRead = Number(JSON.parse(localStorage.getItem('cashRecord'))['last-write']);
    }
    if(lastRead < lastWrite) /*local object is outdated*/ {
        await dbRef.child("cash-record").child(todayString).get().then((snapshot) => {
            if (snapshot.exists()) {
                cashRecord = snapshot.val();
            } else {
                console.log("Error reading from last-write of item-list: No data available.");
            }
            }).catch((error) => {
                console.error(error);
        });
        localStorage.setItem('cashRecord', JSON.stringify(cashRecord));
        cashRecord = JSON.parse(localStorage.getItem('cashRecord'));
    }
    else {
        cashRecord = JSON.parse(localStorage.getItem('cashRecord'));
    }
}

async function updateNotesRecordLocal(offset = 0, locSelector = userLocation) {
    var todayNumber = Date.parse(getDateString(offset));
    var todayString = getDateString(offset);
    var lastRead = 0;
    var lastWrite = Date.parse(new Date());
    const dbRef = firebase.database().ref();

    await readLocationsFB();
    if(localStorage.getItem('notesRecord')!==null) {
        //the local storage item exists
        notesRecord = JSON.parse(localStorage.getItem('notesRecord'));
        if(JSON.parse(localStorage.getItem('notesRecord'))[todayString]!==undefined) {
            //local storage item has a today record
            lastRead = JSON.parse(localStorage.getItem('notesRecord'))[todayString]['last-write'];
        }
    }

    await dbRef.child("notes-record").child(todayString).child('last-write').get().then((snapshot) => {
        if (snapshot.exists()) {
            lastWrite = Number(snapshot.val());
        } 
        else {
            //add logic to set to blank
            lastWrite = 0;
            notesRecord[todayString] = {
                'last-write': todayNumber,
            };
            notesRecord[todayString][locSelector] = {};
            notesRecord[todayString][locSelector][todayNumber] = {
                'note-text': '',
                'uFirstName': 'no notes',
                'written': todayNumber,
            }
            dbRef.child("notes-record").child(todayString).child(locSelector).set(notesRecord[todayString][locSelector]);
            dbRef.child("notes-record").child(todayString).child('last-write').set(todayNumber);
            console.log("Error reading from last-write of notes: No data available. Empty data written.");
        }
    }).catch((error) => {
        console.error(error);
    });
    if(lastWrite === 0) {
        //handle zero write
        await database.ref().child('notes-record/' + todayString + '/' + locSelector).once('value', (snapshot) => {
            notesRecord[todayString][locSelector] = snapshot.val();
        });
        localStorage.setItem('notesRecord', JSON.stringify(notesRecord));
    }
    else if(lastRead < lastWrite) { //the notes have been updated since last read
        //update object
        notesRecord[todayString] = {
            'last-write': todayNumber,
        };
        notesRecord[todayString][locSelector] = {};
        await database.ref().child('notes-record/' + todayString + '/' + locSelector).orderByChild('written').limitToLast(1).once('value', (snapshot) => {
            notesRecord[todayString][locSelector] = snapshot.val();
        });
        localStorage.setItem('notesRecord', JSON.stringify(notesRecord));
    }
    else if(notesRecord[todayString][locSelector] == undefined) { //the notes were present and haven't been updated, but the current location is not in the local storage
        notesRecord[todayString][locSelector] = {};
        await database.ref().child('notes-record/' + todayString + '/' + locSelector).orderByChild('written').limitToLast(1).once('value', (snapshot) => {
            notesRecord[todayString][locSelector] = snapshot.val();
        });
        localStorage.setItem('notesRecord', JSON.stringify(notesRecord));
    }
}

function writeTemplateItemFB(i) {
    database.ref('/item-list/'+i.name).set({
        name: i.name,
        unit: i.unit,
        location: i.location,
        dollarToQuant: i.dollarToQuant,
        type: i.type,
        inUse: i.inUse,
    });
}

//readItemsFB().then( () => {pageInfoLoader();});
//var beans = new item('beans', 1, 0, 'cans');
//writeItemFB(beans);



firebase.auth().onAuthStateChanged( function(user) {
    if (user) {
        hideAllForms();
        pageInfoLoader();
        var uid = user.uid;
        var primaryLocation = 'settlers-green';
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
        hideAllForms();
        // No user is signed in.
    }
  });

//User Authentication
const userSIEmail = document.getElementById('userSIEmail');
const userSIPassword = document.getElementById('userSIPassword');
const userSignUp = document.getElementById('userSignUp');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const signInForm = document.getElementById('signInForm');
const userFirstName = document.getElementById('userFirstName');
const userLastName = document.getElementById('userLastName');
const userEmail = document.getElementById('userEmail');
const userPassword = document.getElementById('userPassword');
const signUpButton = document.getElementById('signUpButton');
const signUpForm = document.getElementById('signUpForm');
const userSignIn = document.getElementById('userSignIn');

userSIEmail.addEventListener('blur', () => {
    checkUserSIEmail();
});
// userSIEmail.addEventListener('input', () => {
//     checkUserSIEmail();
// });
userSIPassword.addEventListener('blur', () => {
    checkUserSIPassword();
});
// userSIPassword.addEventListener('input', () => {
//     checkUserSIPassword();
// });
userSIPassword.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        signIn().then( () => {
            document.querySelector('#signOutButton').style.display = 'flex';
        });
    }
});
userSignUp.addEventListener('click', () => {
    //add logic to hide sign in page and display sign up page
    signInForm.style.display = 'none';
    signUpForm.style.display = 'flex';
});
signInButton.addEventListener('click', () => {
    signIn().then( () => {
        document.querySelector('#signOutButton').style.display = 'flex';
    });
});
signOutButton.addEventListener('click', () => {
    signOut().then( () => {
        document.querySelector('#signOutButton').style.display = 'none';
    });
});
// userFirstName.addEventListener('blur', () => {
//     checkUserFirstName();
// });
// userLastName.addEventListener('blur', () => {
//     checkUserLastName();
// });
userEmail.addEventListener('blur', () => {
    checkUserEmail();
});
userPassword.addEventListener('blur', () => {
    checkUserPassword();
});
signUpButton.addEventListener('click', () => {
    signUp();
});
userSignIn.addEventListener('click',  () => {
    signUpForm.style.display = 'none';
    signInForm.style.display = 'flex';
});
// xxxxxxxxxx Sign In Email Validation xxxxxxxxxx
function checkUserSIEmail(){
    // var userSIEmail = document.getElementById("userSIEmail");
    var userSIEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var flag;
    if(userSIEmail.value.match(userSIEmailFormat)){
        flag = false;
    }else{
        flag = true;
    }
    if(flag){
        document.getElementById("userSIEmailError").style.display = "block";
    }else{
        document.getElementById("userSIEmailError").style.display = "none";
    }
}
// xxxxxxxxxx Sign In Password Validation xxxxxxxxxx
function checkUserSIPassword(){
    // var userSIPassword = document.getElementById("userSIPassword");
    var userSIPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      
    userSIPasswordFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var flag;
    if(userSIPassword.value.match(userSIPasswordFormat)){
        flag = false;
    }else{
        flag = true;
    }    
    if(flag){
        document.getElementById("userSIPasswordError").style.display = "block";
    }else{
        document.getElementById("userSIPasswordError").style.display = "none";
    }
}
// xxxxxxxxxx Check email or password exsist in firebase authentication xxxxxxxxxx 
async function signIn(){
    var userSIEmail = document.getElementById("userSIEmail").value;
    var userSIPassword = document.getElementById("userSIPassword").value;
    var userSIEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var userSIPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      

    var checkUserEmailValid = userSIEmail.match(userSIEmailFormat);
    var checkUserPasswordValid = userSIPassword.match(userSIPasswordFormat);

    if(checkUserEmailValid == null){
        return checkUserSIEmail();
    }else if(checkUserPasswordValid == null){
        return checkUserSIPassword();
    }else{
        firebase.auth().signInWithEmailAndPassword(userSIEmail, userSIPassword).then((success) => {
            //alert('Succesfully signed in');
            setTimeout(function() {
                signInForm.style.display = 'none';
            }, 100);
            }).catch((error) => {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            alert(`Sign in error ${errorCode}: ${errorMessage}`)
        });
    }
}
// xxxxxxxxxx Working For Sign Out xxxxxxxxxx
async function signOut(){
    firebase.auth().signOut().then(function() {
        // Sign-out successful.
        //alert('Signed Out');
            setTimeout(function(){
                signInForm.style.display = 'flex';
            }, 100 );
    }).catch(function(error) {
        // An error happened.
        let errorMessage = error.message;
        alert(`error: ${errorMessage}`)
    });
}
// xxxxxxxxxx First Name Validation xxxxxxxxxx
function checkUserFullName(){
    // var uFirstName = document.getElementById("userFirstName").value;
    var flag = false;
    if(uFirstName === ""){
        flag = true;
    }
    if(flag){
        document.getElementById("userFirstNameError").style.display = "block";
    }else{
        document.getElementById("userFirstNameError").style.display = "none";
    }
}
// xxxxxxxxxx User Surname Validation xxxxxxxxxx
function checkUserSurname(){
    // var uLastName = document.getElementById("userLastName").value;
    var flag = false;
    if(uLastName === ""){
        flag = true;
    }
    if(flag){
        document.getElementById("userLastNameError").style.display = "block";
    }else{
        document.getElementById("userLastNameError").style.display = "none";
    }
}
// xxxxxxxxxx Email Validation xxxxxxxxxx
function checkUserEmail(){
    // var userEmail = document.getElementById("userEmail");
    var userEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var flag;
    if(userEmail.value.match(userEmailFormat)){
        flag = false;
    }else{
        flag = true;
    }
    if(flag){
        document.getElementById("userEmailError").style.display = "block";
    }else{
        document.getElementById("userEmailError").style.display = "none";
    }
}
// xxxxxxxxxx Password Validation xxxxxxxxxx
function checkUserPassword(){
    // var userPassword = document.getElementById("userPassword");
    var userPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      
    var flag;
    if(userPassword.value.match(userPasswordFormat)){
        flag = false;
    }else{
        flag = true;
    }    
    if(flag){
        document.getElementById("userPasswordError").style.display = "block";
    }else{
        document.getElementById("userPasswordError").style.display = "none";
    }
}
// xxxxxxxxxx Submitting and Creating new user in firebase authentication xxxxxxxxxx
//!!NEED to add verification that the email is on an approved list
async function signUp(){
    await readPermittedEmailsFB();
    var uFirstName = document.getElementById("userFirstName").value;
    var uLastName = document.getElementById("userLastName").value;
    var uEmail = document.getElementById("userEmail").value;
    var uPassword = document.getElementById("userPassword").value;
    var flag = false;
    for(email in permittedEmails) {
        if(permittedEmails[email] == uEmail) {
            flag = true;
        }
    }
    var userFullNameFormat = /^([A-Za-z.\s_-])/;    
    var userEmailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var userPasswordFormat = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{10,}/;      

    var checkUserFullNameValid = uFirstName.match(userFullNameFormat);
    var checkUserEmailValid = uEmail.match(userEmailFormat);
    var checkUserPasswordValid = uPassword.match(userPasswordFormat);

    if(checkUserFullNameValid == null){
        return checkUserFullName();
    }else if(uLastName === ""){
        return checkUserSurname();
    }else if(checkUserEmailValid == null){
        return checkUserEmail();
    }else if(checkUserPasswordValid == null){
        return checkUserPassword();
    }else if(flag == false){
        alert("Permissions not granted for this email")
        return false;
    }else{
        firebase.auth().createUserWithEmailAndPassword(uEmail, uPassword).then((success) => {
            var user = firebase.auth().currentUser;
            var uid;
            if (user != null) {
                uid = user.uid;
            }
            var firebaseRef = firebase.database().ref();
            var userData = {
                uFirstName: uFirstName,
                uLastName: uLastName,
                uEmail: uEmail,
            }
            firebaseRef.child('users').child(uid).set(userData);
            alert('Account Created','Your account was created successfully, you are logged in now.',
            )
                setTimeout(function(){
                    signUpForm.style.display = 'none';
                }, 100);
        }).catch((error) => {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            alert(`error ${errorCode}: ${errorMessage}`)
        });
    }
}

//DOM manipulation functions
async function pageInfoLoader() {
//current idea is to have it call dif. fn's from below based on time, date, role, location
    hideAllForms();
    document.querySelector('#page-loading-display').style.display = 'flex';
    //readItemsFB().then( () => { itemChecklistLoader(); });
    if(firebase.auth().currentUser) {
        signInForm.style.display = 'none';
        document.querySelector('#signOutButton').style.display = 'flex';
        /* I'd like to change to local storage generally, and only load from 
        firebase once, checking the local storage each time for it being up to
        date for today.
        */
        writeItemChecklistFB().then( () => {
            return readItemChecklistFB();
        }).then( () => {
            return readYesterdayItemChecklistFB();
        }).then( () => {
            if(yesterdayItemChecklist == null) {
                return writeItemChecklistFB(-1);
            }
            return;
        }).then( () => {
            return readRevenuesFB();
        }).then( () => {
            return readLocationsFB();
        }).then( () => {
            return roleLocationLoader();
        }).then( () => {
            document.querySelector('#page-loading-display').style.display = 'none';
            return sandwichChecklistLoader();
        });
    }
}

function hideAllForms() {
    //hide every form before showing wanted one
    specialForms = document.querySelectorAll('.special-form');
    specialForms.forEach( (specialForm) => {
        specialForm.style.display = 'none';
    });
}

function roleLocationLoader(){
    document.querySelector('#role-loc-dialogue').style.display = 'inline';
    for(loc in locations) {
        var skip = false;
        document.querySelectorAll('option').forEach( (opt) => {
            if(opt.value === loc) {
                skip = true;
            }
        });
        if(!skip) {
            var newLoc = document.createElement('option');
            newLoc.value = loc;
            newLoc.innerHTML = dashToSpace(loc);
            document.querySelector('#loc-selector').add(newLoc);
        }
    }
    document.querySelector('#loc-selector').value = userLocation;
}

async function sandwichChecklistLoader() {
    await updateItemChecklistLocal();
    await readItemChecklistFB();
    await readSandwichChecklistFB();
    var sandwichTBody = document.querySelector('#sandwich-checklist-tbody');
    document.querySelector('#sandwich-checklist').style.display = 'flex';
    var locSelector = userLocation;
    var today = new Date();
    var weekday = today.getDay();
    today = getDateString();
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1));
    var revenue = revenues[thisMon][locSelector][weekdays[weekday]];
    if(document.querySelector('#sandwich-checklist-table').caption.innerHTML !== userLocation) {
            var blankTBody = document.createElement('tbody');
            blankTBody.id = 'sandwich-checklist-tbody';
            sandwichTBody.parentNode.replaceChild(blankTBody, sandwichTBody);
            sandwichTBody = blankTBody;
    }
    for(var i in itemChecklist[locSelector]['sandwiches']) {
        var SODinventory = itemChecklist[locSelector]['sandwiches'][i]['SODinventory'];
        var EODinventory = null;
        if(yesterdayItemChecklist[locSelector]['sandwiches'][i] === undefined) {
            EODinventory = 0;
        }
        else {
            EODinventory = yesterdayItemChecklist[locSelector]['sandwiches'][i]['EODinventory'];
        }
        var skip = false;
        
        document.querySelectorAll('tr.checklist-sandwich').forEach( (item) => {
            if ((dashToSpace(item.id) === itemChecklist[locSelector]['sandwiches'][i].name) ) { 
                skip = true;
            }
        });
        if(skip==false && (sandwiches[i]['inUse'])==true) {
            var newRow = document.createElement('tr');
            var newName = document.createElement('td');
            newName.innerHTML = itemChecklist[locSelector]['sandwiches'][i]['name'];
            newRow.appendChild(newName);
            var quantBringing = document.createElement('input');
            quantBringing.type = 'number';
            quantBringing.min = 0;
            quantBringing.max = 999;
            quantBringing.value = itemChecklist[locSelector]['sandwiches'][i]['bringing'];
            newRow.appendChild(quantBringing);
            var newInventory = document.createElement('td'); //get from EOD yesterday
            newInventory.innerHTML = EODinventory;
            newRow.appendChild(newInventory);
            var newNeed = document.createElement('td'); //get from EOD yesterday
            newNeed.innerHTML = Math.ceil(revenue*Number(itemChecklist[locSelector]['sandwiches'][i]['dollarToQuant']));
            newRow.appendChild(newNeed);
            newRow.classList.add('checklist-sandwich');
            newRow.id = spaceToDash(itemChecklist[locSelector]['sandwiches'][i]['name']);
            sandwichTBody.appendChild(newRow);
        }
    }
    document.querySelector('#sandwich-checklist-table').caption.innerHTML = dashToSpace(locSelector);
}

// var new_tbody = document.createElement('tbody');
// populate_with_new_rows(new_tbody);
// old_tbody.parentNode.replaceChild(new_tbody, old_tbody)

async function sandwichChecklistSubmit() {
    var sandwichTBody = document.querySelector('#sandwich-checklist-tbody');
    var locSelector = userLocation;
    var today = getDateString();
    for(var i = 0, row; row = sandwichTBody.rows[i]; i++) {
        var todayCount = Number(row.childNodes[1].value);
        itemChecklist[locSelector]['sandwiches'][dashToSpace(row.id)]['bringing'] = Number(row.childNodes[1].value);
        await database.ref('/inventory-record/'+today+'/'+locSelector+'/sandwiches/'+dashToSpace(row.id)).update({
            bringing:  Number(row.childNodes[1].value),
        });
        var yesterdayCount = Number(row.childNodes[2].innerHTML);
        var sandwichName = dashToSpace(row.id);
        var maxNeed = Number(row.childNodes[3].innerHTML);
        var offsetCount = ((todayCount+yesterdayCount) < maxNeed ? (todayCount+yesterdayCount) : maxNeed);
        for(var j in sandwiches[sandwichName]) {
            if(itemChecklist[locSelector][j] !== undefined) {
                var offsetv = Number(itemChecklist[locSelector][j]['offset']) + offsetCount*Number(sandwiches[sandwichName][j]);
                itemChecklist[locSelector][j]['offset'] = offsetv;
                await database.ref('/inventory-record/'+today+'/'+locSelector+'/'+j).update({
                    offset: offsetv,
                });
            }
        }
    }
    document.querySelector('#sandwich-checklist').style.display = 'none';
    itemChecklistLoader();
//     database.ref('/inventory-record/'+today+'/'+locSelector+'/'+dashToSpace(row.id)).update({
//         taken: updateObj[dashToSpace(row.id)]['taken'],
//    });

}

function itemChecklistLoader() {
    //Need to add a heads up for items where we've got a ton of that pre-prep
    //Making the row red with a message would be good, so people can know they 
    //may not need the item
    var tableBody = document.querySelector('#item-checklist-tbody');
    document.querySelector('#item-checklist').style.display = 'flex';
    var locSelector = userLocation;
    if(document.querySelector('#item-checklist-table').caption.innerHTML !== userLocation ||
        document.querySelector('#item-checklist-table').dataset.write != itemChecklist[lastWrite]) {
        var blankTBody = document.createElement('tbody');
        blankTBody.id = 'item-checklist-tbody';
        tableBody.parentNode.replaceChild(blankTBody, tableBody);
        tableBody = blankTBody;
    }

    for(var i in itemChecklist[locSelector]) { //pass location as variable
        var skip = false;
        document.querySelectorAll('tr.checklist-item').forEach( (item) => {
            if (dashToSpace(item.id) === itemChecklist[locSelector][i].name
                || i == 'sandwiches') {
                skip = true;
            }
        });
        if( skip==false && (preppedItemList[i]['inUse'])==true) {
            var SODinventory = itemChecklist[locSelector][i]['SODinventory'];
            var EODinventory = null;
            var offset = itemChecklist[locSelector][i]['offset']
            if(yesterdayItemChecklist[locSelector][i] === undefined) {
                EODinventory = 0;
            }
            else {
                EODinventory = yesterdayItemChecklist[locSelector][i]['EODinventory'];
            }
            var quantNeeded = Math.ceil((SODinventory-EODinventory-offset  > 0 ? SODinventory-EODinventory-offset : 0).toFixed(1));
            //the next two if statements temporarily fix cash inventory numbers
            if(i == '1 dollar') {
                (locSelector == 'commissary' ? quantNeeded = 500-EODinventory : quantNeeded = 100-EODinventory);
            }
            if(i == '5 dollar') {
                (locSelector == 'commissary' ? quantNeeded = 100-EODinventory : quantNeeded = 20-EODinventory);
            }
            var newRow = document.createElement('tr');
            var newCheckbox = document.createElement('input');
            newCheckbox.type = 'checkbox';
            if(quantNeeded <= 0 || (itemChecklist[locSelector][i]['taken'])==true) {
                newCheckbox.checked = true;
                newRow.classList.add('checked');
            }
            newCheckbox.id = spaceToDash(itemChecklist[locSelector][i]['name'] + '-checkbox');
            newRow.appendChild(newCheckbox);
            var newName = document.createElement('td');
            newName.innerHTML = itemChecklist[locSelector][i]['name'];
            newRow.appendChild(newName);
            var newQuantNeeded = document.createElement('td'); 
            newQuantNeeded.innerHTML = quantNeeded;
            newRow.appendChild(newQuantNeeded);
            var newUnit = document.createElement('td');
            newUnit.innerHTML = itemChecklist[locSelector][i]['unit'] + (quantNeeded > 1 ? 's' : '');
            newRow.appendChild(newUnit);
            var newInventory = document.createElement('td'); //get from EOD yesterday
            newInventory.innerHTML = EODinventory;
            newRow.appendChild(newInventory);
            // var newLocation = document.createElement('td');
            // newLocation.innerHTML = itemChecklist[locSelector][i]['location'];
            // newRow.appendChild(newLocation);
            newRow.classList.add('checklist-item');
            
            // for(var property in itemChecklist[locSelector][i]) { 
            //     var newData = document.createElement('td');
            //     newData.innerHTML = itemChecklist[locSelector][i][property];
            //     newRow.appendChild(newData);
            // }
            newRow.id = spaceToDash(itemChecklist[locSelector][i]['name']);
            tableBody.appendChild(newRow);
            document.querySelector('#item-checklist').dataset.write = itemChecklist['last-write'];
        }
        document.querySelector('#item-checklist-table').caption.innerHTML = dashToSpace(locSelector);
    }
    document.querySelectorAll("input[type='checkbox']").forEach( (elt) => {
        elt.parentElement.addEventListener('click', () => {
            if(elt.parentElement.classList.contains('checked')) {
                elt.parentElement.classList.remove('checked');
                elt.checked = false;
            }
            else{
                elt.parentElement.classList.add('checked');
                elt.checked = true;
            }
        });
    });
}

function inventoryFormLoader() {
    console.log(preppedItemList);

    var tableBody = document.querySelector('#inventory-form-tbody');
    document.querySelector('#inventory-form').style.display = 'flex';
    document.querySelector('#eod-cash-wrapper').style.display = 'flex';
    var locSelector = userLocation;
    if(document.querySelector('#inventory-form-table').caption.innerHTML !== userLocation) {
        var blankTBody = document.createElement('tbody');
        blankTBody.id = 'inventory-form-tbody';
        tableBody.parentNode.replaceChild(blankTBody, tableBody);
        tableBody = blankTBody;
    }
    for(var i in itemChecklist[locSelector]['sandwiches']) {
        var skip = false;
        document.querySelectorAll('tr.inventory').forEach( (item) => {
            if (dashToSpace(item.id) === itemChecklist[locSelector]['sandwiches'][i].name) {
                skip = true;
            }
        });
        if(!(skip===true)) {
            var newRow = document.createElement('tr');
            var newInput = document.createElement('input');
            newInput.type = 'number';
            newInput.min = 0;
            newInput.max = 99999;
            newInput.id = spaceToDash(itemChecklist[locSelector]['sandwiches'][i]['name'] + '-sandwich-input');
            newInput.step = 1;
            newInput.min = 0;
            newRow.appendChild(newInput);
            var newUnit = document.createElement('td');
            newUnit.innerHTML = 'sandwiches';
            newRow.appendChild(newUnit);
            var newName = document.createElement('td');
            newName.innerHTML = itemChecklist[locSelector]['sandwiches'][i]['name'];
            newRow.appendChild(newName);
            newRow.id = spaceToDash(itemChecklist[locSelector]['sandwiches'][i]['name']);
            newRow.classList.add('inventory');
            tableBody.appendChild(newRow);
        }
    }
    for(var i in itemChecklist[locSelector]) { //pass location as variable
        var skip = false;
        if( i == "sandwiches") {
            continue;
        }
        document.querySelectorAll('tr.inventory').forEach( (item) => {
            if (dashToSpace(item.id) === itemChecklist[locSelector][i].name
            || preppedItemList[i]['inUse'] === false ) {
                skip = true;
            }
        });
        if( !(skip===true) && !(itemChecklist['settlers-green'][i]['name'] == null) ) {
            var newRow = document.createElement('tr');
            var newInput = document.createElement('input');
            newInput.type = 'number';
            newInput.min = 0;
            newInput.max = 999;
            newInput.id = spaceToDash(itemChecklist[locSelector][i]['name'] + '-input');
            newInput.step = 0.1;
            newInput.min = 0;
            newRow.appendChild(newInput);
            var newUnit = document.createElement('td');
            newUnit.innerHTML = itemChecklist[locSelector][i]['unit'];
            newRow.appendChild(newUnit);
            var newName = document.createElement('td');
            newName.innerHTML = itemChecklist[locSelector][i]['name'];
            newRow.appendChild(newName);
            newRow.id = spaceToDash(itemChecklist[locSelector][i]['name']);
            newRow.classList.add('inventory');
            tableBody.appendChild(newRow);
        }
    }
    var notesRow = document.createElement('tr');
    notesRow.id = 'notes-row';
    var notesLabel = document.createElement('td');
    notesLabel.innerHTML = 'Notes: ';
    var notesInputTd = document.createElement('td');
    notesInputTd.colSpan = 2;
    var notesInput = document.createElement('textarea');
    notesInput.placeholder = 'Type special ingredients inventory and other notes for tomorrow\'s leader';
    notesInput.id = 'notes-input';
    notesInput.cols = 28;
    notesInput.rows = 5;
    notesInputTd.appendChild(notesInput);
    notesRow.appendChild(notesLabel);
    notesRow.appendChild(notesInputTd);
    tableBody.appendChild(notesRow);   

    document.querySelector('#inventory-form-table').caption.innerHTML = dashToSpace(locSelector);
}

async function inventoryFormSubmit() {
    updateNotesRecordLocal();
    var todayNumber = Date.parse(new Date());
    var todayString= getDateString();
    var curTimeInt = Date.parse(new Date());
    var table = document.querySelector('#inventory-form-table');
    var locSelector = userLocation;
    var updateObj = {};
    updateObj['sandwiches'] = {};
    var sandwichNode = '';
    for(var i = 1, row; row = table.rows[i]; i++) {
        if(!row.childNodes[0].id.includes('sandwich') && !row.id.includes('notes')) {
            updateObj[dashToSpace(row.id)] = {};
            if(row.children[0].value == '') {
                updateObj[dashToSpace(row.id)] = { EODinventory: 0, };
            }
            else {
                updateObj[dashToSpace(row.id)] = { EODinventory: Number(row.children[0].value), };
            }
        }
        if(row.childNodes[0].id.includes('sandwich')) {
            if(row.children[0].value == '') {
                updateObj['sandwiches'][dashToSpace(row.id)] = { EODinventory: 0, };
            }
            else {
                updateObj['sandwiches'][dashToSpace(row.id)] = { EODinventory: Number(row.children[0].value), };
            }
            await database.ref('/inventory-record/'+todayString+'/'+locSelector+'/sandwiches'+'/'+dashToSpace(row.id)).update({
                EODinventory: updateObj['sandwiches'][dashToSpace(row.id)]['EODinventory'],
            });
        }
        // else {
        //     await database.ref('/inventory-record/'+todayString+'/'+locSelector+'/'+dashToSpace(row.id)).update({
        //         EODinventory: updateObj[dashToSpace(row.id)]['EODinventory'],
        //     });
        // }
        row.classList.add('checked');
    }
    notesRecord[todayString][locSelector][todayNumber] = {
        'note-text': document.querySelector('#notes-input').value,
        'uFirstName': curUserFirstName,
        'written': todayNumber,
    }
    localStorage.setItem('notesRecord', JSON.stringify(notesRecord));
    await database.ref('/notes-record/'+todayString+'/'+locSelector+'/'+curTimeInt).set(notesRecord[todayString][locSelector][todayNumber]);
    

    updateObj['written'] = curTimeInt;
    await database.ref('/eod-inventory-record/'+todayString+'/'+locSelector+'/'+curTimeInt).set(updateObj);
    table.style.display = 'none';
    var invForm = document.querySelector('#inventory-form');
    var loadedMessage = document.createElement('p');
    loadedMessage.innerHTML='Inventory Submitted';
    invForm.appendChild(loadedMessage);
    //show successful submit message
}

async function cashRecordSubmit() {
    var cashTipsInput = document.querySelector('#cash-tips-input');
    var cashSalesInput = document.querySelector('#cash-sales-input');
    var cashCollectedInput = document.querySelector('#cash-collected-input');
    var differenceOutput = document.querySelector('#eod-cash-difference');
    var cashTips = cashTipsInput.value;
    var cashSales = cashSalesInput.value;
    var cashCollected = cashCollectedInput.value;
    var difference = cashCollected - cashSales;
    var today = new Date();
    var todayString = getDateString();
    today = Date.parse(today.toString());
    await updateCashRecordLocal();

    cashRecord[userLocation]['cash-collected'] = cashCollected;
    cashRecord[userLocation]['cash-revenue'] = cashSales;
    cashRecord[userLocation]['cash-tips'] = cashTips;
    cashRecord[userLocation]['difference'] = difference;

    differenceOutput.innerHTML = 'Difference: ' + difference;
    await database.ref('/cash-record/'+todayString+'/'+userLocation).set(cashRecord[userLocation]);
    await database.ref('/cash-record/'+todayString+'/last-write').set(today);
}

function itemListLoader() {
    var tableBody = document.querySelector('#item-list-tbody');
    document.querySelector('#item-list-container').style.display = 'flex';
    for(var i in preppedItemList) {
        if(typeof(preppedItemList[i]) !== 'object') {
            continue;
        }
        document.querySelectorAll('tr').forEach( (item) => {
            if (item.id === spaceToDash(preppedItemList[i].name)) {
                item.remove();
            }
        });
        var newRow = document.createElement('tr');
        newRow.id = spaceToDash(preppedItemList[i].name);
        var newUnit = document.createElement('td');
        var newName = document.createElement('td');
        var newLocation = document.createElement('td');
        var newRatio = document.createElement('td');
        var newUse = document.createElement('td');
        var newEdit = document.createElement('td');
        newUnit.innerHTML = preppedItemList[i]['unit'];
        newName.innerHTML = preppedItemList[i]['name'];
        newLocation.innerHTML = preppedItemList[i]['location'];
        newRatio.innerHTML = preppedItemList[i]['dollarToQuant'];
        newUse.innerHTML = preppedItemList[i]['inUse'];
        newUse.classList.add('item-use-toggle', 'no-select');
        newEdit.innerHTML = ' edit';
        newEdit.classList.add('item-edit-button', 'no-select');
        newRow.appendChild(newUnit);
        newRow.appendChild(newName);
        newRow.appendChild(newLocation);
        newRow.appendChild(newRatio);
        newRow.appendChild(newUse);
        newRow.appendChild(newEdit);
        if(preppedItemList[i]['inUse'] == false) {
            newRow.classList.add('checked');
        }
        tableBody.appendChild(newRow);
    }
    document.querySelectorAll('.item-use-toggle').forEach( (elt) => {
        elt.addEventListener('click', () => {
                if(elt.innerHTML == 'true') {
                    elt.parentElement.classList.add('checked');
                    elt.innerHTML = 'false';
                    database.ref('/item-list/' + dashToSpace(elt.parentElement.id)).update( {
                        inUse: false,
                    });
                }
                else{
                    elt.parentElement.classList.remove('checked');
                    elt.innerHTML = 'true';
                    database.ref('/item-list/' + dashToSpace(elt.parentElement.id)).update( {
                        inUse: true,
                    });
                }
        });
    });
    document.querySelectorAll('.item-edit-button').forEach( (elt) => {
        elt.addEventListener('click', () => {
            var unitValue = elt.parentNode.childNodes[0].innerHTML;
            var nameValue = elt.parentNode.childNodes[1].innerHTML;
            var ratioValue = elt.parentNode.childNodes[3].innerHTML;
            var storageValue = elt.parentNode.childNodes[2].innerHTML;
            var typeValue = elt.parentNode.childNodes[4].innerHTML;
            var useValue = elt.parentNode.childNodes[5].innerHTML;
            var unitInput = document.querySelector('#unit-input');
            var nameInput = document.querySelector('#name-input');
            var ratioInput = document.querySelector('#ratio-input');
            var storageInput = document.querySelector('#storage-input');
            var useInput = document.querySelector('#use-input');

            unitInput.value = unitValue;
            nameInput.value = nameValue;
            ratioInput.value = ratioValue;
            storageInput.value = storageValue;
            useInput.checked = ( useValue == 'true' ? true : false);
        });
    });
}

async function prepChecklistLoader(revenue = 0) {
    await updateItemListLocal();
    document.querySelector('#prep-revenue-input').addEventListener('input', () => {
        if(document.querySelector('#prep-revenue-input').value != 0) {
            prepChecklistLoader(document.querySelector('#prep-revenue-input').value);
        }
        else {
            prepChecklistLoader();
        }
    });
    //UNFINISHED - Need to create table rows in if statement below 
    var localItemList = JSON.parse(localStorage.getItem('preppedItemList'));
    var tableBody = document.querySelector('#prep-checklist-tbody');
    document.querySelector('#prep-checklist').style.display = 'flex';
    //need to: itterate through locally stored items; create or update a row for each using input revenue
    for(i in localItemList) {
        if(typeof(localItemList[i]) !== 'object' ) {
            continue;
        }
        var skip = false;
        document.querySelectorAll('tr.preplist-item').forEach( (item) => {
            if (/*dashToSpace(item.id) === localItemList[i].name
                ||*/ i == 'sandwiches') {
                skip = true;
            }
        });
        if(skip == false) { //also add logic (here or above) to ensure item is in use, and (here) that it hasn't been prepped yet
            //need to incoperate back of house inventory as well
            var quantNeeded = Math.round(revenue*Number(localItemList[i]['dollarToQuant']) * 10) / 10;
            //
            if(document.querySelector('#' + spaceToDash(localItemList[i]['name'])) !== null) {
                document.querySelector('#' + spaceToDash(localItemList[i]['name']) + '-quant').innerHTML = quantNeeded;
                if(quantNeeded <= 0) {
                    document.querySelector('#' + spaceToDash(localItemList[i]['name']) + '-checkbox').checked = true;
                    document.querySelector('#' + spaceToDash(localItemList[i]['name']) + '-checkbox').parentElement.classList.add('checked');
                }
                else {
                    document.querySelector('#' + spaceToDash(localItemList[i]['name']) + '-checkbox').checked = false;
                    document.querySelector('#' + spaceToDash(localItemList[i]['name']) + '-checkbox').parentElement.classList.remove('checked');
                }
                continue;
            }
            var newRow = document.createElement('tr');
            var newCheckbox = document.createElement('input');
            newCheckbox.type = 'checkbox';
            if(quantNeeded <= 0) {
                newCheckbox.checked = true;
                newRow.classList.add('checked');
            }
            newCheckbox.id = spaceToDash(localItemList[i]['name'] + '-checkbox');
            newRow.appendChild(newCheckbox);
            var newName = document.createElement('td');
            newName.innerHTML = localItemList[i]['name'];
            newRow.appendChild(newName);
            var newQuantNeeded = document.createElement('td'); 
            newQuantNeeded.innerHTML = quantNeeded;
            newQuantNeeded.id = spaceToDash(localItemList[i]['name'] + '-quant');
            newRow.appendChild(newQuantNeeded);
            var newUnit = document.createElement('td');
            newUnit.innerHTML = localItemList[i]['unit'] + (quantNeeded > 1 ? 's' : '');
            newRow.classList.add('checklist-item');
            newRow.id = spaceToDash(localItemList[i]['name']);
            tableBody.appendChild(newRow);
        }
    }
    
    document.querySelectorAll("input[type='checkbox']").forEach( (elt) => {
        var newElt = elt.cloneNode(true);
        elt.parentNode.replaceChild(newElt, elt);
        newElt.parentElement.addEventListener('click', () => {
            if(newElt.parentElement.classList.contains('checked')) {
                newElt.parentElement.classList.remove('checked');
                newElt.checked = false;
            }
            else{
                newElt.parentElement.classList.add('checked');
                newElt.checked = true;
            }
        });
    });
}

async function altrevenueInputLoader(offset = -1) {
    var tableBody = document.querySelector('#altrevenue-input-tbody');
    tableBody.dataset.offset = offset;
    await readLocationsFB(); //replace later with update fn
    for(var i = offset; i < offset+9; i++) {
        await altupdateRevenuePredictionLocal(i); //will update for a single day
    }
    for(loc in locations) {
        var skip = false;
        document.querySelector('#altrevenue-input-tbody').querySelectorAll('tr').forEach( (row) => {
            if(row.id == 'altrevenue-input-header-row') {
                var j = -1;
                row.querySelectorAll('th').forEach( (elt) => { 
                    if(elt.id !== '') {
                        elt.innerHTML = getDateString(j++).substring(0,5);
                    }
                });
            } //runs four times which is unnecessary but whatevs
            
            if(row.id === loc) {
                for(var a = 1; a < 9; a++) {
                    if(row.dataset.write !== altrevenuePredictions[getDateString(offset+a-1)]['last-write']) {
                        row.childNodes[a].childNodes[0].value = altrevenuePredictions[getDateString(offset+a-1)][loc];
                    }
                }
                skip = true;
                 // return is equivilent to continue, continue is not valid in forEach()
            }
        });
        if(!skip) {
            var newRow = document.createElement('tr');
            newRow.id = loc;
            var nameCell = document.createElement('td');
            nameCell.innerHTML = dashToSpace(loc);
            newRow.appendChild(nameCell);
            for(var i = offset; i < offset+9; i++) {
                var newCell = document.createElement('td');
                var newInput = document.createElement('input');
                newInput.type = 'number';
                newInput.max = 99999;
                newInput.step = 100;
                newInput.value = altrevenuePredictions[getDateString(i)][loc];
                newInput.style.maxWidth = '4em';
                newInput.name = getDateString(i) + '-'+ loc + '-input';
                newInput.id = getDateString(i) + '-'+ loc + '-input';
                newCell.id = getDateString(i) + '-'+ loc + '-td';
                newCell.appendChild(newInput);
                newRow.appendChild(newCell);
            }
            tableBody.appendChild(newRow);
        }
    }
}

async function altrevenueInputSubmit() {
    for(loc in locations) { 
        var locSelector = loc; 
        var data = document.querySelectorAll('#altrevenue-input-tbody td');
        var offset = Number(document.querySelector('#altrevenue-input-tbody').dataset.offset);
        //console.log(data);
        for(datum in data) {
            if(!((data[datum].id === "") || (data[datum].id === undefined))) {
                console.log(data[datum].id);
                //console.log(data[datum].id.includes(locSelector));
                for(var i = offset; i < offset+9; i++) {
                    console.log(getDateString(i));
                    console.log(data[datum].id.includes(getDateString(i)));
                }
                if(data[datum].id.includes(locSelector)) {
                    for(var i = offset; i < offset+9; i++) {
                        if(data[datum].id.includes(getDateString(i))) { //logs the info to use as firebase key
                            console.log(('#'+getDateString(i)+'-'+locSelector+'-input')); 
                            console.log(document.getElementById(getDateString(i)+'-'+locSelector+'-input'));
                            console.log(document.getElementById(getDateString(i)+'-'+locSelector+'-input').value);
                            altrevenuePredictions[getDateString(i)][loc] = document.getElementById(getDateString(i)+'-'+locSelector+'-input').value; //querySelector doesn't work on id's that start with numbers
                            database.ref('/altrevenue-predictions/'+getDateString(i)+'/'+locSelector).set(altrevenuePredictions[getDateString(i)][locSelector]);
                            database.ref('/altrevenue-predictions/'+getDateString(i)+'/last-write').set(Date.parse(new Date())); //changed to number on 6/15, will ripple
                        }
                    }
                }
            }
        }
    }
}

async function revenueInputLoader(day = new Date()) {
    var tableBody = document.querySelector('#revenue-input-tbody');
    await updateRevenuePredictionsLocal();
    await readLocationsFB();
    // var today = new Date();
    console.log("passed date: " + day + " type: " + typeof(day));
    var today = day;
    var weekday = today.getDay();
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1));
    var weekRevenues = JSON.parse(localStorage.getItem('revenuePredictions'))[thisMon];
    tableBody.parentNode.caption.innerHTML = 'Week of ' + thisMon;

    for(loc in locations) {
        var skip = false;
        document.querySelectorAll('tr').forEach( (row) => {
            if (row.id === loc) {
                skip = true;
                for(var a = 1; a < 8; a++) {
                    if(a == 7) {
                        a = 0;
                    }
                    row.childNodes[a].childNodes[0].value = (weekRevenues[loc][weekdays[a]] == '' ? 0 : weekRevenues[loc][weekdays[a]]);
                    if(a == 0) {
                        a = 8;
                    }
                }
            }
        });
        if(skip === false) {
            var newRow = document.createElement('tr');
            newRow.id = loc;
            var nameCell = document.createElement('td');
            nameCell.innerHTML = loc;
            newRow.appendChild(nameCell);
            for(var i = 1; i<8; i++) {
                if(i == 7) {
                    i = 0;
                }
                var newCell = document.createElement('td');
                var newInput = document.createElement('input');
                newInput.type = 'number';
                newInput.max = 99999;
                newInput.step = 100;
                newInput.value = (weekRevenues[loc][weekdays[i]] == '' ? 0 : weekRevenues[loc][weekdays[i]]);
                newInput.style.maxWidth = '4em';
                newInput.name = weekdays[i] + '-'+ loc + '-input';
                newInput.id = weekdays[i] + '-'+ loc + '-input';
                newCell.id = weekdays[i] + '-'+ loc + '-td';
                newCell.appendChild(newInput);
                newRow.appendChild(newCell);
                if(i == 0) {
                    i = 8;
                }
            }
            tableBody.appendChild(newRow);
        }
        else {
            for(var i = 1; i<8; i++) {
                if(i == 7) {
                    i = 0;
                }
                document.querySelector('#' + weekdays[i] + '-'+ loc + '-input').value = (weekRevenues[loc][weekdays[i]] == '' ? 0 : weekRevenues[loc][weekdays[i]]);
            }
        }
    }
}

function revenueInputSubmit() { //need to fix!
    //get todays date
    var today = new Date();
    var weekday = today.getDay();
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1));
    // var nextMon = getDateString((weekday == 0 ? -6 : -weekday+1)+7); 
    for(loc in locations) { 
        var locSelector = loc; //later, location is chosen by user
        //weekdays[weekday] gives day of week
        var revenuePredictions = {
        };

        //need to add logic to choose this or next monday

        var data = document.querySelectorAll('#revenue-input-tbody td');
        for(datum in data) {
            if(!((data[datum].id === "") || (data[datum].id === undefined))) {
                if(data[datum].id.includes(locSelector)) {
                    for(day in weekdays) {
                        if(data[datum].id.includes(weekdays[day])) { //logs the info to use as firebase key
                            revenuePredictions[weekdays[day]] = document.querySelector('#'+weekdays[day]+'-'+locSelector+'-input').value;
                        }
                    }
                }
            }
        }
        database.ref('/revenue-predictions/'+thisMon+'/'+locSelector).set(revenuePredictions);
        database.ref('/revenue-predictions/'+thisMon+'/last-write').set(Date.parse(today.toString())); //changed to number on 6/15, will ripple
    }
}

function addIngedientHandler() {
    var ingInputs = document.querySelectorAll('.ingredient-input');
    var skip = false;
    ingInputs.forEach( (ing) => {
        if(ing.value == '') {
            skip = true;  
        }
    });
    if(!skip) {
        var newIngWrapper = document.createElement('div');
        newIngWrapper.classList.add('input-pair-wrapper');
        newIngWrapper.style.width = '100%'
        var newIng = document.createElement('input');
        newIng.classList.add('ingredient-input');
        newIng.type = 'text';
        newIngWrapper.appendChild(newIng);
        var newRatio = document.createElement('input');
        newRatio.classList.add('ratio-input');
        newRatio.type = 'text';
        newIngWrapper.appendChild(newRatio);
        var newBr = document.createElement('br');
        newIngWrapper.appendChild(newBr);
        document.querySelector('#sandwich-add-form').appendChild(newIngWrapper);
    }
}

function addSandwichSubmit() {
    var ingInputs = document.querySelectorAll('.input-pair-wrapper');
    var sandwich = {};
    sandwich.name = document.querySelector('#sandwich-input').value;
    sandwich.dollarToQuant = document.querySelector('#dollarToQuant-input').value;
    ingInputs.forEach( (ing) => {
        if(!(ing.children[0].value == '')) {
            sandwich[ing.children[0].value] = ing.children[1].value;
        }
    });
    database.ref('/sandwiches/'+sandwich.name).set(sandwich);
}

function checklistSubmit() {
    var today = new Date();
    today = getDateString();
    var table = document.querySelector('#item-checklist-table');
    var locSelector = userLocation; //eventually pass as arg or get elsewhere...
    var updateObj = {

    }
    for(var i = 1, row; row = table.rows[i]; i++) {
        updateObj[dashToSpace(row.id)] = false;
        if(row.children[0].checked === false) {
            updateObj[dashToSpace(row.id)] = { taken: false, };
            // database.ref('/inventory-record/'+today+'/'+locSelector+'/'+row.id).update({
            //     taken: false,
            // })
        }
        if(row.children[0].checked === true) {
            updateObj[dashToSpace(row.id)] = { taken: true, };
            table.deleteRow(i);
            i--;
            // database.ref('/inventory-record/'+today+'/'+locSelector+'/'+row.id).update({
            //     taken: true,
            // }); //this overwrites current data...
            //I should maintain that, but write a whole data element with
            //the writeItemFB() function above, to which I add the 'taken' var
        }
        database.ref('/inventory-record/'+today+'/'+locSelector+'/'+dashToSpace(row.id)).update({
             taken: updateObj[dashToSpace(row.id)]['taken'],
        });
    }
}

function loadInventoryHandler() {
    var dateInput = document.querySelector('#inventory-date-selector');
    var today = new Date(); 
    var inventoryDay = new Date(dateInput.value);
    today.setHours(0,0,0,0);
    inventoryDay.setHours(0,0,0,0);
    var offset = (inventoryDay.getTime() - today.getTime())/ (1000 * 3600 * 24) + 1;
    //console.log(userLocation + ': ' + getDateString(offset) + ': ' + getDateString());
    fixEODInventoryFromRecord(userLocation, getDateString(offset), getDateString(-1));

    document.querySelector('#load-inventory-wrapper').style.display = 'none';
    readYesterdayItemChecklistFB().then( () => {
        document.querySelector('#sandwich-checklist').style.display = 'flex';
    });
}

async function notesLoader(offset = -1) {
    await updateNotesRecordLocal(offset);
    document.querySelector('#yesterday-notes').innerHTML = notesRecord[getDateString(offset)][userLocation][Object.keys(notesRecord[getDateString(offset)][userLocation])[0]]["note-text"] + '<br/>-' + notesRecord[getDateString(offset)][userLocation][Object.keys(notesRecord[getDateString(offset)][userLocation])[0]]["uFirstName"];
    document.querySelector('#widget-container').style.display = 'flex';
}

async function fixEODInventoryFromRecord(locSelector = 'settlers-green', sourceDateString = getDateString(-1), destDateString = getDateString()) {
    var eodRecord = {};
    const eodQuery = firebase.database().ref('/eod-inventory-record/'+sourceDateString+'/'+locSelector).orderByChild('written').limitToLast(1);
    
    await eodQuery.once('value', (snapshot) => {
        eodRecord = snapshot.val()[Object.keys(snapshot.val())[0]];
    });
    for(ing in eodRecord) {
        if(typeof(eodRecord[ing]) !== 'object') {
            continue; 
        }
        if(ing == 'sandwiches') {
            for(sandwich in eodRecord[ing]) {
                await firebase.database().ref('/inventory-record/'+destDateString+'/'+locSelector+'/'+ing+'/'+sandwich).update({ 
                    EODinventory: eodRecord[ing][sandwich]['EODinventory'],
                });
            }
        }
        else {
            await firebase.database().ref('/inventory-record/'+destDateString+'/'+locSelector+'/'+ing).update({ 
                EODinventory: eodRecord[ing]['EODinventory'],
            });
        }
    }
    await firebase.database().ref('/inventory-record/'+destDateString+'/last-write').set(Date.parse(new Date()));
}

document.querySelector('#item-checklist-submit').addEventListener('click', checklistSubmit);
document.querySelector('#add-ingedient-button').addEventListener('click', addIngedientHandler);
document.querySelector('#add-sandwich-button').addEventListener('click', addSandwichSubmit);
document.querySelector('#inventory-form-submit').addEventListener('click', inventoryFormSubmit);
document.querySelector('#sandwich-checklist-submit').addEventListener('click', () => {
    writeItemChecklistFB();
    updateNotesRecordLocal().then( () => {
        notesLoader();
    });
    sandwichChecklistSubmit();
});
document.querySelector('#add-item-button').addEventListener('click', () => {
    var newItem = new item();
    newItem.name = document.querySelector('#name-input').value.toLowerCase();
    newItem.unit = document.querySelector('#unit-input').value.toLowerCase();
    newItem.dollarToQuant = document.querySelector('#ratio-input').value.toLowerCase();
    newItem.location = document.querySelector('#storage-input').value.toLowerCase();
    newItem.type = document.querySelector('#type-input').value.toLowerCase();
    newItem.inUse = document.querySelector('#use-input').checked;
    writeTemplateItemFB(newItem);
    readItemListFB().then( () => {itemListLoader();} );
});
document.querySelector('#revenue-input-submit').addEventListener('click', () => {
    readLocationsFB().then( () => { return revenueInputSubmit(); }).then( () => { alert('Revenues submited sucessfully!')});
});
document.querySelector('#go-back-sandwich-button').addEventListener('click', () => {
    hideAllForms();
    sandwichChecklistLoader();
});
document.querySelector('#add-sandwich-nav').addEventListener('click', () => {

});
document.querySelector('#add-ingredient-nav').addEventListener('click', () => {
    hideAllForms();
    itemListLoader();
    document.querySelector('#item-list-container').style.display = 'flex';
});
document.querySelector('#add-sandwich-nav').addEventListener('click', () => {
    hideAllForms();
    document.querySelector('#sandwich-list-container').style.display = 'flex';
});
document.querySelector('#add-revenues-nav').addEventListener('click', () => {
    hideAllForms();
    readLocationsFB().then( () => {
        revenueInputLoader();
    }).then( () => {
        document.querySelector('#revenue-input-container').style.display = 'flex';
    });
});
document.querySelector('#home-nav').addEventListener('click', () => {
    pageInfoLoader();
});
document.querySelector('#prep-checklist-nav').addEventListener('click', () => {
    hideAllForms();
    prepChecklistLoader();
});
document.querySelector('#load-inventory-nav').addEventListener('click', () => {
    hideAllForms();
    document.querySelector('#load-inventory-location').innerHTML = dashToSpace(userLocation);
    document.querySelector('#load-inventory-wrapper').style.display = 'flex';
});
document.querySelector('#inventory-from-sandwich-button').addEventListener('click', () => {
    hideAllForms();
    // document.querySelector('#inventory-form-table').style.display = 'inline';
    // document.querySelector('#eod-cash-wrapper').style.display = 'flex';
    readItemListFB().then( () => { 
        return readSandwichesFB(); 
    }).then( () => { 
        return inventoryFormLoader(); 
    });
});
document.querySelector('#inventory-from-checklist-button').addEventListener('click', () => {
    hideAllForms();
    inventoryFormLoader();
});
document.querySelector('#sandwich-from-inventory-button').addEventListener('click', () => {
    hideAllForms();
    sandwichChecklistLoader();
});
// document.querySelector('#change-role-loc-button').addEventListener('click', () => {
//     document.querySelector('#role-loc-form').style.display = 'inline';
// });
document.querySelector('#role-loc-submit').addEventListener('click', () => {
    userLocation = document.querySelector('#loc-selector').value;
    hideAllForms();
    sandwichChecklistLoader();
});
document.querySelector('#welcome-button').addEventListener('click', () => {
    hideAllForms();
    document.querySelector('#role-loc-dialogue').style.display = 'inline';
});
document.querySelector('#submit-cash-record-button').addEventListener('click', () => {
    cashRecordSubmit();
});
document.querySelector('#load-inventory-submit').addEventListener('click', loadInventoryHandler);
// document.querySelector('#revenue-input-next-week').addEventListener('click', () => {
//     var today = new Date();
//     console.log(typeof(today));
//     console.log(today);
//     console.log(today.getDate());
//     today.setDate(today.getDate() + 7);
//     console.log(typeof(today));
//     console.log(today);
//     console.log(today.getDate());
//     revenueInputLoader(today);
    
//     //revenueInputLoader(today.setDate(today.getDate() + 7));
// }); Doesn't work yet :( still getting freezing with this page....
