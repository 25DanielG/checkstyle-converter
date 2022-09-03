import { ConsoleReporter } from '@vscode/test-electron';
import { allowedNodeEnvironmentFlags } from 'process';
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	console.log('Checkstlye converter is currently active!');
	let changePP: boolean = false;
	let indentPreference = 2;
	let disposable = vscode.commands.registerCommand('checkstyle-converter.convertCheckstyle', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.fileName.includes(".java")) {
			editor.edit(editBuilder => {
				const firstLine = editor.document.lineAt(0);
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				word = word.replaceAll('\t', '  ');
				let allLines: string[] = word.split('\n');
				for(let i = 0; i < allLines.length; ++i) {
					let currentLine: string = allLines[i];
					if(currentLine.includes("public") || currentLine.includes("private")
						|| currentLine.includes("protected") || currentLine.includes("for") || currentLine.includes("else")
						|| currentLine.includes("while") || currentLine.includes("do") || currentLine.includes("if")) {
						if(currentLine.includes('{')) {
							if(currentLine.includes('}') && !currentLine.includes("else")) continue;
							let spacesBefore = countSpacesBeforeCode(allLines[i]);
							let tmpStr: string = "";
							if(spacesBefore !== undefined) {
								for(let i = 0; i < spacesBefore; ++i) {
									tmpStr += " ";
								}
							}
							allLines[i] = allLines[i].replace('{', "\n" + tmpStr + "{");
						}
						if(currentLine.includes("else") && currentLine.includes('}')) {
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
					}
					if(changePP && currentLine.includes("++")) {
						const indexPP = currentLine.indexOf("++");
						//if(currentLine[indexPP + 2] == ' ' || currentLine[indexPP + 2] == ')') continue;
						const usedVariable = allLines[i][indexPP + 2];
						if(currentLine.includes("++" + usedVariable)) continue;
						allLines[i] = allLines[i].replace("++" + usedVariable, usedVariable + "++");
					}
				}
				let newWord = allLines.join('\n');
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
				word = word.replaceAll('\t', '  ');
				let allLines: string[] = word.split('\n');
				for(let i = 0; i < allLines.length; ++i) {
					let currentLine: string = allLines[i];
					if(currentLine.includes("public") || currentLine.includes("private")
						|| currentLine.includes("protected") || currentLine.includes("for") || currentLine.includes("else")
						|| currentLine.includes("while") || currentLine.includes("do") || currentLine.includes("if")) {
						if(currentLine.includes('{')) {
							if(currentLine.includes('}') && !currentLine.includes("else")) continue;
							let spacesBefore = countSpacesBeforeCode(allLines[i]);
							let tmpStr: string = "";
							if(spacesBefore !== undefined) {
								for(let i = 0; i < spacesBefore; ++i) {
									tmpStr += " ";
								}
							}
							allLines[i] = allLines[i].replace('{', "\n" + tmpStr + "{");
						}
						if(currentLine.includes("else") && currentLine.includes('}')) {
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
					}
					if(changePP && currentLine.includes("++")) {
						const indexPP = currentLine.indexOf("++");
						//if(currentLine[indexPP + 2] == ' ' || currentLine[indexPP + 2] == ')') continue;
						const usedVariable = allLines[i][indexPP + 2];
						if(currentLine.includes("++" + usedVariable)) continue;
						allLines[i] = allLines[i].replace("++" + usedVariable, usedVariable + "++");
					}
				}
				let newWord = allLines.join('\n');
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
				word = word.replaceAll("for (", "for(");
				word = word.replaceAll("while (", "while(");
				word = word.replaceAll("else if (", "else if(");
				word = word.replaceAll("if (", "if(");
				word = word.replaceAll("else (", "else(");
				let allLines: string[] = word.split('\n');
				let properIndent = 0;
				let indentPushNum = 0;
				let normalNextIndent: boolean = true;
				for(let i = 0; i < allLines.length; ++i) {
					let currentLine: string = allLines[i];
					let indentTracker = countSpacesBeforeCode(currentLine);
					properIndent = indentPushNum * indentPreference;
					if(i === 183 || i === 184 || i === 185) {
						console.log(properIndent + " for line number: " + (i + 1));
					}
					if(indentTracker !== undefined) {
						if(normalNextIndent) {
							if(onlyCloseBrace(currentLine)) {
								allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPreference, indentTracker);
							} else {
								allLines[i] = setSpacesBeforeCode(currentLine, properIndent, indentTracker);
							}
						} else {
							allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPreference, indentTracker);
							normalNextIndent = true;
						}
					}
					if(currentLine.includes("class ") || (currentLine.includes("final ") && !currentLine.includes(';'))) {
						++indentPushNum;
						let tmp = normalIndentWithBrace(allLines[i + 1]);
						if(tmp !== undefined) {
							normalNextIndent = tmp;
						}
					} else if((currentLine.includes("private ") || currentLine.includes("public ") || currentLine.includes("protected "))) {
						if(!currentLine.includes(';') && !currentLine.includes('=')) {
							++indentPushNum;
							let tmp = normalIndentWithBrace(allLines[i + 1]);
							if(tmp !== undefined) {
								normalNextIndent = tmp;
							}
						}
					} else if(currentLine.includes("for(") || currentLine.includes("while(") || currentLine.includes("if(") || currentLine.includes("else ")) {
						++indentPushNum;
						let tmp = normalIndentWithBrace(allLines[i + 1]);
						if(tmp !== undefined) {
							normalNextIndent = tmp;
						}
					} else if(currentLine.includes("do") || currentLine.includes("else{")) {
						++indentPushNum;
						let tmp = normalIndentWithBrace(allLines[i + 1]);
						if(tmp !== undefined) {
							normalNextIndent = tmp;
						}
					}
					if(currentLine.includes('}') && !currentLine.includes('{')) {
						--indentPushNum;
					}
				}
				let newWord = allLines.join('\n');
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
				let word = editor.document.getText(range);
				word = word.replaceAll("for (", "for(");
				word = word.replaceAll("while (", "while(");
				word = word.replaceAll("else if (", "else if(");
				word = word.replaceAll("if (", "if(");
				word = word.replaceAll("else (", "else(");
				let allLines: string[] = word.split('\n');
				let properIndent = 0;
				let indentPushNum = 0;
				let normalNextIndent: boolean = true;
				for(let i = 0; i < allLines.length; ++i) {
					let currentLine: string = allLines[i];
					let indentTracker = countSpacesBeforeCode(currentLine);
					properIndent = indentPushNum * indentPreference;
					if(indentTracker !== undefined) {
						if(normalNextIndent) {
							if(onlyCloseBrace(currentLine)) {
								allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPreference, indentTracker);
							} else {
								allLines[i] = setSpacesBeforeCode(currentLine, properIndent, indentTracker);
							}
						} else {
							allLines[i] = setSpacesBeforeCode(currentLine, (indentPushNum - 1) * indentPreference, indentTracker);
							normalNextIndent = true;
						}
					}
					if(currentLine.includes("class ") || (currentLine.includes("final ") && !currentLine.includes(';'))) {
						++indentPushNum;
						let tmp = normalIndentWithBrace(allLines[i + 1]);
						if(tmp !== undefined) {
							normalNextIndent = tmp;
						}
					} else if((currentLine.includes("private ") || currentLine.includes("public ") || currentLine.includes("protected "))) {
						if(!currentLine.includes(';') && !currentLine.includes('=')) {
							++indentPushNum;
							let tmp = normalIndentWithBrace(allLines[i + 1]);
							if(tmp !== undefined) {
								normalNextIndent = tmp;
							}
						}
					} else if(currentLine.includes("for(") || currentLine.includes("while(") || currentLine.includes("do") || currentLine.includes("if(") || currentLine.includes("else{") || currentLine.includes("else ")) {
						++indentPushNum;
						let tmp = normalIndentWithBrace(allLines[i + 1]);
						if(tmp !== undefined) {
							normalNextIndent = tmp;
						}
					}
					if(currentLine.includes('}') && !currentLine.includes('{')) {
						--indentPushNum;
					}
				}
				let newWord = allLines.join('\n');
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