import { Plugin, MarkdownView, Editor } from "obsidian";

export default class SwissArmyKnifePlugin extends Plugin {
	async onload() {

		this.addCommand({
			id: "replace-doubled-empty-lines-with-single",
			name: "Replace doubled empty lines with single",
			editorCallback: (editor: Editor, view: MarkdownView) => this.replaceDoubledEmptyLinesWithSinge(editor),
		});
	}

	replaceDoubledEmptyLinesWithSinge(editor: Editor) {
		const currentText = editor.getValue();
		const doubledEmptyLinesRegex = /^\n\n/gm;
		const updatedText = currentText.replace(doubledEmptyLinesRegex, '\n')
		editor.setValue(updatedText);
	}
}