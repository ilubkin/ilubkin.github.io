'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var firebase_1 = require("firebase");
//declare const firebase: typeof import('firebase');
require("firebase/analytics");
// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/database");
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
firebase_1["default"].initializeApp(config);
var database = firebase_1["default"].database(); //global variable for root of firebase database
function updateHelloWorldLocal() {
    return __awaiter(this, void 0, void 0, function () {
        var helloMessage, dbRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    helloMessage = 'none-collected';
                    dbRef = database.ref();
                    return [4 /*yield*/, dbRef.child('hello-world').get().then(function (snapshot) {
                            if (snapshot.exists()) {
                                helloMessage = String(snapshot);
                            }
                            else {
                                console.log("Error reading from firebase");
                            }
                        })];
                case 1:
                    _a.sent();
                    console.log(helloMessage);
                    return [2 /*return*/];
            }
        });
    });
}
