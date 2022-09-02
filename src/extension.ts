import { allowedNodeEnvironmentFlags } from 'process';
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	console.log('Checkstlye converter is currently active!');
	let changePP: boolean = false;
	let disposable = vscode.commands.registerCommand('checkstyle-converter.convertCheckstyle', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.fileName.includes(".java")) {
			editor.edit(editBuilder => {
				const firstLine = editor.document.lineAt(0);
				const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				let word = editor.document.getText();
				var toReplace = /\t/gi;
				word = word.replace(toReplace, ' ');
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
						if(changePP && currentLine.includes("++")) {
							const indexPP = currentLine.indexOf("++");
							//if(currentLine[indexPP + 2] == ' ' || currentLine[indexPP + 2] == ')') continue;
							const usedVariable = allLines[i][indexPP + 2];
							if(currentLine.includes("++" + usedVariable)) continue;
							allLines[i] = allLines[i].replace("++" + usedVariable, usedVariable + "++");
						}
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
				const range = new vscode.Range(firstLine.lineNumber, firstLine.range.start.character, lastLine.lineNumber, lastLine.range.end.character);
				console.log("Selection start: " + range.start);
				console.log("Selection end: " + range.end);
				let word = editor.document.getText();
				var toReplace = /{/gi;
				let newWord = word.replace(toReplace, '\n{');
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
