import { ConsoleReporter } from '@vscode/test-electron';
import { systemDefaultPlatform } from '@vscode/test-electron/out/util';
import { close } from 'fs';
import { allowedNodeEnvironmentFlags } from 'process';
import { start } from 'repl';
import * as vscode from 'vscode';
var startBlockComments: number[] = [];
var endBlockComments: number[] = [];
export function activate(context: vscode.ExtensionContext) {
	console.log('Checkstlye converter is currently active!');
	let changePP: boolean = false;
	let indentPreference = 2;
	const editor = vscode.window.activeTextEditor;
	let preDoc = editor?.document.getText();
	if(preDoc !== undefined) {
		preprocessBlockComments(preDoc.split("\n"));
	}
	let disposable = vscode.commands.registerCommand('checkstyle-converter.convertCheckstyle', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.fileName.includes(".java")) {
			editor.edit(editBuilder => {
				const firstLine = editor.document.lineAt(0);
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				let newWord: string = performCheckstyle(range, word, changePP);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java file.");
		}
	});
	context.subscriptions.push(disposable);
	let disposableTwo = vscode.commands.registerCommand('checkstyle-converter.convertCheckstyleWithSelction', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.fileName.includes(".java")) {
			editor.edit(editBuilder => {
				const sel = editor.selection;
				const firstLine = editor.document.lineAt(sel.start.line);
				const lastLine = editor.document.lineAt(sel.end.line);
				console.log("Selection is: (" + firstLine.lineNumber + ", " + firstLine.range.start.character + ") to (" + lastLine.lineNumber + ", " + lastLine.range.end.character + ")");
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText(range);
				let newWord: string = performCheckstyle(range, word, changePP);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java file.");
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
		if(editor && editor.document.fileName.includes(".java")) {
			editor.edit(editBuilder => {
				const firstLine = editor.document.lineAt(0);
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				let newWord:string = performIndentation(range, word, indentPreference);
				editBuilder.replace(range, newWord);
			});
		} else {
			vscode.window.showInformationMessage("No active editor open or editor is not a .java file.");
		}
	});
	context.subscriptions.push(disposableFive);
	let disposableSix = vscode.commands.registerCommand('checkstyle-converter.fixIndentationSelection', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor && editor.document.fileName.includes(".java")) {
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
			vscode.window.showInformationMessage("No active editor open or editor is not a .java file.");
		}
	});
	context.subscriptions.push(disposableSix);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function preprocessBlockComments(word: string[]) {
	let toSearchOne: string = "/*";
	let toSearchTwo: string = "*/";
	for(let i = 0; i < word.length; ++i) {
		if(word[i].includes(toSearchOne)) {
			startBlockComments.push(i);
		}
	}
	for(let i = 0; i < word.length; ++i) {
		if(word[i].includes(toSearchTwo)) {
			endBlockComments.push(i);
		}
	}
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
function performCheckstyle(range: vscode.Range, word: string, flagPP: boolean) {
	word = word.replaceAll('\t', '  ');
	word = preprocessString(word);
	let allLines: string[] = word.split('\n');
	let singleLoopFlag: boolean = false;
	for(let i = 0; i < allLines.length; ++i) {
		let currentLine: string = allLines[i];
		if(includeExcludingComment(currentLine, i, "public") || includeExcludingComment(currentLine, i, "private")
			|| includeExcludingComment(currentLine, i, "protected") || includeExcludingComment(currentLine, i, "for(") || includeExcludingComment(currentLine, i, "else(")
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