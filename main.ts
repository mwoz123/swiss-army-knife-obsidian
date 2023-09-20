import { Plugin, MarkdownView, Editor } from "obsidian";

export default class SwissArmyKnifePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "replace-doubled-empty-lines-with-single",
			name: "Replace doubled empty lines with single",
			editorCallback: (editor: Editor, view: MarkdownView) => this.replaceDoubledEmptyLinesWithSingle(editor),
		});
		this.addCommand({
			id: "remove-empty-lines",
			name: "Remove empty lines",
			editorCallback: (editor: Editor, view: MarkdownView) => this.removeEmptyLines(editor),
		});
	}

	replaceDoubledEmptyLinesWithSingle(editor: Editor) {
		const doubledEmptyLinesWithOptionalWhiteSpacesRegex = /^\s*?\n\s*?\n/gm;
		return replaceRegexInFile(editor, doubledEmptyLinesWithOptionalWhiteSpacesRegex, '\n');
	}

	removeEmptyLines(editor: Editor) {
		const doubledEmptyLinesWithOptionalWhiteSpacesRegex = /\s*?\n\s*?\n$/gm;
		return replaceRegexInFile(editor, doubledEmptyLinesWithOptionalWhiteSpacesRegex, '\n');
	}

}

function replaceRegexInFile(editor: Editor, pattern: RegExp | string, replacement: string) {
	const currentText = editor.getValue();
	const updatedText = currentText.replace(pattern, replacement)
	editor.setValue(updatedText);
}


