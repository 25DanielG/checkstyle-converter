# Checkstyle Converter
## A checkstyle extension that automatically replaces Java code with a checkstyled version
### Features
- Indents braces to the next line
- Fixes the } else { by indenting the else and "{" to the next line
- Replaces ++i with i++ if toggling the extension to do so
- Fixes all indentation given an indentation preference
- Fixes indentation or checkstyle for selections of code
- Temporarily deletes empty lines
- Adds braces to single statements
- Adds all necessary javadoc comments before a method or class
- Stores past preferences in default settings.json for ease of use
- If no setting for indent preference is found takes the value from Vscode's editor.tabSize setting
- Otherwise retrieves the value from the indentPreference configuration
### Commands
#### Checkstyle Converter: Convert Checkstyle
- ID: checkstyle-converter.convertCheckstyle
- Description: Converts code to a checkstyled version
#### Checkstyle Converter: Convert Checkstyle Selection
- ID: checkstyle-converter.convertCheckstyleWithSelction
- Description: Converts a selection highlighted of code to its checkstyled version
#### Checkstyle Converter: Fix Indentation
- ID: checkstyle-converter.fixIndentation
- Description: Fixes the indentation in given code
#### Checkstyle Converter: Fix Indentation Selection
- ID: checkstyle-converter.fixIndentationSelection
- Description: Fixes the indentation in a selection of highlighted code
#### Checkstyle Converter: Change Indent Preference
- ID: checkstyle-converter.changeIndentPreference
- Description: Gives a prompt to change the current indentation preference
#### Checkstyle Converter: Toggle Increment Style
- ID: checkstyle-converter.togglePlusPlus
- Description: Toggles a setting between true and false dictating whether to change all ++i's to i++'s.
### Configurations
#### Indent Preference
- ID: checkstyle-converter.changeIncrements
- Description A setting to store the user's indent preference
- Type: integer
- Default: 2
#### Increment Toggle
- ID: checkstyle-converter.changeIncrements
- Description A setting to store toggle of the increment preference ++i to i++
- Type: boolean
- Default: false