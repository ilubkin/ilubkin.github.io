//could still add:
// decimal capabilities (easy for all but exp, just switch to parseFloat from partInt) 
// backspace button (easy)
// add keyboard support (harder...)
// truncate operation output (currently can overflow the container)

function add(x, y) {
	return x + y;
}

function subtract(x, y) {
	return x - y;
}

function multiply(x, y) {
	return x * y;
}

function divide(x, y) {
	return x / y;
}

function exponent(x, y) {
	let acc = 1;
	for(let i = 0; i < y; i++)
		acc *= x;
	return acc;
}

function operate(x, y, operator) {
	if(typeof(x) !== "number" || typeof(y) !== "number") {
		console.log("How'd you do that? Don't pass non-numbers you rascal!");
		return 0;
	}
	switch(operator) {
		case "add":
			return add(x, y);
			break;
		case "subtract":
			return subtract(x, y);
			break;
		case "multiply":
			return multiply(x, y);
			break;
		case "divide":
			if( y === 0 ) {
				alert("error: you can't divide by 0 silly!");
				return 0;
			}
			return divide(x, y);
			break;
		case "exponent":
			if( y < 0 ) {
				console.log("error: negative exponents are not currently supported");
				return 0;
			}
			return exponent(x, y);
			break;
		default:
			console.log("error, invalid operand");
			return 0;
			break;
	}
}

function isNumber(string) {
	switch(string) {
		case "one":
		case "two":
		case "three":
		case "four":
		case "five":
		case "six":
		case "seven":
		case "eight":
		case "nine":
		case "zero":
			return true;
			break;
		default:
			return false;
			break;
	}
}

function isOperator(string) {
	switch(string) {
		case "divide":
		case "multiply":
		case "subtract":
		case "add":
		case "exponent":
			return true;
			break;
		default:
			return false;
			break;
	}
}

let operator = "";
let lastIn = 0;
let curIn = 0;

let buttons = document.querySelectorAll(".button");
buttons.forEach( button => {
	button.addEventListener('click', () => {
		if(event.target.id === "equals"){
			if(operator === "")
				return;
			curIn = operate(parseInt(lastIn, 10), parseInt(curIn, 10), operator);
                        document.getElementById("answer").textContent = curIn;
			operator = "";
			lastIn = 0;
			return;
		}
		if(isNumber(event.target.id) && (document.getElementById("answer").textContent === "0") ) {
                        document.getElementById("answer").textContent = "";
		}	
		if(isOperator(event.target.id) && !isOperator(operator)) {
			lastIn = curIn;
			curIn = 0;
		}
		if(isOperator(operator) && isNumber(event.target.id) && curIn === 0) {
			document.getElementById("answer").textContent = "";
		}
		if(isOperator(operator) && isOperator(event.target.id)) {
			curIn = operate(parseInt(lastIn, 10), parseInt(curIn, 10), operator);
			document.getElementById("answer").textContent = curIn;
			lastIn = curIn;
			curIn = 0;
			//doesn't work...retains info after operation (in answer spot)...
		}
		let selected = "";
		switch(event.target.id) {
                        case "one":
                                selected += "1";        
                                break;
                        case "two":
                                selected += "2";        
                                break;
                        case "three":
                                selected += "3";        
                                break;
                        case "four":
                                selected += "4";        
                                break;
                        case "five":
                                selected += "5";        
                                break;
                        case "six":
                                selected += "6";        
                                break;
                        case "seven":
                                selected += "7";        
                                break;
                        case "eight":
                                selected += "8";        
                                break;
                        case "nine":
                                selected += "9";        
                                break;
                        case "zero":
                                selected += "0";        
                                break;
			case "divide":
                                operator = "divide";
                                break;
                        case "multiply":
                                operator = "multiply";
                                break;
                        case "subtract":
                                operator = "subtract";
                                break;
                        case "add":
                                operator = "add";
                                break;
			case "exponent":
				operator = "exponent";
				break;
			default:
				break;
		}
		if(document.getElementById("answer").textContent.length < 12)
			document.getElementById("answer").textContent += selected;
                if(isNumber(event.target.id))
			curIn = parseInt(document.getElementById("answer").textContent, 10);
	});
});

document.getElementById("clear").addEventListener('click', () => {
        document.getElementById("answer").textContent = "0";
	lastIn = 0;
	curIn = 0;
	operator = "";
});

