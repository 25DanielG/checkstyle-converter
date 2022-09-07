import { ConsoleReporter } from '@vscode/test-electron';
import { systemDefaultPlatform } from '@vscode/test-electron/out/util';
import { close, unwatchFile } from 'fs';
import { allowedNodeEnvironmentFlags } from 'process';
import { start } from 'repl';
import { isReadable } from 'stream';
import * as vscode from 'vscode';
var startBlockComments: number[] = [];
var endBlockComments: number[] = [];
var classIndents: number[] = [];
const editor = vscode.window.activeTextEditor;
let preDoc = editor?.document.getText();
export function activate(context: vscode.ExtensionContext) {
	console.log('Checkstlye converter is currently active!');
	let changePP: boolean = false;
	let indentPreference = 2;
	if(editor && (editor.document.fileName.includes(".java") || editor.document.fileName.includes(".jt"))) {
		editor.edit(editBuilder => {
			const firstLine = editor.document.lineAt(0);
			const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
			const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
			if(preDoc !== undefined) {
				let preDoc = preprocess();
				if(preDoc !== undefined) {
					editBuilder.replace(range, preDoc);
					console.log("Preprocessed editor.");
				}
			}
		});
	} else {
		vscode.window.showInformationMessage("No active editor open or editor is not a .java or .jt file.");
	}
	let disposable = vscode.commands.registerCommand('checkstyle-converter.convertCheckstyle', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor && (editor.document.fileName.includes(".java") || editor.document.fileName.includes(".jt"))) {
			editor.edit(editBuilder => {
				const firstLine = editor.document.lineAt(0);
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				let newWord: string = performCheckstyle(range, word, changePP, indentPreference);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java or .jt file.");
		}
	});
	context.subscriptions.push(disposable);
	let disposableTwo = vscode.commands.registerCommand('checkstyle-converter.convertCheckstyleWithSelction', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor && (editor.document.fileName.includes(".java") || editor.document.fileName.includes(".jt"))) {
			editor.edit(editBuilder => {
				const sel = editor.selection;
				const firstLine = editor.document.lineAt(sel.start.line);
				const lastLine = editor.document.lineAt(sel.end.line);
				console.log("Selection is: (" + firstLine.lineNumber + ", " + firstLine.range.start.character + ") to (" + lastLine.lineNumber + ", " + lastLine.range.end.character + ")");
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText(range);
				let newWord: string = performCheckstyle(range, word, changePP, indentPreference);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java pf .jt file.");
		}
	});
	context.subscriptions.push(disposableTwo);
	let disposableThree = vscode.commands.registerCommand('checkstyle-converter.togglePlusPlus', () => {
		changePP = !changePP;
		vscode.window.showInformationMessage("Automatically change ++i to i++ toggled: " + changePP);
	});
	context.subscriptions.push(disposableThree);
	let disposableFour = vscode.commands.registerCommand('checkstyle-converter.changeIndentPreference', async () => {
		const searchQuery = await vscode.window.showInputBox({
			placeHolder: "Indentation Preference Spaces",
			prompt: "Enter Indentation Preference",
			password: false,
			title: "Indentation Preference"
		});
		if(searchQuery === ''){
			vscode.window.showErrorMessage('A search query is mandatory to execute this action');
		}
		if(searchQuery !== undefined) {
			indentPreference = +searchQuery;
		}
		vscode.window.showInformationMessage("Changed your indent preference to: " + indentPreference);
	});
	context.subscriptions.push(disposableFour);
	let disposableFive = vscode.commands.registerCommand('checkstyle-converter.fixIndentation', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor && (editor.document.fileName.includes(".java") || editor.document.fileName.includes(".jt"))) {
			editor.edit(editBuilder => {
				const firstLine = editor.document.lineAt(0);
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				let newWord:string = performIndentation(range, word, indentPreference);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java of .jt file.");
		}
	});
	context.subscriptions.push(disposableFive);
	let disposableSix = vscode.commands.registerCommand('checkstyle-converter.fixIndentationSelection', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor && (editor.document.fileName.includes(".java") || editor.document.fileName.includes(".jt"))) {
			editor.edit(editBuilder => {
				const sel = editor.selection;
				const firstLine = editor.document.lineAt(sel.start.line);
				const lastLine = editor.document.lineAt(sel.end.line);
				console.log("Selection is: (" + firstLine.lineNumber + ", " + firstLine.range.start.character + ") to (" + lastLine.lineNumber + ", " + lastLine.range.end.character + ")");
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				let newWord:string = performIndentation(range, word, indentPreference);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java or .jt file.");
		}
	});
	context.subscriptions.push(disposableSix);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function checkForClass(str: string, cnt: number) {
	if(includeExcludingComment(str, cnt, "class")) {
		return true;
	} else {
		return false;
	}
}
function checkForMethod(alLLines: string[], cnt: number) {
	if(includeExcludingComment(alLLines[cnt], cnt, "public") || includeExcludingComment(alLLines[cnt], cnt, "private") || includeExcludingComment(alLLines[cnt], cnt, "protected")) {
		if(includeExcludingComment(alLLines[cnt], cnt, "(") || includeExcludingComment(alLLines[cnt + 1], cnt + 1, "(")) {
			if(countSpacesBeforeCode(alLLines[cnt])) {
				
			}
		}
	} else {

	}
}
function preprocessBlockComments(word: string[], i: number) {
	let toSearchOne: string = "/*";
	let toSearchTwo: string = "*/";
	if(word[i].includes(toSearchOne)) {
		startBlockComments.push(i);
	}
	if(word[i].includes(toSearchTwo)) {
		endBlockComments.push(i);
	}
}
function preprocess() {
	if(preDoc === undefined) return;
	let allLines = preDoc.split('\n');
	for(let i = 0; i < allLines.length; ++i) {
		if(allLines[i].trim().length === 0) {
			allLines.splice(i, 1);
		}
		preprocessBlockComments(allLines, i);
		if(checkForClass(allLines[i], i)) {
			let tmpIndent = countSpacesBeforeCode(allLines[i]);
			if(tmpIndent !== undefined) {
				classIndents.push(tmpIndent);
			}
		}
	}
	let newWord:string = allLines.join('\n');
	return newWord;
}
function countSpacesBeforeCode(strLine: string) {
	let cnt = 0;
	for(let i = 0; i < strLine.length; ++i) {
		const character = strLine.charAt(i);
		if(character === ' ') {
			++cnt;
		} else {
			return cnt;
		}
	}
}
function setSpacesBeforeCode(strLine: string, numSpaces: number, beforeSpaces: number) {
	let tmpString: string = "";
	for(let i = 0; i < beforeSpaces; ++i) {
		tmpString += ' ';
	}
	strLine = strLine.replace(tmpString, "");
	tmpString = "";
	for(let i = 0; i < numSpaces; ++i) {
		tmpString += ' ';
	}
	strLine = tmpString + strLine;
	return strLine;
}
function normalIndentWithBrace(strLine: string) {
	for(let i = 0; i < strLine.length; ++i) {
		if(strLine[i] !== ' ' && strLine[i] !== '{') {
			return true;
		} else if(strLine[i] === '{') {
			return false;
		}
	}
}
function onlyCloseBrace(strLine: string) {
	for(let i = 0; i < strLine.length; ++i) {
		if(strLine[i] !== ' ' && strLine[i] !== '}') {
			return false;
		} else if(strLine[i] === '}') {
			return true;
		}
	}
}
function onlyOpenBrace(strLine: string) {
	for(let i = 0; i < strLine.length; ++i) {
		if(strLine[i] !== ' ' && strLine[i] !== '{') {
			return false;
		} else if(strLine[i] === '{') {
			return true;
		}
	}
}
function preprocessString(fullDoc: string) {
	fullDoc = fullDoc.replaceAll("for (", "for(");
	fullDoc = fullDoc.replaceAll("while (", "while(");
	fullDoc = fullDoc.replaceAll("else if (", "else if(");
	fullDoc = fullDoc.replaceAll("if (", "if(");
	fullDoc = fullDoc.replaceAll("else (", "else(");
	return fullDoc;
}
function includeExcludingComment(str: string, cnt: number, toFind: string) {
	if(str.includes(toFind)) {
		let indexOf = str.indexOf(toFind);
		let insideSingleComment: boolean = false;
		if(str.includes("//")) {
			let indexOfSlash: number = str.indexOf("//");
			if(indexOf > indexOfSlash) return false;
		}
		for(let i = 0; i < startBlockComments.length; ++i) {
			if(cnt > startBlockComments[i] && cnt < endBlockComments[i]) {
				return false;
			} else if(cnt === startBlockComments[i] && cnt === endBlockComments[i]) {
				if(indexOf > str.indexOf("/*") && indexOf < str.indexOf("*/")) return false
			} else if(cnt === startBlockComments[i]) {
				if(indexOf > str.indexOf("/*")) return false;
			} else if(cnt === endBlockComments[i]) {
				if(indexOf < str.indexOf("/*")) return false;
			}
		}
		return true;
	}
	return false;
}
function findWhereToClose(allLines: string[], currLine: number) {
	let currentLine = allLines[currLine];
	let returnNum: number = -1;
	for(let tmpCnt:number = currLine + 1; tmpCnt < allLines.length; ++tmpCnt) {
		if(includeExcludingComment(allLines[tmpCnt], tmpCnt, "for(") || includeExcludingComment(allLines[tmpCnt], tmpCnt, "else(") || includeExcludingComment(allLines[tmpCnt], tmpCnt, "while(") || includeExcludingComment(allLines[tmpCnt], tmpCnt, "if(")) {
			if(!includeExcludingComment(allLines[tmpCnt], tmpCnt, "{") && !onlyOpenBrace(allLines[tmpCnt + 1])) {
				returnNum = findWhereToClose(allLines, tmpCnt);
			} else {
				while(true) {
					if(includeExcludingComment(allLines[tmpCnt], tmpCnt, '}')) {
						if(includeExcludingComment(allLines[tmpCnt], tmpCnt, '{') && allLines[tmpCnt].indexOf('{') < allLines[tmpCnt].indexOf('}')) {
							++tmpCnt;
							continue;
						}
						return tmpCnt;
					}
					++tmpCnt;
				}
			}
		} else {
			return tmpCnt;
		}
	}
	return returnNum;
}
function addJavaDoc(allLines: string[], indentPref: number) {
	let indentArr: number[] = outlineProperIndent(allLines, indentPref);
	console.log(indentArr);
}
function performCheckstyle(range: vscode.Range, word: string, flagPP: boolean, indentPref: number) {
	word = word.replaceAll('\t', '  ');
	word = preprocessString(word);
	let allLines: string[] = word.split('\n');
	addJavaDoc(allLines, indentPref);
	for(let i = 0; i < allLines.length; ++i) {
		let currentLine: string = allLines[i];
		if(includeExcludingComment(currentLine, i, "public") || includeExcludingComment(currentLine, i, "private")
			|| includeExcludingComment(currentLine, i, "protected") || includeExcludingComment(currentLine, i, "for(") || includeExcludingComment(currentLine, i, "else")
			|| includeExcludingComment(currentLine, i, "while(") || includeExcludingComment(currentLine, i, "do") || includeExcludingComment(currentLine, i, "if(")) {
			if(includeExcludingComment(currentLine, i, "{")) {
				if(includeExcludingComment(currentLine, i, "}") && !includeExcludingComment(currentLine, i, "else")) continue;
				let spacesBefore = countSpacesBeforeCode(allLines[i]);
				let tmpStr: string = "";
				if(spacesBefore !== undefined) {
					for(let i = 0; i < spacesBefore; ++i) {
						tmpStr += " ";
					}
				}
				allLines[i] = allLines[i].replace('{', "\n" + tmpStr + "{");
			}
			if(includeExcludingComment(currentLine, i, "else") && includeExcludingComment(currentLine, i, "}")) {
				if(currentLine.indexOf('}') < currentLine.indexOf("else")) {
					console.log("Entered else reformer");
					let spacesBefore = countSpacesBeforeCode(allLines[i]);
					let tmpStr: string = "";
					if(spacesBefore !== undefined) {
						for(let i = 0; i < spacesBefore; ++i) {
							tmpStr += " ";
						}
					}
					allLines[i] = allLines[i].replace("else", "\n" + tmpStr + "else");
				}
			}
			if(includeExcludingComment(currentLine, i, "for(") || includeExcludingComment(currentLine, i, "else(") || includeExcludingComment(currentLine, i, "while(") || includeExcludingComment(currentLine, i, "if(")) {
				if(!includeExcludingComment(currentLine, i, "{") && !onlyOpenBrace(allLines[i + 1])) {
					let spacesBefore = countSpacesBeforeCode(allLines[i]);
					let tmpStr: string = "";
					if(spacesBefore !== undefined) {
						for(let i = 0; i < spacesBefore; ++i) {
							tmpStr += " ";
						}
					}
					let closePlace: number = findWhereToClose(allLines, i);
					allLines[i] = allLines[i] + '\n' + tmpStr + '{';
					allLines.splice(closePlace + 1, 0, tmpStr + '}');
				}
			}
		}
		if(flagPP && includeExcludingComment(currentLine, i, "++")) {
			const indexPP = currentLine.indexOf("++");
			//if(currentLine[indexPP + 2] == ' ' || currentLine[indexPP + 2] == ')') continue;
			const usedVariable = allLines[i][indexPP + 2];
			if(includeExcludingComment(currentLine, i, "++" + usedVariable)) continue;
			allLines[i] = allLines[i].replace("++" + usedVariable, usedVariable + "++");
		}
	}
	let newWord = allLines.join('\n');
	return newWord;
}
function outlineProperIndent(allLines: string[], indentPref: number) {
	let indentPushNum: number = 0;
	let indentTrackerArr = new Array<number>();
	for(let i = 0; i < allLines.length; ++i) {
		let currentLine: string = allLines[i];
		indentTrackerArr.push(indentPushNum);
		if(includeExcludingComment(currentLine, i, "class ") || (includeExcludingComment(currentLine, i, "final ") && !includeExcludingComment(currentLine, i, ";"))) {
			++indentPushNum;
		} else if((includeExcludingComment(currentLine, i, "private ") || includeExcludingComment(currentLine, i, "public ") || includeExcludingComment(currentLine, i, "protected "))) {
			if(!includeExcludingComment(currentLine, i, ";") && !includeExcludingComment(currentLine, i, "=")) {
				++indentPushNum;
			}
		} else if(includeExcludingComment(currentLine, i, "for(") || includeExcludingComment(currentLine, i, "while(") || includeExcludingComment(currentLine, i, "if(") || includeExcludingComment(currentLine, i, "else ")) {
			++indentPushNum;
		} else if(includeExcludingComment(currentLine, i, "do") || includeExcludingComment(currentLine, i, "else{")) {
			++indentPushNum;
		}
		if(includeExcludingComment(currentLine, i, "}") && !includeExcludingComment(currentLine, i, "{")) {
			--indentPushNum;
		}
	}
	return indentTrackerArr;
}
function performIndentation(range: vscode.Range, word: string, indentPref: number) {
	word = preprocessString(word);
	let allLines: string[] = word.split('\n');
	let retLines = new Array<string>();
	let properIndent = 0;
	let indentPushNum = 0;
	let normalNextIndent: boolean = true;
	for(let i = 0; i < allLines.length; ++i) {
		let currentLine: string = allLines[i];
		let indentTracker = countSpacesBeforeCode(currentLine);
		properIndent = indentPushNum * indentPref;
		if(i >= range.start.line && i <= range.end.line) {
			if(indentTracker !== undefined) {
				if(normalNextIndent) {
					if(onlyCloseBrace(currentLine)) {
						allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPref, indentTracker);
						retLines.push(allLines[i]);
					} else {
						allLines[i] = setSpacesBeforeCode(currentLine, properIndent, indentTracker);
						retLines.push(allLines[i]);
					}
				} else {
					allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPref, indentTracker);
					retLines.push(allLines[i]);
					normalNextIndent = true;
				}
			}
		}
		if(includeExcludingComment(currentLine, i, "class ") || (includeExcludingComment(currentLine, i, "final ") && !includeExcludingComment(currentLine, i, ";"))) {
			++indentPushNum;
			let tmp = normalIndentWithBrace(allLines[i + 1]);
			if(tmp !== undefined) {
				normalNextIndent = tmp;
			}
		} else if((includeExcludingComment(currentLine, i, "private ") || includeExcludingComment(currentLine, i, "public ") || includeExcludingComment(currentLine, i, "protected "))) {
			if(!includeExcludingComment(currentLine, i, ";") && !includeExcludingComment(currentLine, i, "=")) {
				++indentPushNum;
				let tmp = normalIndentWithBrace(allLines[i + 1]);
				if(tmp !== undefined) {
					normalNextIndent = tmp;
				}
			}
		} else if(includeExcludingComment(currentLine, i, "for(") || includeExcludingComment(currentLine, i, "while(") || includeExcludingComment(currentLine, i, "if(") || includeExcludingComment(currentLine, i, "else ")) {
			++indentPushNum;
			let tmp = normalIndentWithBrace(allLines[i + 1]);
			if(tmp !== undefined) {
				normalNextIndent = tmp;
			}
		} else if(includeExcludingComment(currentLine, i, "do") || includeExcludingComment(currentLine, i, "else{")) {
			++indentPushNum;
			let tmp = normalIndentWithBrace(allLines[i + 1]);
			if(tmp !== undefined) {
				normalNextIndent = tmp;
			}
		}
		if(includeExcludingComment(currentLine, i, "}") && !includeExcludingComment(currentLine, i, "{")) {
			--indentPushNum;
		}
	}
	let newWord:string = retLines.join('\n');
	return newWord;
}