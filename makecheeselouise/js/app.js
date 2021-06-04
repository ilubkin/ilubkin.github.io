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
var itemListSearch = database.ref().child('item-list').orderByChild('name');
var locationSearch = database.ref().child('locations');
var sandwichSearch = database.ref().child('sandwiches');
var revenueSearch = database.ref().child('revenue-predictions');
var items = null;
var itemList = null;
var locations = null;
var itemChecklist = null;
var yesterdayItemChecklist = null;
var sandwichChecklist = null;
var sandwiches = null;
var revenues = null;
var permittedEmails = null;
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

async function readItemsFB() {
    await itemSearch.once('value', (snapshot) => {
        //ADD a function to display 'loading' while loading data
        items = snapshot.val();
    }); //Now ASYNC!
}

async function readItemListFB() {
    await itemListSearch.once('value', (snapshot) => {
        itemList = snapshot.val();
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

async function readSandwichChecklistFB(dayOffset = 0, locSelector = 'settlers-green') {
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
    }).then( () => { 
        return readRevenuesFB();
    });
    var today = new Date();
    var weekday = today.getDay() + dayOffset;
    today = getDateString(dayOffset);
    var thisMon = getDateString((weekday == 0 ? -6 : -weekday+1) + dayOffset);
    var revenue = '0';
    // var locSelector = 'settlers-green';//later, itterate through all locations, or pass as arg
    for(locSelector in locations) {
        revenue = revenues[thisMon][locSelector][weekdays[weekday]];
        await readSandwichChecklistFB(dayOffset, locSelector).then(() => {
            for(var i in itemList) {
                database.ref('/inventory-record/'+today+'/'+locSelector+'/'+i).set({
                    name: itemList[i].name,
                    unit: itemList[i].unit,
                    dollarToQuant: itemList[i].dollarToQuant,
                    SODinventory: (itemList[i].dollarToQuant*revenue),
                    EODinventory: '0', //add at eod
                    location: itemList[i].location,
                    taken: false,
                    offset: 0,
                    //need to add current inventory into account (for cur inv. and to bring)
                });
            }
        }).then(() => {
            if(sandwichChecklist == null) {
                for(var sandwich in sandwiches) {
                    sandwiches[sandwich].EODinventory = 0;
                    sandwiches[sandwich].SODinventory = 0;
                    if(sandwiches[sandwich].bringing == null) {
                        sandwiches[sandwich].bringing = 0;
                    }
                    //add logic to pull from yesterday
                    database.ref('/inventory-record/'+today+'/'+locSelector+'/sandwiches/'+ sandwich).update(sandwiches[sandwich]);
                }
            }
        });
    }
}

function writeItemLocal(i) {

}

function writeAllItemsLocal() {

}

function readAllItemsLocal() {

}

function writeTemplateItemFB(i) {
    database.ref('/item-list/'+i.name).set({
        name: i.name,
        unit: i.unit,
        location: i.location,
        dollarToQuant: i.dollarToQuant,
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

userSIEmail.addEventListener('onblur', () => {
    checkUserSIEmail();
});
userSIPassword.addEventListener('onblur', () => {
    checkUserSIPassword();
});
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
userFirstName.addEventListener('onblur', () => {
    checkUserFirstName();
});
userLastName.addEventListener('onblur', () => {
    checkUserLastName();
});
userEmail.addEventListener('onblur', () => {
    checkUserEmail();
});
userPassword.addEventListener('onblur', () => {
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
    var userSIEmail = document.getElementById("userSIEmail");
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
    var userSIPassword = document.getElementById("userSIPassword");
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
    var uFirstName = document.getElementById("userFirstName").value;
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
    var uLastName = document.getElementById("userLastName").value;
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
    var userEmail = document.getElementById("userEmail");
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
    var userPassword = document.getElementById("userPassword");
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
            firebaseRef.child(uid).set(userData);
            alert('Your Account Created','Your account was created successfully, you can log in now.',
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
}

function sandwichChecklistLoader() {
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
    document.querySelector('#sandwich-checklist-table').caption.innerHTML = locSelector;
}

// var new_tbody = document.createElement('tbody');
// populate_with_new_rows(new_tbody);
// old_tbody.parentNode.replaceChild(new_tbody, old_tbody)

function sandwichChecklistSubmit() {
    var sandwichTBody = document.querySelector('#sandwich-checklist-tbody');
    var locSelector = userLocation;
    var today = new Date();
    today = getDateString();
    for(var i = 1, row; row = sandwichTBody.rows[i]; i++) {
        var todayCount = Number(row.childNodes[1].value);
        itemChecklist[locSelector]['sandwiches'][dashToSpace(row.id)]['bringing'] = Number(row.childNodes[1].value);
        database.ref('/inventory-record/'+today+'/'+locSelector+'/sandwiches/'+dashToSpace(row.id)).update({
            bringing:  Number(row.childNodes[1].value),
        });
        var yesterdayCount = Number(row.childNodes[2].innerHTML);
        var sandwichName = dashToSpace(row.id);
        var locSelector = 'settlers-green';
        var maxNeed = Number(row.childNodes[3].innerHTML);
        var offsetCount = ((todayCount+yesterdayCount) < maxNeed ? (todayCount+yesterdayCount) : maxNeed);
        for(var j in sandwiches[sandwichName]) {
            if(itemChecklist[locSelector][j] !== undefined) {
                var offsetv = Number(itemChecklist[locSelector][j]['offset']) + offsetCount*Number(sandwiches[sandwichName][j]);
                itemChecklist[locSelector][j]['offset'] = offsetv;
                database.ref('/inventory-record/'+today+'/'+locSelector+'/'+j).update({
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
    for(var i in itemChecklist[locSelector]) { //pass location as variable
        var skip = false;
        document.querySelectorAll('tr.checklist-item').forEach( (item) => {
            if (dashToSpace(item.id) === itemChecklist[locSelector][i].name
                || i == 'sandwiches') {
                skip = true;
            }
        });
        if( skip==false && (itemChecklist[locSelector][i]['taken'])==false && (itemList[i]['inUse'])==true) {
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
            var newRow = document.createElement('tr');
            var newCheckbox = document.createElement('input');
            newCheckbox.type = 'checkbox';
            if(quantNeeded <= 0) {
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
            
        }
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
    var tableBody = document.querySelector('#inventory-form-tbody');
    document.querySelector('#inventory-form').style.display = 'flex';
    var locSelector = userLocation;
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
        document.querySelectorAll('tr.inventory').forEach( (item) => {
            if (dashToSpace(item.id) === itemChecklist[locSelector][i].name) {
                skip = true;
            }
        });
        if( !(skip===true) && !(itemChecklist[locSelector][i]['taken']==true) && !(itemChecklist['settlers-green'][i]['name'] == null) ) {
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
}

function inventoryFormSubmit() {
    var today = new Date();
    today = getDateString();
    var table = document.querySelector('#inventory-form-table');
    var locSelector = userLocation; //eventually pass as arg or get elsewhere...
    var updateObj = {};
    var sandwichNode = '';
    for(var i = 1, row; row = table.rows[i]; i++) {
        updateObj[dashToSpace(row.id)] = false;
        if(row.children[0].value == '') {
            updateObj[dashToSpace(row.id)] = { EODinventory: 0, };
        }
        else {
            updateObj[dashToSpace(row.id)] = { EODinventory: Number(row.children[0].value), };
        }
        if(row.childNodes[0].id.includes('sandwich')) {
            database.ref('/inventory-record/'+today+'/'+locSelector+'/sandwiches'+'/'+dashToSpace(row.id)).update({
                EODinventory: updateObj[dashToSpace(row.id)]['EODinventory'],
            });
        }
        else {
            database.ref('/inventory-record/'+today+'/'+locSelector+'/'+dashToSpace(row.id)).update({
                EODinventory: updateObj[dashToSpace(row.id)]['EODinventory'],
            });
        }
        row.classList.add('checked');
    }
    table.style.display = 'none';
    var invForm = document.querySelector('#inventory-form');
    var loadedMessage = document.createElement('p');
    loadedMessage.innerHTML='Inventory Submitted';
    invForm.appendChild(loadedMessage);
    //show successful submit message
}

function itemListLoader() {
    var tableBody = document.querySelector('#item-list-tbody');
    document.querySelector('#item-list-container').style.display = 'flex';
    for(var i in itemList) {
        document.querySelectorAll('tr').forEach( (item) => {
            if (item.id === spaceToDash(itemList[i].name)) {
                item.remove();
            }
        });
        var newRow = document.createElement('tr');
        newRow.id = spaceToDash(itemList[i].name);
        var newUnit = document.createElement('td');
        var newName = document.createElement('td');
        var newLocation = document.createElement('td');
        var newRatio = document.createElement('td');
        var newUse = document.createElement('td');
        newUnit.innerHTML = itemList[i]['unit'];
        newName.innerHTML = itemList[i]['name'];
        newLocation.innerHTML = itemList[i]['location'];
        newRatio.innerHTML = itemList[i]['dollarToQuant'];
        newUse.innerHTML = itemList[i]['inUse'];
        newUse.classList.add('item-use-toggle', 'no-select');
        newRow.appendChild(newUnit);
        newRow.appendChild(newName);
        newRow.appendChild(newLocation);
        newRow.appendChild(newRatio);
        newRow.appendChild(newUse);
        if(itemList[i]['inUse'] == false) {
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
}

function revenueInputLoader() {
    var tableBody = document.querySelector('#revenue-input-tbody');
    for(loc in locations) {
        var skip = false;
        document.querySelectorAll('tr').forEach( (row) => {
            if (row.id === loc) {
                skip = true;
            }
        });
        if(skip===false) {
            var newRow = document.createElement('tr');
            newRow.id = loc;
            var nameCell = document.createElement('td');
            nameCell.innerHTML = loc;
            newRow.appendChild(nameCell);
            for(var i = 0; i<7; i++) {
                var newCell = document.createElement('td');
                var newInput = document.createElement('input');
                newInput.type = 'number';
                newInput.max = 99999;
                newInput.step = 100;
                newInput.style.maxWidth = '4em';
                newInput.name = weekdays[i] + '-'+ loc + '-input';
                newInput.id = weekdays[i] + '-'+ loc + '-input';
                newCell.id = weekdays[i] + '-'+ loc + '-td';
                newCell.appendChild(newInput);
                newRow.appendChild(newCell);
            }
            tableBody.appendChild(newRow);
        }
    }
}

function revenueInputSubmit() { //need to fix!
    //get todays date
    var today = new Date();
    var weekday = today.getDay();
    today = getDateString();
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

document.querySelector('#item-checklist-submit').addEventListener('click', checklistSubmit);
document.querySelector('#add-ingedient-button').addEventListener('click', addIngedientHandler);
document.querySelector('#add-sandwich-button').addEventListener('click', addSandwichSubmit);
document.querySelector('#inventory-form-submit').addEventListener('click', inventoryFormSubmit);
document.querySelector('#sandwich-checklist-submit').addEventListener('click', sandwichChecklistSubmit);
document.querySelector('#add-item-button').addEventListener('click', () => {
    var newItem = new item();
    newItem.name = document.querySelector('#name-input').value.toLowerCase();
    newItem.unit = document.querySelector('#unit-input').value.toLowerCase();
    newItem.dollarToQuant = document.querySelector('#ratio-input').value.toLowerCase();
    newItem.location = document.querySelector('#storage-input').value.toLowerCase();
    newItem.inUse = document.querySelector('#use-input').checked;
    writeTemplateItemFB(newItem);
    readItemListFB().then( () => {itemListLoader();} );
});
document.querySelector('#revenue-input-submit').addEventListener('click', () => {
    readLocationsFB().then( () => { revenueInputSubmit(); });
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
document.querySelector('#inventory-from-sandwich-button').addEventListener('click', () => {
    hideAllForms();
    document.querySelector('#inventory-form-table').style.display = 'inline';
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
})