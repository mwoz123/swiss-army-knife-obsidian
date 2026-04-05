import { Plugin, MarkdownView, Platform, Editor, App, Modal, Setting } from "obsidian";


const mobileOnlyCorsProxy = 'https://api.codetabs.com/v1/proxy?quest='
export default class SwissArmyKnifePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "replace-multi-empty-lines-with-single",
			name: "Replace multi empty lines with single",
			editorCallback: (editor: Editor, view: MarkdownView) => this.replaceDoubledEmptyLinesWithSingle(editor),
		});
		this.addCommand({
			id: "remove-empty-lines",
			name: "Remove empty lines",
			editorCallback: (editor: Editor, view: MarkdownView) => this.removeEmptyLines(editor),
		});
		this.addCommand({
			id: "create-expandable-section",
			name: "Create expandable/collapsable section",
			editorCallback: (editor: Editor, view: MarkdownView) => createExpandableSection(editor),
		});
		this.addCommand({
			id: "fetch-plugin-version",
			name: "Fetch plugin version",
			callback: () => new FetchPluginModal(this.app, (url) => fetchPluginRelease(url, this.app)).open()
		});


		this.addCommand({
			id: 'page-down-with-cursor',
			name: 'Page Down',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.moveCursorByPage(editor, view, 'down');
			}
		});

		this.addCommand({
			id: 'page-up-with-cursor',
			name: 'Page Up',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.moveCursorByPage(editor, view, 'up');
			}
		});

	}

	private replaceDoubledEmptyLinesWithSingle(editor: Editor) {
		const doubledEmptyLinesWithOptionalWhiteSpacesRegex = /^(\s*?\n){2,}/gm;
		return replaceRegexInFile(editor, doubledEmptyLinesWithOptionalWhiteSpacesRegex, '\n');
	}

	private removeEmptyLines(editor: Editor) {
		const emptyLinesWithOptionalWhitespacesRegex = /(\s*?\n){2,}/gm;
		return replaceRegexInFile(editor, emptyLinesWithOptionalWhitespacesRegex, '\n');
	}


	private moveCursorByPage(editor: Editor, view: MarkdownView, direction: 'up' | 'down') {
		const LINE_HEIGHT = 28;

		const viewHeight = view.contentEl.clientHeight;

		const linesToJump = Math.floor(viewHeight / LINE_HEIGHT) - 2;

		const currentCursor = editor.getCursor();

		let targetLine = direction === 'down'
			? currentCursor.line + linesToJump -1
			: currentCursor.line - linesToJump +1;

		const maxLine = editor.lineCount() - 1;
		if (targetLine < 0) {
			targetLine = 0;
		} else if (targetLine > maxLine) {
			targetLine = maxLine;
		}

		const newPos = { line: targetLine, ch: currentCursor.ch };

		editor.setCursor(newPos);

		editor.scrollIntoView({ from: newPos, to: newPos });
	}

}


function replaceRegexInFile(editor: Editor, pattern: RegExp | string, replacement: string) {
	const currentText: string = editor.getValue();
	const selectedText = editor.getSelection();
	if (selectedText) {
		const updatedText = selectedText.replace(pattern, replacement)
		editor.replaceSelection(updatedText, selectedText);
	} else {
		const updatedText = currentText.replace(pattern, replacement)
		editor.setValue(updatedText);
	}
}

function createExpandableSection(editor: Editor) {
	const currentText: string = editor.getValue();
	const selectedText: string = editor.getSelection();
	if (selectedText) {
		const firstSentenceIdentificator = /[\.!?]|$/;
		const endOfFirstSentenceIfExist = selectedText.search(firstSentenceIdentificator);
		const firstSentenceIndex = endOfFirstSentenceIfExist === -1 ? selectedText.length : endOfFirstSentenceIfExist + 1;

		const summary = selectedText.slice(0, firstSentenceIndex);
		const description = selectedText.slice(firstSentenceIndex, selectedText.length);
		const updatedText = `
<details><summary>
	${summary}
 </summary>
	${description}
</details>`
		editor.replaceSelection(updatedText, selectedText);
	} else {
		const updatedText = currentText + `
<details><summary>
	
 </summary>
	
</details>`
		editor.setValue(updatedText);
	}
}


async function fetchPluginRelease(ghRepoUrl: string, app: App) {
	try {
		const { origin, pathname } = new URL(ghRepoUrl);
		const [, username, pluginName, , , release] = pathname.split('/')
		const fetchAddr = [origin, username, pluginName, 'releases', 'download', release].join("/")

		const toBeFetched = ['main.js', 'manifest.json', 'styles.css']
		const fetchedElements = await Promise.all(toBeFetched.map(async e => ([e, await (await fetchDataIgnoreCorsIfNeeded(fetchAddr + '/' + e)).text()])));
		const existingElements = fetchedElements.filter(([, content]) => !content.includes("Not Found"))

		const containsRequiredData = existingElements.length >= 2;
		if (!containsRequiredData) {
			throw new Error("Error fetching main.js and/or manifest.json")
		}

		const pluginsPath = '.obsidian/plugins/'
		const fullPluginPath = pluginsPath + pluginName
		app.vault.createFolder(fullPluginPath);

		existingElements.map(([filename, content]) => {
			app.vault.create(fullPluginPath + "/" + filename, content)
		})
		new InfoModal(this.app, "Successfully installed " + pluginName + " release: " + release + ". Please restart Obsidian to make changes visible.").open()
	} catch (err) {
		new InfoModal(this.app, err.message).open();
	}
}

async function fetchDataIgnoreCorsIfNeeded(url: string) {
	const { isMobile } = Platform;
	return await fetch(isMobile ? mobileOnlyCorsProxy + url : url);
}


export class FetchPluginModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "Fetch plugin release" });
		new Setting(contentEl)
			.setName("GH Release url")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Process")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class InfoModal extends Modal {
	message: string;
	constructor(app: App, msg: string) {
		super(app);
		this.message = msg;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.message);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
