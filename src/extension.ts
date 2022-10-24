import { getDefaultSettings } from 'http2';
import { start } from 'repl';
import { getSystemErrorMap } from 'util';
import * as vscode from 'vscode';
var startBlockComments: number[] = [];
var endBlockComments: number[] = [];
//var startParens: number[] = [];
//var endParents: number[] = [];
var startStrings: number[] = [];
const editor = vscode.window.activeTextEditor;
let preDoc = editor?.document.getText();
let classIndentation: number = 0;
export var indentPreference = 2;
export var changePP: boolean = false;
export async function activate(context: vscode.ExtensionContext) {
	console.log('Checkstlye converter is currently active!');
	//indentPreference = context.globalState.get("indentPreference", 2);
	//context.globalState.setKeysForSync(["indentPreference"]);
    let section = vscode.workspace.getConfiguration("editor");
	let customConfig = vscode.workspace.getConfiguration("checkstyle-converter");
    let tabSize = section.get("tabSize", null);
	let tabPref = customConfig.get("indentPreference", null);
    if(tabPref === null) {
		if(tabSize !== null) {
			indentPreference = tabSize;
			console.log("Found workspace default. Set indent preference to: " + tabSize);
		} else {
			console.log("Unable to retrieve workspace tabSize");
		}
    } else {
        indentPreference = tabPref;
        console.log("Found custom setting. Set indent preference to: " + tabPref);
    }
    let insertSpaces = section.get("insertSpaces", true);
	let togIncrement = customConfig.get("changeIncrements", null);
	if(togIncrement === null) {
		console.log("Unable to retrieve workspace togIncrement");
	} else {
		changePP = togIncrement;
		console.log("Found custom setting. Set toggle increment to: " + togIncrement);
	}
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
	let disposableThree = vscode.commands.registerCommand('checkstyle-converter.togglePlusPlus', async () => {
		changePP = !changePP;
		try {
			//vscode.workspace.getConfiguration("editor.tabSize");
			await customConfig.update("changeIncrements", changePP);
			console.log("Custom global update (increments) succeeded");
		} catch (errorMsg) {
			console.log(`Custom global update (increments) failed: ${errorMsg}`);
		}
		vscode.window.showInformationMessage("Automatically change ++i to i++ toggled: " + changePP);
	});
	context.subscriptions.push(disposableThree);
	let disposableFour = vscode.commands.registerCommand('checkstyle-converter.changeIndentPreference', async () => {
		const choices = ["1", "2", "3", "4", "5", "6", "7", "8"];
		let tmp;
		return new Promise((resolve) => {
			const quickPick = vscode.window.createQuickPick();
			quickPick.items = choices.map(choice => ({ label: choice }));
			quickPick.title = 'Select your indentation preference:';
			quickPick.onDidChangeValue(() => {
				if (!choices.includes(quickPick.value)) quickPick.items = [quickPick.value, ...choices].map(label => ({ label }));
			});
			quickPick.onDidAccept(async () => {
				const selection = quickPick.activeItems[0];
				tmp = selection.label;
				resolve(selection.label);
				if(tmp !== undefined) {
					indentPreference = +tmp;
				} else {
					vscode.window.showInformationMessage("Pick a search query to change the indentation preference.");
					return;
				}
				//let allAsJSON = JSON.parse(JSON.stringify(all));
				//const editorSettings = allAsJSON.editor;
				try {
					await customConfig.update("indentPreference", indentPreference);
					console.log("Custom global update (tabPreference) succeeded");
				} catch (errorMsg) {
					console.log(`Custom global update (tabPreference) failed: ${errorMsg}`);
				}
				try {
					await section.update("tabSize", indentPreference);
					console.log("Vscode workspace global update (tabPreference) succeeded");
				} catch (errorMsg) {
					console.log(`Vscode workspace global update (tabPreference) failed: ${errorMsg}`);
				}
				vscode.window.showInformationMessage("Changed your indent preference to: " + indentPreference);
				quickPick.hide();
			});
			quickPick.show();
		});
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
export async function deactivate() { }

function preprocessBlockComments(allLines: string[]) {
	let toSearchOne: string = "/*";
	let toSearchTwo: string = "*/";
	var tmpStartComments: number[] = [];
	var tmpEndComments: number[] = [];
	for(let i = 0; i < allLines.length; ++i) {
		if(allLines[i].includes(toSearchOne)) {
			tmpStartComments.push(i);
		}
		if(allLines[i].includes(toSearchTwo)) {
			tmpEndComments.push(i);
		}
	}
	startBlockComments = tmpStartComments;
	endBlockComments = tmpEndComments;
}
function preprocessQuotedStrings(allLines: string[]) {
	let toSearchOne: string = '"';
	var tmpStartStrings: number[] = [];
	for(let i = 0; i < allLines.length; ++i) {
		if(allLines[i].includes(toSearchOne)) {
			tmpStartStrings.push(i);
		}
	}
	startStrings = tmpStartStrings;
}
function preprocess() {
	if(preDoc === undefined) return;
	let allLines = preDoc.split('\n');
	for(let i = 0; i < allLines.length; ++i) {
		if(allLines[i].trim().length === 0) {
			allLines.splice(i, 1);
			--i;
		}
		preprocessBlockComments(allLines);
		preprocessQuotedStrings(allLines);
	}
	let newWord:string = allLines.join('\n');
	newWord = newWord.replace("@ author", "@author");
	newWord = newWord.replace("@Author", "@author");
	newWord = newWord.replace("@ version", "@version");
	newWord = newWord.replace("@Version", "@version");
	newWord = newWord.replace("@ description", "@description");
	newWord = newWord.replace("@Description", "@description");
	newWord = preprocessString(newWord);
	return newWord;
}
function fixJavaAnnotations(allLines: string[]) {
	for(let i = 0; i < allLines.length; ++i) {
		if(includeExcludingCommentString(allLines[i], i, "@")) {
			allLines[i - 1] += (allLines[i]);
			allLines.splice(i, 1);
			preprocessBlockComments(allLines);
			preprocessQuotedStrings(allLines);
		}
	}
	return allLines;
}
function undoJavaAnnotations(allLines: string[]) {
	for(let i = 0; i < allLines.length; ++i) {
		if(includeExcludingCommentString(allLines[i], i, "@") && allLines[i].indexOf("@") > allLines[i].indexOf("*/")) {
			allLines[i].replace("*/", "*/\n");
		}
	}
	return allLines;
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
	let regexOne = /for \(/g, regexTwo = /while \(/g, regexThree = /else if \(/g;
	let regexFour = /if \(/g, regexFive = /else \(/g, regexSix = /try {/
	let regexSeven = /catch \(/;
	fullDoc = fullDoc.replaceAll("for (", "for(");
	fullDoc = fullDoc.replaceAll("while (", "while(");
	fullDoc = fullDoc.replaceAll("else if (", "else if(");
	fullDoc = fullDoc.replaceAll("if (", "if(");
	fullDoc = fullDoc.replaceAll("else (", "else(");
	fullDoc = fullDoc.replaceAll("catch (", "catch(");
	fullDoc = fullDoc.replaceAll("try {", "try{");
	var continuePreprocess: boolean = fullDoc.search(regexOne) >= 0 || fullDoc.search(regexTwo) >= 0 ||
		fullDoc.search(regexThree) >= 0 || fullDoc.search(regexFour) >= 0 ||
		fullDoc.search(regexFive) >= 0 || fullDoc.search(regexSix) >= 0 ||
		fullDoc.search(regexSeven) >= 0;
	if(continuePreprocess) fullDoc = preprocessString(fullDoc);
	return fullDoc;
}
function includeExcludingCommentString(str: string, cnt: number, toFind: string) {
	if(str.includes(toFind)) {
		let indexOf = str.indexOf(toFind);
		if(str.includes("//")) {
			let indexOfSlash: number = str.indexOf("//");
			if(indexOf > indexOfSlash) return false;
		}
		for(let i = 0; i < startBlockComments.length; ++i) {
			if(cnt > startBlockComments[i] && cnt < endBlockComments[i]) {
				return false;
			} else if(cnt === startBlockComments[i] && cnt === endBlockComments[i]) {
				if(indexOf > str.indexOf("/*") && indexOf < str.indexOf("*/")) return false;
			} else if(cnt === startBlockComments[i]) {
				if(indexOf > str.indexOf("/*")) return false;
			} else if(cnt === endBlockComments[i]) {
				if(indexOf < str.indexOf("/*")) return false;
			}
		}
		if(startStrings.includes(cnt)) {
			for(let i = 0; i < startStrings.length; ++i) {
				const indexes = [];
				for (let j = 0; j < str.length; ++j) {
					if (str[j] === '"') {
						indexes.push(j);
					}
				}
				for(let j = 0; j < indexes.length; j += 2) {
					if(indexOf > indexes[i] && indexOf < indexes[i + 1]) {
						return false;
					}
				}
			}
		}
		return true;
	}
}
function findWhereToClose(allLines: string[], currLine: number) {
	let returnNum: number = -1;
	for(let tmpCnt:number = currLine + 1; tmpCnt < allLines.length; ++tmpCnt) {
		if(includeExcludingCommentString(allLines[tmpCnt], tmpCnt, "for(") || includeExcludingCommentString(allLines[tmpCnt], tmpCnt, "else(") || includeExcludingCommentString(allLines[tmpCnt], tmpCnt, "while(") || includeExcludingCommentString(allLines[tmpCnt], tmpCnt, "if(")) {
			if(!includeExcludingCommentString(allLines[tmpCnt], tmpCnt, "{") && !onlyOpenBrace(allLines[tmpCnt + 1])) {
				returnNum = findWhereToClose(allLines, tmpCnt);
			} else {
				while(true) {
					if(includeExcludingCommentString(allLines[tmpCnt], tmpCnt, '}')) {
						if(includeExcludingCommentString(allLines[tmpCnt], tmpCnt, '{') && allLines[tmpCnt].indexOf('{') < allLines[tmpCnt].indexOf('}')) {
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
	for(let i = 0; i < allLines.length; ++i) {
		let indentArr: number[] = outlineProperIndent(allLines, indentPref);
		if(includeExcludingCommentString(allLines[i], i, "class")) {
			classIndentation = indentArr[i];
			let tmpStr = "";
			for(let j = 0; j < classIndentation * indentPref; ++j) {
				tmpStr += " ";
			}
			if(i !== 0 && includeExcludingCommentString(allLines[i - 1], i - 1, "*/")) {
				let tmpIndex = endBlockComments.indexOf(i - 1);
				let hasAuthor: boolean = false, hasVersion: boolean = false;
				for(let j = startBlockComments[tmpIndex]; j <= endBlockComments[tmpIndex] + 1; ++j) {
					if(allLines[j].includes("@author")) hasAuthor = true;
					if(allLines[j].includes("@version")) hasVersion = true;
				}
				if(!hasAuthor) {
					if(allLines[startBlockComments[tmpIndex]].includes("/**")) {
						allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/**", "/**\n" + tmpStr + " * @author");	
					} else {
						allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/*", "/**\n" + tmpStr + " * @author");
					}
				}
				if(!hasVersion) {
					if(allLines[startBlockComments[tmpIndex]].includes("/**")) {
						allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/**", "/**\n" + tmpStr + " * @version");	
					} else {
						allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/*", "/**\n" + tmpStr + " * @version");
					}
				}
			} else {
				allLines[i] = tmpStr + "/**\n" + tmpStr + " * @description \n" + tmpStr + " * @author \n" + tmpStr + " * @version\n" + tmpStr + " */\n" + allLines[i];
			}
		} else if((includeExcludingCommentString(allLines[i], i, "public") || includeExcludingCommentString(allLines[i], i, "private") || includeExcludingCommentString(allLines[i], i, "protected")) 
		&& !includeExcludingCommentString(allLines[i], i, "final") && !includeExcludingCommentString(allLines[i], i, ";") && (includeExcludingCommentString(allLines[i], i, "(") || includeExcludingCommentString(allLines[i + 1], i + 1, "("))) {
			if((includeExcludingCommentString(allLines[i], i, "public") && includeExcludingCommentString(allLines[i], i, "static") && includeExcludingCommentString(allLines[i], i, "void") && includeExcludingCommentString(allLines[i], i, "main")
			&& includeExcludingCommentString(allLines[i], i, "String") && includeExcludingCommentString(allLines[i], i, "args"))) {
				continue;
			}
			let tmpIndent = countSpacesBeforeCode(allLines[i]);
			if(tmpIndent !== undefined) {
				if(tmpIndent = classIndentation + indentPref) {
					let tmpStr = "";
					let hasParam: boolean = false, hasReturn: boolean = false, hasPre: boolean = false, hasPost: boolean = false;
					for(let j = 0; j < indentArr[i] * indentPref; ++j) {
						tmpStr += " ";
					}
					if(includeExcludingCommentString(allLines[i - 1], i - 1, "*/")) {
						let tmpIndex = endBlockComments.indexOf(i - 1);
						for(let j = startBlockComments[tmpIndex]; j <= endBlockComments[tmpIndex] + 1; ++j) {
							if(allLines[j].includes("@param")) hasParam = true;
							if(allLines[j].includes("@return")) hasReturn = true;
							if(allLines[j].includes("@precondition")) hasPre = true;
							if(allLines[j].includes("@postcondition")) hasPost = true;
						}
						if(!hasParam) {
							if(allLines[startBlockComments[tmpIndex]].includes("/**")) {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/**", "/**\n" + tmpStr + " * @param");	
							} else {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/*", "/**\n" + tmpStr + " * @param");
							}
						}
						if(!hasReturn) {
							if(allLines[startBlockComments[tmpIndex]].includes("/**")) {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/**", "/**\n" + tmpStr + " * @return");	
							} else {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/*", "/**\n" + tmpStr + " * @return");
							}
						}
						if(!hasPre) {
							if(allLines[startBlockComments[tmpIndex]].includes("/**")) {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/**", "/**\n" + tmpStr + " * @precondition");	
							} else {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/*", "/**\n" + tmpStr + " * @precondition");
							}
						}
						if(!hasPost) {
							if(allLines[startBlockComments[tmpIndex]].includes("/**")) {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/**", "/**\n" + tmpStr + " * @postcondition");	
							} else {
								allLines[startBlockComments[tmpIndex]] = allLines[startBlockComments[tmpIndex]].replace("/*", "/**\n" + tmpStr + " * @postcondition");
							}
						}
					} else {
						allLines[i] = tmpStr + "/**\n" + tmpStr + " * @param \n" + tmpStr + " * @precondition \n" + tmpStr + " * @postcondition\n" + tmpStr + " * @return \n" + tmpStr + " */\n" + allLines[i];
					}
				}
			}
		}
	}
	return allLines;
}
export function performCheckstyle(range: vscode.Range, word: string, flagPP: boolean, indentPref: number) {
	let spaceString: string = makeSpaceString(indentPref);
	word = word.replaceAll('\t', spaceString);
	let allLines: string[] = word.split('\n');
	for(let i = 0; i < allLines.length; ++i) {
		let currentLine: string = allLines[i];
		if(includeExcludingCommentString(currentLine, i, "public") || includeExcludingCommentString(currentLine, i, "private")
			|| includeExcludingCommentString(currentLine, i, "protected") || includeExcludingCommentString(currentLine, i, "for(") || includeExcludingCommentString(currentLine, i, "else")
			|| includeExcludingCommentString(currentLine, i, "while(") || includeExcludingCommentString(currentLine, i, "do") || includeExcludingCommentString(currentLine, i, "if(")) {
			if(includeExcludingCommentString(currentLine, i, "{")) {
				if(includeExcludingCommentString(currentLine, i, "}") && !includeExcludingCommentString(currentLine, i, "else")) continue;
				let spacesBefore = countSpacesBeforeCode(allLines[i]);
				let tmpStr: string = "";
				if(spacesBefore !== undefined) {
					for(let i = 0; i < spacesBefore; ++i) {
						tmpStr += " ";
					}
				}
				allLines[i] = allLines[i].replace('{', "\n" + tmpStr + "{");
			}
			if(includeExcludingCommentString(currentLine, i, "else") && includeExcludingCommentString(currentLine, i, "}")) {
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
			if(includeExcludingCommentString(currentLine, i, "for(") || includeExcludingCommentString(currentLine, i, "else(") || includeExcludingCommentString(currentLine, i, "while(") || includeExcludingCommentString(currentLine, i, "if(")) {
				if(!includeExcludingCommentString(currentLine, i, "{") && !onlyOpenBrace(allLines[i + 1])) {
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
		if(flagPP && includeExcludingCommentString(currentLine, i, "++")) {
			const indexPP = currentLine.indexOf("++");
			const usedVariable = allLines[i][indexPP + 2];
			if(includeExcludingCommentString(currentLine, i, "++" + usedVariable)) continue;
			allLines[i] = allLines[i].replace("++" + usedVariable, usedVariable + "++");
		}
	}
	allLines = allLines.join('\n').split('\n');
	preprocessBlockComments(allLines);
	preprocessQuotedStrings(allLines);
	allLines = fixJavaAnnotations(allLines);
	allLines = addJavaDoc(allLines, indentPref);
	allLines = undoJavaAnnotations(allLines);
	preprocessBlockComments(allLines);
	preprocessQuotedStrings(allLines);
	let newWord = allLines.join('\n');
	return newWord;
}
function outlineProperIndent(allLines: string[], indentPref: number) {
	let indentPushNum: number = 0;
	let indentTrackerArr = new Array<number>();
	preprocessBlockComments(allLines);
	preprocessQuotedStrings(allLines);
	for(let i = 0; i < allLines.length; ++i) {
		let currentLine: string = allLines[i];
		//console.log((i + 1) + ": " + indentPushNum);
		indentTrackerArr.push(indentPushNum);
		if(includeExcludingCommentString(currentLine, i, "class ") || (includeExcludingCommentString(currentLine, i, "final ") && !includeExcludingCommentString(currentLine, i, ";"))) {
			++indentPushNum;
		} else if((includeExcludingCommentString(currentLine, i, "private ") || includeExcludingCommentString(currentLine, i, "public ") || includeExcludingCommentString(currentLine, i, "protected "))) {
			if(!includeExcludingCommentString(currentLine, i, ";") && !includeExcludingCommentString(currentLine, i, "=")) {
				++indentPushNum;
			}
		} else if((includeExcludingCommentString(currentLine, i, "for(") || includeExcludingCommentString(currentLine, i, "catch(") || includeExcludingCommentString(currentLine, i, "while(") || includeExcludingCommentString(currentLine, i, "if(") || includeExcludingCommentString(currentLine, i, "else")) && (includeExcludingCommentString(currentLine, i, "{") || includeExcludingCommentString(allLines[i + 1], i + 1, "{"))) {
			++indentPushNum;
		} else if(includeExcludingCommentString(currentLine, i, "do ") || includeExcludingCommentString(currentLine, i, "try") || includeExcludingCommentString(currentLine, i, "try{") || includeExcludingCommentString(currentLine, i, "do{") || includeExcludingCommentString(currentLine, i, "else{")) {
			++indentPushNum;
		}
		if(includeExcludingCommentString(currentLine, i, "}") && !includeExcludingCommentString(currentLine, i, "{")) {
			--indentPushNum;
		}
	}
	return indentTrackerArr;
}
export function performIndentation(range: vscode.Range, word: string, indentPref: number) {
	let allLines: string[] = word.split('\n');
	preprocessBlockComments(allLines);
	preprocessQuotedStrings(allLines);
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
						//retLines.push(allLines[i]);
					} else {
						allLines[i] = setSpacesBeforeCode(currentLine, properIndent, indentTracker);
						//retLines.push(allLines[i]);
					}
				} else {
					allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPref, indentTracker);
					//retLines.push(allLines[i]);
					normalNextIndent = true;
				}
				for(let j = 0; j < startBlockComments.length; ++j) {
					if(i > startBlockComments[j] && i <= endBlockComments[j]) {
						if(!includeExcludingCommentString(allLines[i], i, "/*")) {
							allLines[i] = " " + allLines[i];
						}
					}
				}
			}
		}
		if(includeExcludingCommentString(currentLine, i, "class ") || (includeExcludingCommentString(currentLine, i, "final ") && !includeExcludingCommentString(currentLine, i, ";"))) {
			++indentPushNum;
			let tmp = normalIndentWithBrace(allLines[i + 1]);
			if(tmp !== undefined) {
				normalNextIndent = tmp;
			}
		} else if((includeExcludingCommentString(currentLine, i, "private ") || includeExcludingCommentString(currentLine, i, "public ") || includeExcludingCommentString(currentLine, i, "protected "))) {
			if(!includeExcludingCommentString(currentLine, i, ";") && !includeExcludingCommentString(currentLine, i, "=")) {
				++indentPushNum;
				let tmp = normalIndentWithBrace(allLines[i + 1]);
				if(tmp !== undefined) {
					normalNextIndent = tmp;
				}
			}
		} else if((includeExcludingCommentString(currentLine, i, "for(") || includeExcludingCommentString(currentLine, i, "catch(") || includeExcludingCommentString(currentLine, i, "while(") || includeExcludingCommentString(currentLine, i, "if(") || includeExcludingCommentString(currentLine, i, "else")) && (includeExcludingCommentString(currentLine, i, "{") || includeExcludingCommentString(allLines[i + 1], i + 1, "{"))) {
			++indentPushNum;
			let tmp = normalIndentWithBrace(allLines[i + 1]);
			if(tmp !== undefined) {
				normalNextIndent = tmp;
			}
		} else if(includeExcludingCommentString(currentLine, i, "do ") || includeExcludingCommentString(currentLine, i, "try") || includeExcludingCommentString(currentLine, i, "try{") || includeExcludingCommentString(currentLine, i, "do{") || includeExcludingCommentString(currentLine, i, "else{")) {
			++indentPushNum;
			let tmp = normalIndentWithBrace(allLines[i + 1]);
			if(tmp !== undefined) {
				normalNextIndent = tmp;
			}
		}
		if(includeExcludingCommentString(currentLine, i, "}") && !includeExcludingCommentString(currentLine, i, "{")) {
			--indentPushNum;
		}
	}
	let newWord:string = allLines.join('\n');
	return newWord;
}
function makeSpaceString(indentPreference: number) {
	let spaceString: string = "";
	for(let i = 0; i < indentPreference; ++i) {
		spaceString += " ";
	}
	return spaceString;
}